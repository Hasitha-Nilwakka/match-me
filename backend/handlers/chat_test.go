package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"backend/db"
	"backend/middleware"
	"backend/models"
	"backend/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func setupChatRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Create a mock hub for testing
	hub := NewHub()

	// Add protected routes for testing
	protected := r.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock auth middleware - set a test user ID
		c.Set("user_id", uint(1))
		c.Next()
	})
	protected.GET("/chats", GetChatsHandler(hub))
	protected.GET("/chats/:chatId/messages", GetChatMessagesHandler)
	protected.POST("/chats/:chatId/messages", SendMessageTestHandler)
	protected.PUT("/chats/:chatId/read", MarkMessagesAsReadHandler)
	protected.DELETE("/chats/:chatId", DeleteChatHandler)

	return r
}

// SendMessageTestHandler is a test version of SendMessageHandler that doesn't require a hub
func SendMessageTestHandler(c *gin.Context) {
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

	// Verify user has access to this chat
	var chat models.Chat
	if err := db.DB.Preload("Connection").Where("id = ?", uint(chatID)).First(&chat).Error; err != nil {
		c.JSON(404, gin.H{"error": "Chat not found"})
		return
	}

	// Check if user is part of this chat
	if chat.Connection.RequesterID != userID && chat.Connection.ReceiverID != userID {
		c.JSON(403, gin.H{"error": "Access denied"})
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
		c.JSON(500, gin.H{"error": "Failed to create message"})
		return
	}

	c.JSON(201, gin.H{
		"id":        message.ID,
		"content":   message.Content,
		"senderId":  message.SenderID,
		"createdAt": message.CreatedAt,
	})
}

func TestGetAllChats_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupChatRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@example.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@example.com", PasswordHash: "hashedpw"}
	user3 := models.User{Model: gorm.Model{ID: 3}, Email: "user3@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)
	db.DB.Create(&user3)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	profile3 := models.Profile{UserID: 3, FirstName: "Bob", LastName: "Johnson"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)
	db.DB.Create(&profile3)

	// Create connections
	connection1 := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	connection2 := models.Connection{RequesterID: 1, ReceiverID: 3, Status: "accepted"}
	db.DB.Create(&connection1)
	db.DB.Create(&connection2)

	// Create chats
	chat1 := models.Chat{ConnectionID: connection1.ID}
	chat2 := models.Chat{ConnectionID: connection2.ID}
	db.DB.Create(&chat1)
	db.DB.Create(&chat2)

	// Test GET /chats
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/chats", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	chats, ok := response["chats"].([]interface{})
	if !ok {
		t.Fatalf("expected chats array, got %v", response["chats"])
	}

	// Should have 2 chats
	if len(chats) != 2 {
		t.Fatalf("expected 2 chats, got %d", len(chats))
	}
}

func TestGetChatMessages_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupChatRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@example.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Create connection
	connection := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	db.DB.Create(&connection)

	// Create chat
	chat := models.Chat{ConnectionID: connection.ID}
	db.DB.Create(&chat)

	// Create messages
	message1 := models.Message{ChatID: chat.ID, SenderID: 1, Content: "Hello!"}
	message2 := models.Message{ChatID: chat.ID, SenderID: 2, Content: "Hi there!"}
	db.DB.Create(&message1)
	db.DB.Create(&message2)

	// Test GET /chats/{chat.ID}/messages
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", fmt.Sprintf("/chats/%d/messages", chat.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	messages, ok := response["messages"].([]interface{})
	if !ok {
		t.Fatalf("expected messages array, got %v", response["messages"])
	}

	// Should have 2 messages
	if len(messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(messages))
	}
}

func TestSendMessage_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupChatRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@example.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Create connection
	connection := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	db.DB.Create(&connection)

	// Create chat
	chat := models.Chat{ConnectionID: connection.ID}
	db.DB.Create(&chat)

	// Test POST /chats/{chat.ID}/messages
	messageData := map[string]string{"content": "Hello, how are you?"}
	b, _ := json.Marshal(messageData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", fmt.Sprintf("/chats/%d/messages", chat.ID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != 201 {
		t.Fatalf("expected 201 Created, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify message was created
	var message models.Message
	if err := db.DB.Where("chat_id = ? AND sender_id = ?", chat.ID, 1).First(&message).Error; err != nil {
		t.Fatalf("expected message to be created, got error: %v", err)
	}

	if message.Content != "Hello, how are you?" {
		t.Fatalf("expected message content 'Hello, how are you?', got %s", message.Content)
	}
}

func TestMarkChatAsRead_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupChatRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@example.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Create connection
	connection := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	db.DB.Create(&connection)

	// Create chat
	chat := models.Chat{ConnectionID: connection.ID}
	db.DB.Create(&chat)

	// Create unread message
	message := models.Message{ChatID: chat.ID, SenderID: 2, Content: "Hello!", IsRead: false}
	db.DB.Create(&message)

	// Test PUT /chats/{chat.ID}/read
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/chats/%d/read", chat.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify message was marked as read
	var updatedMessage models.Message
	if err := db.DB.Where("id = ?", message.ID).First(&updatedMessage).Error; err != nil {
		t.Fatalf("expected message to exist, got error: %v", err)
	}

	if !updatedMessage.IsRead {
		t.Fatalf("expected message to be marked as read")
	}
}

func TestDeleteChat_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupChatRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@example.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Create connection
	connection := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	db.DB.Create(&connection)

	// Create chat
	chat := models.Chat{ConnectionID: connection.ID}
	db.DB.Create(&chat)

	// Create messages
	message1 := models.Message{ChatID: chat.ID, SenderID: 1, Content: "Hello!"}
	message2 := models.Message{ChatID: chat.ID, SenderID: 2, Content: "Hi there!"}
	db.DB.Create(&message1)
	db.DB.Create(&message2)

	// Test DELETE /chats/{chat.ID}
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("/chats/%d", chat.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify chat was deleted
	var deletedChat models.Chat
	if err := db.DB.Where("id = ?", chat.ID).First(&deletedChat).Error; err == nil {
		t.Fatalf("expected chat to be deleted, but it still exists")
	}

	// Verify messages were also deleted
	var messageCount int64
	db.DB.Model(&models.Message{}).Where("chat_id = ?", chat.ID).Count(&messageCount)
	if messageCount > 0 {
		t.Fatalf("expected messages to be deleted, but %d still exist", messageCount)
	}
}
