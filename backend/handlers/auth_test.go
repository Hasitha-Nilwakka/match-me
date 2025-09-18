package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/db"
	"backend/models"
	"backend/testutil"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/auth/register", RegisterHandler)
	r.POST("/auth/login", LoginHandler)

	// Add protected routes for testing
	protected := r.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock auth middleware - set a test user ID
		c.Set("user_id", uint(1))
		c.Next()
	})
	protected.PUT("/me/profile", UpdateMeProfileHandler)
	protected.PUT("/me/bio", UpdateMeBioHandler)
	protected.PUT("/me/preferences", UpdateMePreferencesHandler)

	return r
}

func TestRegisterAndLogin_Success(t *testing.T) {
	// prepare in-memory DB and inject into package db
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Register
	body := map[string]string{"email": "user1@example.com", "password": "password123"}
	b, _ := json.Marshal(body)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created, got %d, body=%s", w.Code, w.Body.String())
	}

	// Login
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(b))
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on login, got %d, body=%s", w2.Code, w2.Body.String())
	}
}

func TestRegister_DuplicateEmail(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	payload := map[string]string{"email": "dup@example.com", "password": "password123"}
	b, _ := json.Marshal(payload)

	// first create
	w1 := httptest.NewRecorder()
	req1, _ := http.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(b))
	req1.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created on first register, got %d", w1.Code)
	}

	// duplicate
	w2 := httptest.NewRecorder()
	req2, _ := http.NewRequest(http.MethodPost, "/auth/register", bytes.NewReader(b))
	req2.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict on duplicate register, got %d", w2.Code)
	}
}

func TestUpdateProfile_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Update profile
	updateData := map[string]interface{}{
		"firstName": "John",
		"lastName":  "Doe",
		"aboutMe":   "I love testing!",
	}
	b, _ := json.Marshal(updateData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/me/profile", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on profile update, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify profile was created/updated (use user_id = 1 from mock auth)
	var profile models.Profile
	if err := db.DB.Where("user_id = ?", 1).First(&profile).Error; err != nil {
		t.Fatalf("profile should exist after update: %v", err)
	}

	if profile.FirstName != "John" || profile.LastName != "Doe" {
		t.Fatalf("profile data not updated correctly")
	}
}

func TestUpdateBio_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "biotest@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Create some test reference data
	hobby := models.Hobby{Name: "Reading"}
	interest := models.Interest{Name: "Technology"}
	db.DB.Create(&hobby)
	db.DB.Create(&interest)

	// Update bio
	updateData := map[string]interface{}{
		"hobbyIds":    []uint{hobby.ID},
		"interestIds": []uint{interest.ID},
	}
	b, _ := json.Marshal(updateData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/me/bio", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on bio update, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify bio data was updated (use user_id = 1 from mock auth)
	var userHobbies []models.UserHobby
	db.DB.Where("user_id = ?", 1).Find(&userHobbies)
	if len(userHobbies) != 1 || userHobbies[0].HobbyID != hobby.ID {
		t.Fatalf("hobbies not updated correctly")
	}
}
