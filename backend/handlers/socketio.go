package handlers

import (
	"backend/db"
	"backend/models"
	"backend/utils"
	"log"
	"strconv"
	"sync"
	"time"

	socketio "github.com/zishang520/socket.io/socket"
)

// Global Socket.IO server instance
var SocketIOServer *socketio.Server

// Store socket metadata (userID, chatID) separately since socket.Data() has compatibility issues
type SocketMetadata struct {
	UserID uint
	ChatID uint
	Room   string
}

var (
	socketMetadata = make(map[string]*SocketMetadata)
	metadataMutex  sync.RWMutex
)

// SetupSocketIO configures and returns a Socket.IO server
func SetupSocketIO() *socketio.Server {
	// Create Socket.IO server
	server := socketio.NewServer(nil, nil)

	// Connection handler
	server.On("connection", func(clients ...any) {
		client := clients[0].(*socketio.Socket)
		socketID := string(client.Id())
		log.Printf("[SocketIO] New connection: %s", socketID)

		// Get authentication data from handshake
		authData, ok := client.Handshake().Auth.(map[string]any)
		if !ok {
			log.Printf("[SocketIO] No auth data for socket %s", socketID)
			client.Emit("error", "Authentication required")
			client.Disconnect(true)
			return
		}

		token, ok := authData["token"].(string)
		if !ok || token == "" {
			log.Printf("[SocketIO] No token provided in handshake for socket %s", socketID)
			client.Emit("error", "Authentication required")
			client.Disconnect(true)
			return
		}

		// Validate JWT token
		userID, err := utils.ValidateJWT(token)
		if err != nil {
			log.Printf("[SocketIO] Invalid token for socket %s: %v", socketID, err)
			client.Emit("error", "Invalid or expired token")
			client.Disconnect(true)
			return
		}

		log.Printf("[SocketIO] Authenticated user %d for socket %s", userID, socketID)

		// Store socket metadata
		metadataMutex.Lock()
		socketMetadata[socketID] = &SocketMetadata{
			UserID: userID,
		}
		metadataMutex.Unlock()

		// Join a per-user room for global events (connections, requests, etc.)
		// Room name: user-{userID}
		userRoom := "user-" + strconv.FormatUint(uint64(userID), 10)
		client.Join(socketio.Room(userRoom))

		// Handle join_chat event
		client.On("join_chat", func(datas ...any) {
			if len(datas) == 0 {
				log.Printf("[SocketIO] No data provided for join_chat")
				return
			}

			// Parse chat ID from the data
			dataMap, ok := datas[0].(map[string]any)
			if !ok {
				log.Printf("[SocketIO] Invalid join_chat data format")
				return
			}

			chatIDFloat, ok := dataMap["chatId"].(float64)
			if !ok {
				log.Printf("[SocketIO] Invalid chatId in join_chat data")
				return
			}
			chatID := uint(chatIDFloat)

			// Verify user has access to this chat
			var chat models.Chat
			if err := db.DB.Preload("Connection").Where("id = ?", chatID).First(&chat).Error; err != nil {
				log.Printf("[SocketIO] Chat %d not found for socket %s", chatID, socketID)
				client.Emit("error", "Chat not found")
				return
			}

			// Check if user is part of this connection
			if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
				log.Printf("[SocketIO] User %d denied access to chat %d", userID, chatID)
				client.Emit("error", "Access denied to this chat")
				return
			}

			// Check if connection is accepted
			if chat.Connection.Status != "accepted" {
				log.Printf("[SocketIO] Chat %d not accepted (status: %s)", chatID, chat.Connection.Status)
				client.Emit("error", "Chat is not available")
				return
			}

			// Join the chat room
			roomName := "chat-" + strconv.FormatUint(uint64(chatID), 10)
			client.Join(socketio.Room(roomName))

			// Update socket metadata
			metadataMutex.Lock()
			if meta, exists := socketMetadata[socketID]; exists {
				meta.ChatID = chatID
				meta.Room = roomName
			}
			metadataMutex.Unlock()

			log.Printf("[SocketIO] User %d joined chat %d (room: %s, socket: %s)",
				userID, chatID, roomName, socketID)

			// Send confirmation
			client.Emit("joined_chat", map[string]any{
				"chatId": chatID,
				"room":   roomName,
			})
		})

		// Handle typing event
		client.On("typing", func(datas ...any) {
			if len(datas) == 0 {
				return
			}

			// Get metadata
			metadataMutex.RLock()
			meta, exists := socketMetadata[socketID]
			metadataMutex.RUnlock()

			if !exists {
				log.Printf("[SocketIO] No metadata found for socket %s in typing event", socketID)
				return
			}

			// Parse typing data
			dataMap, ok := datas[0].(map[string]any)
			if !ok {
				log.Printf("[SocketIO] Invalid typing data format")
				return
			}

			isTyping, _ := dataMap["isTyping"].(bool)

			// Update typing state
			SetUserTyping(meta.UserID, meta.ChatID, isTyping)

			// Broadcast to room (except sender)
			client.Broadcast().To(socketio.Room(meta.Room)).Emit("typing", map[string]any{
				"userId":   meta.UserID,
				"chatId":   meta.ChatID,
				"isTyping": isTyping,
			})

			log.Printf("[SocketIO] User %d typing indicator: %v in chat %d", meta.UserID, isTyping, meta.ChatID)
		})

		// Handle disconnect
		client.On("disconnect", func(datas ...any) {
			metadataMutex.RLock()
			meta, exists := socketMetadata[socketID]
			metadataMutex.RUnlock()

			if exists {
				log.Printf("[SocketIO] User %d disconnected from chat %d (socket: %s)",
					meta.UserID, meta.ChatID, socketID)

				// Clean up metadata
				metadataMutex.Lock()
				delete(socketMetadata, socketID)
				metadataMutex.Unlock()
			} else {
				log.Printf("[SocketIO] Socket %s disconnected", socketID)
			}
		})
	})

	// Handle connection errors
	server.On("connect_error", func(clients ...any) {
		log.Printf("[SocketIO] Connection error")
	})

	log.Println("[SocketIO] Socket.IO server configured")
	SocketIOServer = server
	return server
}

// BroadcastMessageToChat sends a message to all clients in a chat room
func BroadcastMessageToChat(chatID uint, message ChatMessage) {
	if SocketIOServer == nil {
		log.Printf("[SocketIO] Server not initialized, cannot broadcast message")
		return
	}

	roomName := "chat-" + strconv.FormatUint(uint64(chatID), 10)

	log.Printf("[SocketIO] Broadcasting message to room %s", roomName)
	SocketIOServer.To(socketio.Room(roomName)).Emit("message", message)
}

// BroadcastReadReceiptToChat sends a read receipt to all clients in a chat room
func BroadcastReadReceiptToChat(chatID uint, readerID uint, lastReadMessageID uint) {
	if SocketIOServer == nil {
		log.Printf("[SocketIO] Server not initialized, cannot broadcast read receipt")
		return
	}

	roomName := "chat-" + strconv.FormatUint(uint64(chatID), 10)

	receiptData := map[string]any{
		"type":              "read",
		"chatId":            chatID,
		"readerId":          readerID,
		"lastReadMessageId": lastReadMessageID,
	}

	log.Printf("[SocketIO] Broadcasting read receipt to room %s (reader: %d, lastRead: %d)",
		roomName, readerID, lastReadMessageID)

	// Broadcast to all clients in the room
	SocketIOServer.To(socketio.Room(roomName)).Emit("read_receipt", receiptData)
}

// GetActiveClientsInChat returns the number of active clients in a chat room
func GetActiveClientsInChat(chatID uint) int {
	if SocketIOServer == nil {
		return 0
	}

	roomName := "chat-" + strconv.FormatUint(uint64(chatID), 10)

	// Count sockets in metadata that belong to this room
	metadataMutex.RLock()
	defer metadataMutex.RUnlock()

	count := 0
	for _, meta := range socketMetadata {
		if meta.Room == roomName {
			count++
		}
	}

	return count
}

// IsUserTypingInChat checks if a specific user is currently typing in a chat
// This is tracked via a separate in-memory map since Socket.IO doesn't persist typing state
var typingStates = make(map[string]time.Time) // key: "userID-chatID", value: last typing timestamp
var typingMutex sync.RWMutex

// SetUserTyping sets the typing state for a user in a chat
func SetUserTyping(userID uint, chatID uint, isTyping bool) {
	key := strconv.FormatUint(uint64(userID), 10) + "-" + strconv.FormatUint(uint64(chatID), 10)

	typingMutex.Lock()
	defer typingMutex.Unlock()

	if isTyping {
		typingStates[key] = time.Now()
	} else {
		delete(typingStates, key)
	}
}

// IsUserTyping checks if a user is currently typing (within last 5 seconds)
func IsUserTyping(userID uint, chatID uint) bool {
	key := strconv.FormatUint(uint64(userID), 10) + "-" + strconv.FormatUint(uint64(chatID), 10)

	typingMutex.RLock()
	defer typingMutex.RUnlock()

	if lastTyping, exists := typingStates[key]; exists {
		return time.Since(lastTyping) < 5*time.Second
	}

	return false
}
