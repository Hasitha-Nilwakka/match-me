package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// WebSocket upgrader
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in development
	},
}

// Client represents a WebSocket client
type Client struct {
	Hub      *Hub
	Conn     *websocket.Conn
	Send     chan []byte
	UserID   uint
	ChatID   uint
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

// Message represents a chat message
type Message struct {
	ID        uint      `json:"id"`
	ChatID    uint      `json:"chatId"`
	SenderID  uint      `json:"senderId"`
	Content   string    `json:"content"`
	IsRead    bool      `json:"isRead"`
	CreatedAt time.Time `json:"createdAt"`
	SenderName string   `json:"senderName,omitempty"`
}

// ChatMessage represents a message in the API response
type ChatMessage struct {
	ID        uint      `json:"id"`
	ChatID    uint      `json:"chatId"`
	SenderID  uint      `json:"senderId"`
	Content   string    `json:"content"`
	IsRead    bool      `json:"isRead"`
	CreatedAt time.Time `json:"createdAt"`
	SenderName string   `json:"senderName,omitempty"`
}

// ChatResponse represents a chat in the API response
type ChatResponse struct {
	ID           uint        `json:"id"`
	ConnectionID uint        `json:"connectionId"`
	CreatedAt    time.Time   `json:"createdAt"`
	UpdatedAt    time.Time   `json:"updatedAt"`
	Messages     []ChatMessage `json:"messages,omitempty"`
	UnreadCount  int         `json:"unreadCount"`
	LastMessage  *ChatMessage `json:"lastMessage,omitempty"`
	OtherUser    *UserInfo   `json:"otherUser,omitempty"`
}

// UserInfo represents basic user information in chat context
type UserInfo struct {
	ID               uint   `json:"id"`
	Name             string `json:"name"`
	ProfilePicture   string `json:"profilePicture"`
	IsOnline         bool   `json:"isOnline"`
	LastSeen         *time.Time `json:"lastSeen,omitempty"`
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Printf("Client registered for user %d in chat %d", client.UserID, client.ChatID)

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
				log.Printf("Client unregistered for user %d in chat %d", client.UserID, client.ChatID)
			}

		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	
	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			
			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			
			// Add queued chat messages to the current websocket message
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.Send)
			}
			
			if err := w.Close(); err != nil {
				return
			}
			
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// serveWS handles websocket requests from clients
func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request, userID uint, chatID uint) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}
	
	client := &Client{
		Hub:    hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
		ChatID: chatID,
	}
	
	client.Hub.register <- client
	
	go client.writePump()
	go client.readPump()
}

// WebSocketHandler handles WebSocket connections for chat
func WebSocketHandler(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetUserIDFromContext(c)
		if !exists {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}
		
		chatIDStr := c.Param("chatId")
		chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid chat ID"})
			return
		}
		
		// Verify user has access to this chat
		var chat models.Chat
		if err := db.DB.Preload("Connection").Where("id = ?", uint(chatID)).First(&chat).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chat not found"})
			return
		}
		
		// Check if user is part of this connection
		if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
			c.JSON(403, gin.H{"error": "Access denied to this chat"})
			return
		}
		
		// Check if connection is accepted
		if chat.Connection.Status != "accepted" {
			c.JSON(403, gin.H{"error": "Chat is not available"})
			return
		}
		
		serveWS(hub, c.Writer, c.Request, userID, uint(chatID))
	}
}

// GetChatsHandler returns all chats for the current user
func GetChatsHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	
	// Get all chats where user is part of the connection
	var chats []models.Chat
	if err := db.DB.Preload("Connection.Requester.Profile").
		Preload("Connection.Receiver.Profile").
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at DESC").Limit(1)
		}).
		Joins("JOIN connections ON chats.connection_id = connections.id").
		Where("connections.requester_id = ? OR connections.receiver_id = ?", userID, userID).
		Where("connections.status = ?", "accepted").
		Order("chats.updated_at DESC").
		Find(&chats).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch chats"})
		return
	}
	
	// Build response
	var chatResponses []ChatResponse
	for _, chat := range chats {
		response := ChatResponse{
			ID:           chat.ID,
			ConnectionID: chat.ConnectionID,
			CreatedAt:    chat.CreatedAt,
			UpdatedAt:    chat.UpdatedAt,
		}
		
		// Determine the other user
		var otherUser *models.User
		if chat.Connection.RequesterID == userID {
			otherUser = &chat.Connection.Receiver
		} else {
			otherUser = &chat.Connection.Requester
		}
		
		// Add other user info
		if otherUser.Profile != nil {
			response.OtherUser = &UserInfo{
				ID:             otherUser.ID,
				Name:           otherUser.Profile.FirstName + " " + otherUser.Profile.LastName,
				ProfilePicture: otherUser.Profile.ProfilePictureURL,
			}
		}
		
		// Add last message if exists
		if len(chat.Messages) > 0 {
			lastMsg := chat.Messages[0]
			response.LastMessage = &ChatMessage{
				ID:        lastMsg.ID,
				ChatID:    lastMsg.ChatID,
				SenderID:  lastMsg.SenderID,
				Content:   lastMsg.Content,
				IsRead:    lastMsg.IsRead,
				CreatedAt: lastMsg.CreatedAt,
			}
		}
		
		// Calculate unread count
		var unreadCount int64
		db.DB.Model(&models.Message{}).
			Where("chat_id = ? AND sender_id != ? AND is_read = ?", chat.ID, userID, false).
			Count(&unreadCount)
		response.UnreadCount = int(unreadCount)
		
		chatResponses = append(chatResponses, response)
	}
	
	c.JSON(200, gin.H{
		"chats": chatResponses,
		"total": len(chatResponses),
	})
}

// GetChatMessagesHandler returns messages for a specific chat
func GetChatMessagesHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	
	chatIDStr := c.Param("chatId")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid chat ID"})
		return
	}
	
	// Verify user has access to this chat
	var chat models.Chat
	if err := db.DB.Preload("Connection").Where("id = ?", uint(chatID)).First(&chat).Error; err != nil {
		c.JSON(404, gin.H{"error": "Chat not found"})
		return
	}
	
	// Check if user is part of this connection
	if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
		c.JSON(403, gin.H{"error": "Access denied to this chat"})
		return
	}
	
	// Get pagination parameters
	limit := 20
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 100 {
			limit = l
		}
	}
	
	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}
	
	// Get messages
	var messages []models.Message
	if err := db.DB.Preload("Sender.Profile").
		Where("chat_id = ?", uint(chatID)).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch messages"})
		return
	}
	
	// Build response
	var messageResponses []ChatMessage
	for _, msg := range messages {
		response := ChatMessage{
			ID:        msg.ID,
			ChatID:    msg.ChatID,
			SenderID:  msg.SenderID,
			Content:   msg.Content,
			IsRead:    msg.IsRead,
			CreatedAt: msg.CreatedAt,
		}
		
		// Add sender name
		if msg.Sender.Profile != nil {
			response.SenderName = msg.Sender.Profile.FirstName + " " + msg.Sender.Profile.LastName
		}
		
		messageResponses = append(messageResponses, response)
	}
	
	c.JSON(200, gin.H{
		"messages": messageResponses,
		"total":    len(messageResponses),
		"limit":    limit,
		"offset":   offset,
	})
}

// SendMessageHandler handles sending a new message
func SendMessageHandler(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetUserIDFromContext(c)
		if !exists {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}
		
		chatIDStr := c.Param("chatId")
		chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid chat ID"})
			return
		}
		
		// Parse request body
		var req struct {
			Content string `json:"content" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "Invalid request body"})
			return
		}
		
		// Validate message content
		if len(req.Content) == 0 || len(req.Content) > 1000 {
			c.JSON(400, gin.H{"error": "Message content must be between 1 and 1000 characters"})
			return
		}
		
		// Verify user has access to this chat
		var chat models.Chat
		if err := db.DB.Preload("Connection").Where("id = ?", uint(chatID)).First(&chat).Error; err != nil {
			c.JSON(404, gin.H{"error": "Chat not found"})
			return
		}
		
		// Check if user is part of this connection
		if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
			c.JSON(403, gin.H{"error": "Access denied to this chat"})
			return
		}
		
		// Check if connection is accepted
		if chat.Connection.Status != "accepted" {
			c.JSON(403, gin.H{"error": "Chat is not available"})
			return
		}
		
		// Create message
		message := models.Message{
			ChatID:   uint(chatID),
			SenderID: userID,
			Content:  req.Content,
			IsRead:   false,
		}
		
		if err := db.DB.Create(&message).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to send message"})
			return
		}
		
		// Update chat's updated_at timestamp
		db.DB.Model(&chat).Update("updated_at", time.Now())
		
		// Get sender info for WebSocket broadcast
		var sender models.User
		db.DB.Preload("Profile").First(&sender, userID)
		
		// Prepare message for WebSocket broadcast
		messageResponse := ChatMessage{
			ID:        message.ID,
			ChatID:    message.ChatID,
			SenderID:  message.SenderID,
			Content:   message.Content,
			IsRead:    message.IsRead,
			CreatedAt: message.CreatedAt,
		}
		
		if sender.Profile != nil {
			messageResponse.SenderName = sender.Profile.FirstName + " " + sender.Profile.LastName
		}
		
		// Broadcast message to WebSocket clients in this chat
		messageBytes, _ := json.Marshal(messageResponse)
		hub.broadcast <- messageBytes
		
		c.JSON(201, gin.H{
			"message": "Message sent successfully",
			"data":    messageResponse,
		})
	}
}

// MarkMessagesAsReadHandler marks messages as read
func MarkMessagesAsReadHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	
	chatIDStr := c.Param("chatId")
	chatID, err := strconv.ParseUint(chatIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid chat ID"})
		return
	}
	
	// Verify user has access to this chat
	var chat models.Chat
	if err := db.DB.Preload("Connection").Where("id = ?", uint(chatID)).First(&chat).Error; err != nil {
		c.JSON(404, gin.H{"error": "Chat not found"})
		return
	}
	
	// Check if user is part of this connection
	if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
		c.JSON(403, gin.H{"error": "Access denied to this chat"})
		return
	}
	
	// Mark all unread messages as read
	if err := db.DB.Model(&models.Message{}).
		Where("chat_id = ? AND sender_id != ? AND is_read = ?", uint(chatID), userID, false).
		Update("is_read", true).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to mark messages as read"})
		return
	}
	
	c.JSON(200, gin.H{
		"message": "Messages marked as read",
	})
}
