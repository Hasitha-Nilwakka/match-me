package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/db"
	"backend/models"
	"backend/testutil"

	"github.com/gin-gonic/gin"
)

func setupReferenceRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Add protected routes for testing
	protected := r.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock auth middleware - set a test user ID
		c.Set("user_id", uint(1))
		c.Next()
	})
	protected.GET("/languages", GetAllLanguagesHandler)
	protected.GET("/hobbies", GetAllHobbiesHandler)
	protected.GET("/interests", GetAllInterestsHandler)
	protected.GET("/music-genres", GetAllMusicGenresHandler)
	protected.GET("/movie-genres", GetAllMovieGenresHandler)
	protected.GET("/food-preferences", GetAllFoodPreferencesHandler)
	protected.GET("/travel-types", GetAllTravelTypesHandler)

	return r
}

func TestGetLanguages_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test languages
	language1 := models.Language{Name: "English", Code: "en"}
	language2 := models.Language{Name: "Finnish", Code: "fi"}
	language3 := models.Language{Name: "Swedish", Code: "sv"}
	db.DB.Create(&language1)
	db.DB.Create(&language2)
	db.DB.Create(&language3)

	// Test GET /languages
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/languages", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	languages, ok := response["languages"].([]interface{})
	if !ok {
		t.Fatalf("expected languages array, got %v", response["languages"])
	}

	// Should have 3 languages
	if len(languages) != 3 {
		t.Fatalf("expected 3 languages, got %d", len(languages))
	}
}

func TestGetHobbies_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test hobbies
	hobby1 := models.Hobby{Name: "Reading"}
	hobby2 := models.Hobby{Name: "Hiking"}
	hobby3 := models.Hobby{Name: "Cooking"}
	db.DB.Create(&hobby1)
	db.DB.Create(&hobby2)
	db.DB.Create(&hobby3)

	// Test GET /hobbies
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/hobbies", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	hobbies, ok := response["hobbies"].([]interface{})
	if !ok {
		t.Fatalf("expected hobbies array, got %v", response["hobbies"])
	}

	// Should have 3 hobbies
	if len(hobbies) != 3 {
		t.Fatalf("expected 3 hobbies, got %d", len(hobbies))
	}
}

func TestGetInterests_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test interests
	interest1 := models.Interest{Name: "Technology"}
	interest2 := models.Interest{Name: "Travel"}
	interest3 := models.Interest{Name: "Music"}
	db.DB.Create(&interest1)
	db.DB.Create(&interest2)
	db.DB.Create(&interest3)

	// Test GET /interests
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/interests", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	interests, ok := response["interests"].([]interface{})
	if !ok {
		t.Fatalf("expected interests array, got %v", response["interests"])
	}

	// Should have 3 interests
	if len(interests) != 3 {
		t.Fatalf("expected 3 interests, got %d", len(interests))
	}
}

func TestGetMusicGenres_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test music genres
	genre1 := models.MusicGenre{Name: "Rock"}
	genre2 := models.MusicGenre{Name: "Jazz"}
	genre3 := models.MusicGenre{Name: "Classical"}
	db.DB.Create(&genre1)
	db.DB.Create(&genre2)
	db.DB.Create(&genre3)

	// Test GET /music-genres
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/music-genres", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	genres, ok := response["musicGenres"].([]interface{})
	if !ok {
		t.Fatalf("expected musicGenres array, got %v", response["musicGenres"])
	}

	// Should have 3 genres
	if len(genres) != 3 {
		t.Fatalf("expected 3 music genres, got %d", len(genres))
	}
}

func TestGetMovieGenres_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test movie genres
	genre1 := models.MovieGenre{Name: "Drama"}
	genre2 := models.MovieGenre{Name: "Comedy"}
	genre3 := models.MovieGenre{Name: "Action"}
	db.DB.Create(&genre1)
	db.DB.Create(&genre2)
	db.DB.Create(&genre3)

	// Test GET /movie-genres
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/movie-genres", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	genres, ok := response["movieGenres"].([]interface{})
	if !ok {
		t.Fatalf("expected movieGenres array, got %v", response["movieGenres"])
	}

	// Should have 3 genres
	if len(genres) != 3 {
		t.Fatalf("expected 3 movie genres, got %d", len(genres))
	}
}

func TestGetFoodPreferences_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test food preferences
	food1 := models.FoodPreference{Name: "Italian"}
	food2 := models.FoodPreference{Name: "Asian"}
	food3 := models.FoodPreference{Name: "Mexican"}
	db.DB.Create(&food1)
	db.DB.Create(&food2)
	db.DB.Create(&food3)

	// Test GET /food-preferences
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/food-preferences", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	foods, ok := response["foodPreferences"].([]interface{})
	if !ok {
		t.Fatalf("expected foodPreferences array, got %v", response["foodPreferences"])
	}

	// Should have 3 food preferences
	if len(foods) != 3 {
		t.Fatalf("expected 3 food preferences, got %d", len(foods))
	}
}

func TestGetTravelTypes_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupReferenceRouter()

	// Create test travel types
	travel1 := models.TravelType{Name: "Adventure"}
	travel2 := models.TravelType{Name: "Beach"}
	travel3 := models.TravelType{Name: "Cultural"}
	db.DB.Create(&travel1)
	db.DB.Create(&travel2)
	db.DB.Create(&travel3)

	// Test GET /travel-types
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/travel-types", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	travels, ok := response["travelTypes"].([]interface{})
	if !ok {
		t.Fatalf("expected travelTypes array, got %v", response["travelTypes"])
	}

	// Should have 3 travel types
	if len(travels) != 3 {
		t.Fatalf("expected 3 travel types, got %d", len(travels))
	}
}
