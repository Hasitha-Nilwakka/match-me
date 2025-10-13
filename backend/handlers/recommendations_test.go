package handlers

import (
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

func setupRecommendationsRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Add protected routes for testing
	protected := r.Group("/")
	protected.Use(func(c *gin.Context) {
		// Mock auth middleware - set a test user ID
		c.Set("user_id", uint(1))
		c.Next()
	})
	protected.GET("/recommendations", GetRecommendationsHandler)
	protected.POST("/recommendations/:id/like", LikeRecommendationHandler)
	protected.POST("/recommendations/:id/dismiss", DismissRecommendationHandler)

	return r
}

func TestGetRecommendations_Success(t *testing.T) {
	// Skip on SQLite – production filtering and matching rely on Postgres
	// behavior that can diverge in test data ordering.
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB
	if db.DB.Dialector.Name() == "sqlite" {
		t.Skip("skipping TestGetRecommendations_Success on SQLite; runs on Postgres in CI")
	}

	r := setupRecommendationsRouter()

	// Create test users (using non-example.com emails to avoid being filtered out)
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@test.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@test.com", PasswordHash: "hashedpw"}
	user3 := models.User{Model: gorm.Model{ID: 3}, Email: "user3@test.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)
	db.DB.Create(&user3)

	// Create profiles for users
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe", Gender: strptr("male"), Status: strptr("single")}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith", Gender: strptr("female"), Status: strptr("single")}
	profile3 := models.Profile{UserID: 3, FirstName: "Bob", LastName: "Johnson", Gender: strptr("male"), Status: strptr("single")}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)
	db.DB.Create(&profile3)

	// Create seeking preferences for user1 (looking for female, single)
	seekingPref := models.SeekingPreference{
		UserID:             1,
		MinAge:             18,
		MaxAge:             35,
		GenderPreference:   strptr("female"),
		StatusPreference:   strptr("single"),
		LocationPreference: "within_city",
		MaxDistanceKm:      50,
		GenderWeight:       10,
		StatusWeight:       10,
		LocationWeight:     5,
	}
	db.DB.Create(&seekingPref)

	// Test GET /recommendations
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/recommendations", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Should return recommendations (user2 should be recommended, user3 should not due to gender mismatch)
	recommendations, ok := response["recommendations"].([]interface{})
	if !ok {
		t.Fatalf("expected recommendations array, got %v", response["recommendations"])
	}

	// Should have at least one recommendation (user2)
	if len(recommendations) == 0 {
		t.Fatalf("expected at least one recommendation, got %d", len(recommendations))
	}

	// Verify the recommendation is user2 (female, single)
	firstRec := recommendations[0].(map[string]interface{})
	if firstRec["id"] != float64(2) {
		t.Fatalf("expected recommendation to be user2 (id=2), got id=%v", firstRec["id"])
	}
}

func TestLikeRecommendation_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB
	if db.DB.Dialector.Name() == "sqlite" {
		t.Skip("skipping TestLikeRecommendation_Success on SQLite; runs on Postgres in CI")
	}

	r := setupRecommendationsRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@test.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@test.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Test POST /recommendations/{user2.ID}/like
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", fmt.Sprintf("/recommendations/%d/like", user2.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 201 {
		t.Fatalf("expected 201 Created, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify connection was created
	var connection models.Connection
	if err := db.DB.Where("requester_id = ? AND receiver_id = ?", 1, 2).First(&connection).Error; err != nil {
		t.Fatalf("expected connection to be created, got error: %v", err)
	}

	if connection.Status != "pending" {
		t.Fatalf("expected connection status to be 'pending', got %s", connection.Status)
	}
}

func TestDismissRecommendation_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB
	if db.DB.Dialector.Name() == "sqlite" {
		t.Skip("skipping TestDismissRecommendation_Success on SQLite; runs on Postgres in CI")
	}

	r := setupRecommendationsRouter()

	// Create test users
	user1 := models.User{Model: gorm.Model{ID: 1}, Email: "user1@test.com", PasswordHash: "hashedpw"}
	user2 := models.User{Model: gorm.Model{ID: 2}, Email: "user2@test.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user1)
	db.DB.Create(&user2)

	// Create profiles
	profile1 := models.Profile{UserID: 1, FirstName: "John", LastName: "Doe"}
	profile2 := models.Profile{UserID: 2, FirstName: "Jane", LastName: "Smith"}
	db.DB.Create(&profile1)
	db.DB.Create(&profile2)

	// Test POST /recommendations/{user2.ID}/dismiss
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", fmt.Sprintf("/recommendations/%d/dismiss", user2.ID), nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify dismissed recommendation was created
	var dismissed models.DismissedRecommendation
	if err := db.DB.Where("user_id = ? AND dismissed_user_id = ?", 1, 2).First(&dismissed).Error; err != nil {
		t.Fatalf("expected dismissed recommendation to be created, got error: %v", err)
	}
}

func TestCalculateMatchScore_UsesMultipleSignals(t *testing.T) {
	// Create seeking preference with weights
	seekingPref := &models.SeekingPreference{
		HobbiesWeight:   10,
		InterestsWeight: 10,
		MusicWeight:     10,
		MoviesWeight:    10,
		FoodWeight:      10,
		TravelWeight:    10,
		LanguagesWeight: 10,
		EthnicityWeight: 10,
		ReligionWeight:  10,
		MaxDistanceKm:   100,
	}

	a := models.User{
		Profile:           &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:       []models.UserHobby{{HobbyID: 1}},
		UserInterests:     []models.UserInterest{{InterestID: 2}},
		UserMusic:         []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:        []models.UserMovie{{MovieGenreID: 4}},
		UserFood:          []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:        []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages:     []models.UserLanguage{{LanguageID: 7}},
		SeekingPreference: seekingPref,
	}
	b := models.User{
		Profile:       &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:   []models.UserHobby{{HobbyID: 1}},
		UserInterests: []models.UserInterest{{InterestID: 2}},
		UserMusic:     []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:    []models.UserMovie{{MovieGenreID: 4}},
		UserFood:      []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:    []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages: []models.UserLanguage{{LanguageID: 7}},
	}

	score := CalculateMatchScore(a, b)
	if score <= 0 {
		t.Fatalf("expected positive score, got %v", score)
	}

	// With all matching signals, should get a high score (close to 100)
	if score < 80 {
		t.Fatalf("expected high score (>=80) for perfect match, got %v", score)
	}
}

func TestCalculateMatchScore_NoMatches(t *testing.T) {
	// Create seeking preference with weights
	seekingPref := &models.SeekingPreference{
		HobbiesWeight:   10,
		InterestsWeight: 10,
		MusicWeight:     10,
		MoviesWeight:    10,
		FoodWeight:      10,
		TravelWeight:    10,
		LanguagesWeight: 10,
		EthnicityWeight: 10,
		ReligionWeight:  10,
		MaxDistanceKm:   100,
	}

	a := models.User{
		Profile:           &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:       []models.UserHobby{{HobbyID: 1}},
		UserInterests:     []models.UserInterest{{InterestID: 2}},
		UserMusic:         []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:        []models.UserMovie{{MovieGenreID: 4}},
		UserFood:          []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:        []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages:     []models.UserLanguage{{LanguageID: 7}},
		SeekingPreference: seekingPref,
	}
	b := models.User{
		Profile:       &models.Profile{Ethnicity: strptr("B"), Religion: strptr("R2")},
		UserHobbies:   []models.UserHobby{{HobbyID: 10}},         // Different hobby
		UserInterests: []models.UserInterest{{InterestID: 20}},   // Different interest
		UserMusic:     []models.UserMusic{{MusicGenreID: 30}},    // Different music
		UserMovies:    []models.UserMovie{{MovieGenreID: 40}},    // Different movie
		UserFood:      []models.UserFood{{FoodPreferenceID: 50}}, // Different food
		UserTravel:    []models.UserTravel{{TravelTypeID: 60}},   // Different travel
		UserLanguages: []models.UserLanguage{{LanguageID: 70}},   // Different language
	}

	score := CalculateMatchScore(a, b)
	if score < 0 {
		t.Fatalf("expected non-negative score, got %v", score)
	}

	// With no matching signals, should get a low score
	if score > 20 {
		t.Fatalf("expected low score (<=20) for no matches, got %v", score)
	}
}

func TestGetRecommendations_FiltersSeededUsers(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB
	if db.DB.Dialector.Name() == "sqlite" {
		t.Skip("skipping TestGetRecommendations_FiltersSeededUsers on SQLite; runs on Postgres in CI")
	}

	r := setupRecommendationsRouter()

	// Create a real user (seeker)
	realUser := models.User{Model: gorm.Model{ID: 1}, Email: "real@test.com", PasswordHash: "hashedpw"}
	db.DB.Create(&realUser)

	// Create a seeded user (should be filtered out)
	seededUser := models.User{Model: gorm.Model{ID: 2}, Email: "seeded@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&seededUser)

	// Create profiles for both users
	realProfile := models.Profile{UserID: 1, FirstName: "Real", LastName: "User", Gender: strptr("male"), Status: strptr("single")}
	seededProfile := models.Profile{UserID: 2, FirstName: "Seeded", LastName: "User", Gender: strptr("female"), Status: strptr("single")}
	db.DB.Create(&realProfile)
	db.DB.Create(&seededProfile)

	// Create seeking preferences for real user (looking for female, single)
	seekingPref := models.SeekingPreference{
		UserID:             1,
		MinAge:             18,
		MaxAge:             35,
		GenderPreference:   strptr("female"),
		StatusPreference:   strptr("single"),
		LocationPreference: "within_city",
		MaxDistanceKm:      50,
		GenderWeight:       10,
		StatusWeight:       10,
		LocationWeight:     5,
	}
	db.DB.Create(&seekingPref)

	// Test GET /recommendations
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/recommendations", nil)
	r.ServeHTTP(w, req)

	if w.Code != 200 {
		t.Fatalf("expected 200 OK, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Should return empty recommendations because seeded user is filtered out
	recommendations, ok := response["recommendations"].([]interface{})
	if !ok {
		t.Fatalf("expected recommendations array, got %v", response["recommendations"])
	}

	// Should have no recommendations because seeded user is filtered out
	if len(recommendations) != 0 {
		t.Fatalf("expected 0 recommendations (seeded user filtered out), got %d", len(recommendations))
	}
}

func TestCalculateMatchScore_PartialMatches(t *testing.T) {
	// Create seeking preference with weights
	seekingPref := &models.SeekingPreference{
		HobbiesWeight:   10,
		InterestsWeight: 10,
		MusicWeight:     10,
		MoviesWeight:    10,
		FoodWeight:      10,
		TravelWeight:    10,
		LanguagesWeight: 10,
		EthnicityWeight: 10,
		ReligionWeight:  10,
		MaxDistanceKm:   100,
	}

	a := models.User{
		Profile:           &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:       []models.UserHobby{{HobbyID: 1}, {HobbyID: 2}},
		UserInterests:     []models.UserInterest{{InterestID: 2}, {InterestID: 3}},
		UserMusic:         []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:        []models.UserMovie{{MovieGenreID: 4}},
		UserFood:          []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:        []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages:     []models.UserLanguage{{LanguageID: 7}},
		SeekingPreference: seekingPref,
	}
	b := models.User{
		Profile:       &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")}, // Match
		UserHobbies:   []models.UserHobby{{HobbyID: 1}},                                // Partial match (1 out of 2)
		UserInterests: []models.UserInterest{{InterestID: 2}},                          // Partial match (1 out of 2)
		UserMusic:     []models.UserMusic{{MusicGenreID: 30}},                          // No match
		UserMovies:    []models.UserMovie{{MovieGenreID: 4}},                           // Match
		UserFood:      []models.UserFood{{FoodPreferenceID: 50}},                       // No match
		UserTravel:    []models.UserTravel{{TravelTypeID: 6}},                          // Match
		UserLanguages: []models.UserLanguage{{LanguageID: 70}},                         // No match
	}

	score := CalculateMatchScore(a, b)
	if score <= 0 {
		t.Fatalf("expected positive score, got %v", score)
	}

	// With partial matches, should get a medium score
	if score < 30 || score > 70 {
		t.Fatalf("expected medium score (30-70) for partial matches, got %v", score)
	}
}
