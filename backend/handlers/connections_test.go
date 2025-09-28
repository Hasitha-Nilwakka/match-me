package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/db"
	"backend/models"
	"backend/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func setupConnectionsRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Add protected routes for testing
	protected := r.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock auth middleware - set a test user ID
		c.Set("user_id", uint(1))
		c.Next()
	})
	protected.GET("/connections", GetConnectionsHandler)
	protected.GET("/connections/requests", GetConnectionRequestsHandler)
	protected.PUT("/connections/:id", UpdateConnectionHandler)
	protected.DELETE("/connections/:id", DeleteConnectionHandler)

	return r
}

func TestGetConnections_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupConnectionsRouter()

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
	connection2 := models.Connection{RequesterID: 3, ReceiverID: 1, Status: "accepted"}
	db.DB.Create(&connection1)
	db.DB.Create(&connection2)

	// Test GET /connections
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/connections", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	connections, ok := response["connections"].([]interface{})
	if !ok {
		t.Fatalf("expected connections array, got %v", response["connections"])
	}

	// Should have 2 connections
	if len(connections) != 2 {
		t.Fatalf("expected 2 connections, got %d", len(connections))
	}
}

func TestGetConnectionRequests_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupConnectionsRouter()

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

	// Create connection requests (user1 is the receiver)
	request1 := models.Connection{RequesterID: 2, ReceiverID: 1, Status: "pending"}
	request2 := models.Connection{RequesterID: 3, ReceiverID: 1, Status: "pending"}
	db.DB.Create(&request1)
	db.DB.Create(&request2)

	// Test GET /connections/requests
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/connections/requests", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	requests, ok := response["requests"].([]interface{})
	if !ok {
		t.Fatalf("expected requests array, got %v", response["requests"])
	}

	// Should have 2 pending requests
	if len(requests) != 2 {
		t.Fatalf("expected 2 requests, got %d", len(requests))
	}
}

func TestUpdateConnection_Accept(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupConnectionsRouter()

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

	// Create a pending connection request
	connection := models.Connection{RequesterID: 2, ReceiverID: 1, Status: "pending"}
	db.DB.Create(&connection)

	// Test PUT /connections/{connection.ID} (accept the request)
	updateData := map[string]string{"status": "accepted"}
	b, _ := json.Marshal(updateData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/connections/%d", connection.ID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify connection was updated
	var updatedConnection models.Connection
	if err := db.DB.Where("id = ?", connection.ID).First(&updatedConnection).Error; err != nil {
		t.Fatalf("expected connection to exist, got error: %v", err)
	}

	if updatedConnection.Status != "accepted" {
		t.Fatalf("expected connection status to be 'accepted', got %s", updatedConnection.Status)
	}
}

func TestUpdateConnection_Reject(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupConnectionsRouter()

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

	// Create a pending connection request
	connection := models.Connection{RequesterID: 2, ReceiverID: 1, Status: "pending"}
	db.DB.Create(&connection)

	// Test PUT /connections/{connection.ID} (reject the request)
	updateData := map[string]string{"status": "rejected"}
	b, _ := json.Marshal(updateData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("PUT", fmt.Sprintf("/connections/%d", connection.ID), bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify connection was updated
	var updatedConnection models.Connection
	if err := db.DB.Where("id = ?", connection.ID).First(&updatedConnection).Error; err != nil {
		t.Fatalf("expected connection to exist, got error: %v", err)
	}

	if updatedConnection.Status != "rejected" {
		t.Fatalf("expected connection status to be 'rejected', got %s", updatedConnection.Status)
	}
}

func TestDeleteConnection_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupConnectionsRouter()

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

	// Create an accepted connection
	connection := models.Connection{RequesterID: 1, ReceiverID: 2, Status: "accepted"}
	db.DB.Create(&connection)

	// Test DELETE /connections/{connection.ID}
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("DELETE", fmt.Sprintf("/connections/%d", connection.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify connection was deleted
	var deletedConnection models.Connection
	if err := db.DB.Where("id = ?", connection.ID).First(&deletedConnection).Error; err == nil {
		t.Fatalf("expected connection to be deleted, but it still exists")
	}
}
