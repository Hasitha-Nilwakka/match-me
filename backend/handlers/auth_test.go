package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/db"
	"backend/testutil"

	"github.com/gin-gonic/gin"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/auth/register", RegisterHandler)
	r.POST("/auth/login", LoginHandler)
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
