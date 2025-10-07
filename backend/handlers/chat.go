package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"backend/utils"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
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
	IsTyping bool
	TypingAt time.Time
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
	ID         uint      `json:"id"`
	ChatID     uint      `json:"chatId"`
	SenderID   uint      `json:"senderId"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"isRead"`
	CreatedAt  time.Time `json:"createdAt"`
	SenderName string    `json:"senderName,omitempty"`
}

// ChatMessage represents a message in the API response
type ChatMessage struct {
	ID         uint      `json:"id"`
	ChatID     uint      `json:"chatId"`
	SenderID   uint      `json:"senderId"`
	Content    string    `json:"content"`
	IsRead     bool      `json:"isRead"`
	CreatedAt  time.Time `json:"createdAt"`
	SenderName string    `json:"senderName,omitempty"`
}

// ChatResponse represents a chat in the API response
type ChatResponse struct {
	ID           uint          `json:"id"`
	ConnectionID uint          `json:"connectionId"`
	CreatedAt    time.Time     `json:"createdAt"`
	UpdatedAt    time.Time     `json:"updatedAt"`
	Messages     []ChatMessage `json:"messages,omitempty"`
	UnreadCount  int           `json:"unreadCount"`
	LastMessage  *ChatMessage  `json:"lastMessage,omitempty"`
	OtherUser    *UserInfo     `json:"otherUser,omitempty"`
	IsTyping     bool          `json:"isTyping"`
}

// UserInfo represents basic user information in chat context
type UserInfo struct {
	ID             uint       `json:"id"`
	Name           string     `json:"name"`
	ProfilePicture string     `json:"profilePicture"`
	IsOnline       bool       `json:"isOnline"`
	LastSeen       *time.Time `json:"lastSeen,omitempty"`
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
		_, messageBytes, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Parse the incoming message
		var messageData map[string]interface{}
		if err := json.Unmarshal(messageBytes, &messageData); err != nil {
			log.Printf("Error parsing WebSocket message: %v", err)
			continue
		}

		// Handle different message types
		if messageType, ok := messageData["type"].(string); ok {
			switch messageType {
			case "auth":
				// Authentication message - just log it
				log.Printf("WebSocket auth received for user %d in chat %d", c.UserID, c.ChatID)
			case "typing":
				// Handle typing indicator
				if isTyping, ok := messageData["isTyping"].(bool); ok {
					// Update client typing status
					c.IsTyping = isTyping
					if isTyping {
						c.TypingAt = time.Now()
					}

					// Create typing indicator message
					typingMessage := map[string]interface{}{
						"type":     "typing",
						"isTyping": isTyping,
						"userId":   c.UserID,
						"chatId":   c.ChatID,
					}

					typingBytes, _ := json.Marshal(typingMessage)

					// Broadcast to all clients in this chat except the sender
					for client := range c.Hub.clients {
						if client.ChatID == c.ChatID && client.UserID != c.UserID {
							select {
							case client.Send <- typingBytes:
							default:
								close(client.Send)
								delete(c.Hub.clients, client)
							}
						}
					}

					log.Printf("Typing indicator: user %d in chat %d is typing: %v", c.UserID, c.ChatID, isTyping)
				}
			default:
				log.Printf("Unknown WebSocket message type: %s", messageType)
			}
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
		log.Printf("WebSocket connection attempt from %s", c.ClientIP())

		// For WebSocket connections, we need to handle authentication differently
		// since WebSocket can't use Authorization headers
		var userID uint
		var err error

		// First try to get user ID from context (if middleware worked)
		if id, exists := middleware.GetUserIDFromContext(c); exists {
			userID = id
			log.Printf("WebSocket auth: Got user ID from context: %d", userID)
		} else {
			// Fallback: try to get token from query parameter
			token := c.Query("token")
			if token == "" {
				log.Printf("WebSocket auth: No token provided")
				c.JSON(401, gin.H{"error": "No authentication token provided"})
				return
			}

			// Validate the JWT token
			userID, err = utils.ValidateJWT(token)
			if err != nil {
				log.Printf("WebSocket auth: Invalid token: %v", err)
				c.JSON(401, gin.H{"error": "Invalid or expired token"})
				return
			}
			log.Printf("WebSocket auth: Got user ID from token: %d", userID)
			log.Printf("WebSocket auth: Token: %s", token)
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
			log.Printf("WebSocket access: Chat %d not found: %v", chatID, err)
			c.JSON(404, gin.H{"error": "Chat not found"})
			return
		}

		log.Printf("WebSocket access: Chat %d found, connection: requester=%d, receiver=%d, status=%s",
			chatID, chat.Connection.RequesterID, chat.Connection.ReceiverID, chat.Connection.Status)

		// Check if user is part of this connection
		if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
			log.Printf("WebSocket access: User %d denied access to chat %d", userID, chatID)
			c.JSON(403, gin.H{"error": "Access denied to this chat"})
			return
		}

		// Check if connection is accepted
		if chat.Connection.Status != "accepted" {
			log.Printf("WebSocket access: Chat %d not accepted (status: %s)", chatID, chat.Connection.Status)
			c.JSON(403, gin.H{"error": "Chat is not available"})
			return
		}

		log.Printf("WebSocket access: User %d granted access to chat %d", userID, chatID)
		serveWS(hub, c.Writer, c.Request, userID, uint(chatID))
	}
}

// buildChatResponse creates a ChatResponse from a models.Chat
func buildChatResponse(chat models.Chat, userID uint) ChatResponse {
	response := ChatResponse{
		ID:           chat.ID,
		ConnectionID: chat.ConnectionID,
		CreatedAt:    chat.CreatedAt,
		UpdatedAt:    chat.UpdatedAt,
		UnreadCount:  0, // Will be calculated separately if needed
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

	return response
}

// CreateChatHandler creates a new chat for an accepted connection
func CreateChatHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var req struct {
		UserID uint `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	// Find the accepted connection between current user and target user
	var connection models.Connection
	if err := db.DB.Where("((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)) AND status = ?",
		userID, req.UserID, req.UserID, userID, "accepted").First(&connection).Error; err != nil {
		c.JSON(404, gin.H{"error": "No accepted connection found with this user"})
		return
	}

	// Check if chat already exists for this connection (excluding soft-deleted chats and per-user deleted chats)
	var existingChat models.Chat
	if err := db.DB.Preload("Connection.Requester.Profile").
		Preload("Connection.Receiver.Profile").
		Where("connection_id = ? AND deleted_at IS NULL", connection.ID).First(&existingChat).Error; err == nil {
		// Check if this chat is deleted for the current user
		var isDeletedForUser bool
		if connection.RequesterID == userID {
			isDeletedForUser = existingChat.RequesterDeletedAt != nil
		} else {
			isDeletedForUser = existingChat.ReceiverDeletedAt != nil
		}

		if !isDeletedForUser {
			// Chat exists and is not deleted for this user - return it
			log.Printf("Returning existing chat %d for user %d", existingChat.ID, userID)
			chatResponse := buildChatResponse(existingChat, userID)
			c.JSON(200, gin.H{
				"success": true,
				"data": gin.H{
					"chat": chatResponse,
				},
			})
			return
		}
		// If chat is deleted for this user, continue to the next check
	}

	// Check if there's any existing chat for this connection (including per-user deleted ones)
	var anyChat models.Chat
	if err := db.DB.Unscoped().Where("connection_id = ?", connection.ID).First(&anyChat).Error; err == nil {
		// Check if this chat is deleted for the current user
		var isDeletedForUser bool
		if connection.RequesterID == userID {
			isDeletedForUser = anyChat.RequesterDeletedAt != nil
		} else {
			isDeletedForUser = anyChat.ReceiverDeletedAt != nil
		}

		// Check if chat is deleted for BOTH users
		isDeletedForBothUsers := anyChat.RequesterDeletedAt != nil && anyChat.ReceiverDeletedAt != nil

		if isDeletedForBothUsers {
			// Chat is deleted for BOTH users - hard delete it to allow recreation
			log.Printf("Hard deleting chat %d (deleted for both users)", anyChat.ID)
			// First delete all messages in this chat
			if err := db.DB.Unscoped().Where("chat_id = ?", anyChat.ID).Delete(&models.Message{}).Error; err != nil {
				log.Printf("Error deleting messages for chat %d: %v", anyChat.ID, err)
			}
			// Then delete the chat
			if err := db.DB.Unscoped().Delete(&anyChat).Error; err != nil {
				log.Printf("Error hard deleting chat: %v", err)
			}
		} else if anyChat.DeletedAt.Valid {
			// Chat is globally soft-deleted - hard delete it
			log.Printf("Hard deleting globally soft-deleted chat %d", anyChat.ID)
			// First delete all messages in this chat
			if err := db.DB.Unscoped().Where("chat_id = ?", anyChat.ID).Delete(&models.Message{}).Error; err != nil {
				log.Printf("Error deleting messages for chat %d: %v", anyChat.ID, err)
			}
			// Then delete the chat
			if err := db.DB.Unscoped().Delete(&anyChat).Error; err != nil {
				log.Printf("Error hard deleting chat: %v", err)
			}
		} else if !isDeletedForUser {
			// Chat exists and is not deleted for this user - return it
			log.Printf("Returning existing chat %d for user %d", anyChat.ID, userID)
			chatResponse := buildChatResponse(anyChat, userID)
			c.JSON(200, gin.H{
				"success": true,
				"data": gin.H{
					"chat": chatResponse,
				},
			})
			return
		} else {
			// Chat is deleted for this user but not for the other user
			// Set a new deletion timestamp to "restart" the chat for this user (fresh start)
			log.Printf("Restarting chat %d for user %d by setting new deletion timestamp", anyChat.ID, userID)
			now := time.Now()
			updates := make(map[string]interface{})
			if connection.RequesterID == userID {
				updates["requester_deleted_at"] = now
			} else {
				updates["receiver_deleted_at"] = now
			}
			if err := db.DB.Model(&anyChat).Updates(updates).Error; err != nil {
				log.Printf("Error setting new deletion timestamp: %v", err)
				c.JSON(500, gin.H{"error": "Failed to restart chat"})
				return
			}
			// Return the existing chat
			chatResponse := buildChatResponse(anyChat, userID)
			c.JSON(200, gin.H{
				"success": true,
				"data": gin.H{
					"chat": chatResponse,
				},
			})
			return
		}
	}

	// Create new chat
	log.Printf("Creating new chat for connection %d, user %d", connection.ID, userID)
	chat := models.Chat{
		ConnectionID: connection.ID,
	}

	if err := db.DB.Create(&chat).Error; err != nil {
		log.Printf("Error creating chat: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create chat"})
		return
	}
	log.Printf("Successfully created chat %d", chat.ID)

	// Load the created chat with relations
	if err := db.DB.Preload("Connection.Requester.Profile").
		Preload("Connection.Receiver.Profile").
		Where("id = ?", chat.ID).First(&chat).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to load created chat"})
		return
	}

	// Return chat in proper format
	chatResponse := buildChatResponse(chat, userID)
	c.JSON(201, gin.H{
		"success": true,
		"data": gin.H{
			"chat": chatResponse,
		},
	})
}

// GetChatsHandler returns all chats for the current user
func GetChatsHandler(hub *Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := middleware.GetUserIDFromContext(c)
		if !exists {
			c.JSON(401, gin.H{"error": "Unauthorized"})
			return
		}

		// Get all chats where user is part of the connection
		var chats []models.Chat
		if err := db.DB.Preload("Connection.Requester.Profile").
			Preload("Connection.Receiver.Profile").
			Joins("JOIN connections ON chats.connection_id = connections.id").
			Where("connections.requester_id = ? OR connections.receiver_id = ?", userID, userID).
			Where("connections.status = ?", "accepted").
			// Filter out chats deleted by the current user, but show restarted chats (deletion within last 5 minutes)
			Where("(connections.requester_id = ? AND (chats.requester_deleted_at IS NULL OR chats.requester_deleted_at > NOW() - INTERVAL '5 minutes')) OR (connections.receiver_id = ? AND (chats.receiver_deleted_at IS NULL OR chats.receiver_deleted_at > NOW() - INTERVAL '5 minutes'))", userID, userID).
			Order("chats.updated_at DESC").
			Find(&chats).Error; err != nil {
			log.Printf("Error fetching chats for user %d: %v", userID, err)
			c.JSON(500, gin.H{"error": "Failed to fetch chats"})
			return
		}

		// log.Printf("Found %d chats for user %d", len(chats), userID)

		// Build response with de-duplication per counterpart user
		var chatResponses []ChatResponse
		seenByCounterpart := make(map[uint]bool)
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
				// Fetch online status for the other user
				var onlineStatus models.OnlineStatus
				isOnline := false
				var lastSeen *time.Time

				err := db.DB.Where("user_id = ?", otherUser.ID).First(&onlineStatus).Error
				if err == nil {
					isOnline = onlineStatus.IsOnline
					lastSeen = &onlineStatus.LastSeen
				}

				response.OtherUser = &UserInfo{
					ID:             otherUser.ID,
					Name:           otherUser.Profile.FirstName + " " + otherUser.Profile.LastName,
					ProfilePicture: otherUser.Profile.ProfilePictureURL,
					IsOnline:       isOnline,
					LastSeen:       lastSeen,
				}
			}

			// If we've already included a chat with this counterpart, prefer the one that has a lastMessage or newer UpdatedAt
			counterpartID := response.OtherUser.ID
			if seenByCounterpart[counterpartID] {
				// Find existing index for this counterpart
				for i := range chatResponses {
					if chatResponses[i].OtherUser != nil && chatResponses[i].OtherUser.ID == counterpartID {
						// Decide which to keep: prefer with LastMessage; otherwise newer UpdatedAt
						keepExisting := false
						if chatResponses[i].LastMessage != nil && response.LastMessage == nil {
							keepExisting = true
						} else if chatResponses[i].LastMessage == nil && response.LastMessage != nil {
							keepExisting = false
						} else {
							// Both have or both don't; compare UpdatedAt
							if chatResponses[i].UpdatedAt.After(response.UpdatedAt) {
								keepExisting = true
							}
						}
						if keepExisting {
							// do nothing; keep existing entry
						} else {
							chatResponses[i] = response
						}
						break
					}
				}
				continue
			}

			// Load last message respecting per-user deletion marker
			var lastMsg models.Message
			lastQ := db.DB.Model(&models.Message{}).Where("chat_id = ?", chat.ID)
			if chat.Connection.RequesterID == userID && chat.RequesterDeletedAt != nil {
				lastQ = lastQ.Where("created_at > ?", *chat.RequesterDeletedAt)
			}
			if chat.Connection.ReceiverID == userID && chat.ReceiverDeletedAt != nil {
				lastQ = lastQ.Where("created_at > ?", *chat.ReceiverDeletedAt)
			}
			if err := lastQ.Order("created_at DESC").Limit(1).First(&lastMsg).Error; err == nil {
				response.LastMessage = &ChatMessage{
					ID:        lastMsg.ID,
					ChatID:    lastMsg.ChatID,
					SenderID:  lastMsg.SenderID,
					Content:   lastMsg.Content,
					IsRead:    lastMsg.IsRead,
					CreatedAt: lastMsg.CreatedAt,
				}
			}

			// Calculate unread count (respect per-user deletion marker)
			var unreadCount int64
			unreadQ := db.DB.Model(&models.Message{}).
				Where("chat_id = ? AND sender_id != ? AND is_read = ?", chat.ID, userID, false)
			if chat.Connection.RequesterID == userID && chat.RequesterDeletedAt != nil {
				unreadQ = unreadQ.Where("created_at > ?", *chat.RequesterDeletedAt)
			}
			if chat.Connection.ReceiverID == userID && chat.ReceiverDeletedAt != nil {
				unreadQ = unreadQ.Where("created_at > ?", *chat.ReceiverDeletedAt)
			}
			unreadQ.Count(&unreadCount)
			response.UnreadCount = int(unreadCount)

			// Check if the other user is currently typing in this chat
			response.IsTyping = false
			if response.OtherUser != nil {
				// Check if there's a WebSocket client for the other user in this chat
				for client := range hub.clients {
					if client.UserID == response.OtherUser.ID && client.ChatID == chat.ID && client.IsTyping {
						// Check if typing is recent (within last 5 seconds)
						if time.Since(client.TypingAt) < 5*time.Second {
							response.IsTyping = true
							break
						}
					}
				}
			}

			chatResponses = append(chatResponses, response)
			if response.OtherUser != nil {
				seenByCounterpart[response.OtherUser.ID] = true
			}
		}

		c.JSON(200, gin.H{
			"chats": chatResponses,
			"total": len(chatResponses),
		})
	}
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
	q := db.DB.Preload("Sender.Profile").
		Where("chat_id = ?", uint(chatID))

	// Apply per-user deletion filter so the viewer only sees messages newer than
	// their personal deletion marker
	if chat.Connection.RequesterID == userID && chat.RequesterDeletedAt != nil {
		q = q.Where("created_at > ?", *chat.RequesterDeletedAt)
	}
	if chat.Connection.ReceiverID == userID && chat.ReceiverDeletedAt != nil {
		q = q.Where("created_at > ?", *chat.ReceiverDeletedAt)
	}

	if err := q.
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

		// Send message only to clients connected to this specific chat
		log.Printf("Broadcasting message to chat %d, found %d total clients", chatID, len(hub.clients))
		sentCount := 0
		for client := range hub.clients {
			if client.ChatID == uint(chatID) {
				log.Printf("Sending message to client: user %d in chat %d", client.UserID, client.ChatID)
				select {
				case client.Send <- messageBytes:
					sentCount++
					log.Printf("Message sent successfully to user %d", client.UserID)
				default:
					log.Printf("Failed to send message to user %d, closing connection", client.UserID)
					close(client.Send)
					delete(hub.clients, client)
				}
			}
		}
		log.Printf("Message broadcast complete: sent to %d clients in chat %d", sentCount, chatID)

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

// DeleteChatHandler deletes a chat and all its messages
func DeleteChatHandler(c *gin.Context) {
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

	// Per-user delete: set cutoff to the latest message's time to hide all existing messages
	var latestMsg models.Message
	if err := db.DB.Where("chat_id = ?", chat.ID).Order("created_at DESC").Limit(1).First(&latestMsg).Error; err == nil {
		// Use the latest message's time as the cutoff (or now if no messages)
		cutoff := latestMsg.CreatedAt
		if time.Now().After(cutoff) {
			cutoff = time.Now()
		}

		isRequester := chat.Connection.RequesterID == userID
		isReceiver := chat.Connection.ReceiverID == userID
		updates := make(map[string]interface{})
		if isRequester {
			updates["requester_deleted_at"] = cutoff
		}
		if isReceiver {
			updates["receiver_deleted_at"] = cutoff
		}
		if len(updates) == 0 {
			c.JSON(403, gin.H{"error": "Access denied to this chat"})
			return
		}
		if err := db.DB.Model(&chat).Updates(updates).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update chat deletion marker"})
			return
		}
	} else {
		// No messages exist, use current time
		now := time.Now()
		isRequester := chat.Connection.RequesterID == userID
		isReceiver := chat.Connection.ReceiverID == userID
		updates := make(map[string]interface{})
		if isRequester {
			updates["requester_deleted_at"] = now
		}
		if isReceiver {
			updates["receiver_deleted_at"] = now
		}
		if len(updates) == 0 {
			c.JSON(403, gin.H{"error": "Access denied to this chat"})
			return
		}
		if err := db.DB.Model(&chat).Updates(updates).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update chat deletion marker"})
			return
		}
	}

	c.JSON(200, gin.H{
		"message": "Chat hidden for current user",
	})
}
