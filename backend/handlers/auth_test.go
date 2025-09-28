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

	// User profile management endpoints
	protected.GET("/me", GetMeHandler)
	protected.GET("/me/profile", GetMeProfileHandler)
	protected.PUT("/me/profile", UpdateMeProfileHandler)
	protected.POST("/me/profile-picture", UploadProfilePictureHandler)
	protected.POST("/me/change-password", ChangePasswordHandler)
	protected.GET("/me/bio", GetMeBioHandler)
	protected.PUT("/me/bio", UpdateMeBioHandler)
	protected.GET("/me/preferences", GetMePreferencesHandler)
	protected.PUT("/me/preferences", UpdateMePreferencesHandler)
	protected.GET("/me/location", GetMeLocationHandler)
	protected.PUT("/me/location", UpdateMeLocationHandler)
	protected.GET("/me/biographical", GetMeBiographicalDataHandler)
	protected.PUT("/me/biographical", UpdateMeBiographicalDataHandler)

	// Other user information endpoints
	protected.GET("/users/:id", GetUserHandler)
	protected.GET("/users/:id/profile", GetUserProfileHandler)
	protected.GET("/users/:id/bio", GetUserBioHandler)

	// Recommendation system endpoints
	protected.GET("/recommendations", GetRecommendationsHandler)
	protected.POST("/recommendations/:id/like", LikeRecommendationHandler)
	protected.POST("/recommendations/:id/dismiss", DismissRecommendationHandler)

	// Connection management endpoints
	protected.GET("/connections", GetConnectionsHandler)
	protected.GET("/connections/requests", GetConnectionRequestsHandler)
	protected.PUT("/connections/:id", UpdateConnectionHandler)
	protected.DELETE("/connections/:id", DeleteConnectionHandler)

	// Chat endpoints
	protected.GET("/chats", GetChatsHandler)
	protected.GET("/chats/:chatId/messages", GetChatMessagesHandler)
	protected.POST("/chats/:chatId/messages", CreateChatHandler)
	protected.PUT("/chats/:chatId/read", MarkMessagesAsReadHandler)
	protected.DELETE("/chats/:chatId", DeleteChatHandler)

	// Reference data endpoints
	protected.GET("/languages", GetAllLanguagesHandler)
	protected.GET("/hobbies", GetAllHobbiesHandler)
	protected.GET("/interests", GetAllInterestsHandler)
	protected.GET("/music-genres", GetAllMusicGenresHandler)
	protected.GET("/movie-genres", GetAllMovieGenresHandler)
	protected.GET("/food-preferences", GetAllFoodPreferencesHandler)
	protected.GET("/travel-types", GetAllTravelTypesHandler)

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

func TestGetSeekingPreferences_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Create seeking preferences
	preferences := models.SeekingPreference{
		UserID:                 1,
		MinAge:                 25,
		MaxAge:                 35,
		GenderPreference:       strptr("female"),
		StatusPreference:       strptr("single"),
		RelationshipPreference: strptr("serious"),
		LocationPreference:     "within_city",
		MaxDistanceKm:          50,
		HobbyPreference:        strptr("reading,music"),
		InterestPreference:     strptr("technology,travel"),
		MusicPreference:        strptr("rock,jazz"),
		MoviePreference:        strptr("drama,comedy"),
		FoodPreference:         strptr("italian,asian"),
		TravelPreference:       strptr("adventure,beach"),
		LanguagePreference:     strptr("english,finnish"),
		EthnicityPreference:    strptr("european"),
		ReligionPreference:     strptr("christian"),
		GenderWeight:           5,
		StatusWeight:           3,
		RelationshipWeight:     7,
		LocationWeight:         4,
		HobbiesWeight:          6,
		InterestsWeight:        8,
		MusicWeight:            2,
		MoviesWeight:           3,
		FoodWeight:             4,
		TravelWeight:           5,
		LanguagesWeight:        6,
		EthnicityWeight:        3,
		ReligionWeight:         2,
	}
	db.DB.Create(&preferences)

	// Test GET /me/preferences
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/me/preferences", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on get preferences, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Check that arrays are properly converted from comma-separated strings
	if hobbies, ok := response["hobbiesPreference"].([]interface{}); !ok || len(hobbies) != 2 {
		t.Fatalf("expected hobbiesPreference to be array with 2 items, got %v", response["hobbiesPreference"])
	}
	if interests, ok := response["interestsPreference"].([]interface{}); !ok || len(interests) != 2 {
		t.Fatalf("expected interestsPreference to be array with 2 items, got %v", response["interestsPreference"])
	}
}

func TestGetSeekingPreferences_NotFound(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Test GET /me/preferences without existing preferences
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/me/preferences", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on get preferences (default), got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify default response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Check default values
	if response["minAge"] != float64(18) {
		t.Fatalf("expected default minAge 18, got %v", response["minAge"])
	}
	if response["maxAge"] != float64(99) {
		t.Fatalf("expected default maxAge 99, got %v", response["maxAge"])
	}
	if response["locationPreference"] != "within_city" {
		t.Fatalf("expected default locationPreference 'within_city', got %v", response["locationPreference"])
	}
}

func TestUpdateSeekingPreferences_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Update seeking preferences
	updateData := map[string]interface{}{
		"genderPreference":          "female",
		"statusPreference":          "single",
		"relationshipPreference":    "serious",
		"locationPreference":        "within_region",
		"maxDistanceKm":             100,
		"interestsPreference":       []string{"technology", "travel", "music"},
		"hobbiesPreference":         []string{"reading", "hiking"},
		"foodPreferencesPreference": []string{"italian", "asian"},
		"musicGenresPreference":     []string{"rock", "jazz"},
		"movieGenresPreference":     []string{"drama", "comedy"},
		"travelTypesPreference":     []string{"adventure", "beach"},
		"languagesPreference":       []string{"english", "finnish"},
		"ethnicityPreference":       "european",
		"religionPreference":        "christian",
		"genderWeight":              5,
		"statusWeight":              3,
		"relationshipWeight":        7,
		"locationWeight":            4,
		"hobbiesWeight":             6,
		"interestsWeight":           8,
		"musicGenresWeight":         2,
		"movieGenresWeight":         3,
		"foodPreferencesWeight":     4,
		"travelTypesWeight":         5,
		"languagesWeight":           6,
		"ethnicityWeight":           3,
		"religionWeight":            2,
	}
	b, _ := json.Marshal(updateData)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPut, "/me/preferences", bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on preferences update, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify preferences were saved correctly
	var preferences models.SeekingPreference
	if err := db.DB.Where("user_id = ?", 1).First(&preferences).Error; err != nil {
		t.Fatalf("preferences should exist after update: %v", err)
	}

	// Check that arrays were converted to comma-separated strings
	if preferences.InterestPreference == nil || *preferences.InterestPreference != "technology,travel,music" {
		t.Fatalf("interests not saved correctly, got %v", preferences.InterestPreference)
	}
	if preferences.HobbyPreference == nil || *preferences.HobbyPreference != "reading,hiking" {
		t.Fatalf("hobbies not saved correctly, got %v", preferences.HobbyPreference)
	}
	if preferences.FoodPreference == nil || *preferences.FoodPreference != "italian,asian" {
		t.Fatalf("food preferences not saved correctly, got %v", preferences.FoodPreference)
	}

	// Check weight values
	if preferences.GenderWeight != 5 {
		t.Fatalf("genderWeight not saved correctly, got %d", preferences.GenderWeight)
	}
	if preferences.HobbiesWeight != 6 {
		t.Fatalf("hobbiesWeight not saved correctly, got %d", preferences.HobbiesWeight)
	}
}

func TestGetMeProfile_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Create a profile
	profile := models.Profile{
		UserID:             1,
		ProfilePictureURL:  "https://example.com/pic.jpg",
		FirstName:          "John",
		LastName:           "Doe",
		Gender:             strptr("male"),
		Status:             strptr("single"),
		RelationshipStatus: strptr("looking"),
		AboutMe:            strptr("I love testing!"),
		Ethnicity:          strptr("european"),
		Religion:           strptr("christian"),
	}
	db.DB.Create(&profile)

	// Test GET /me/profile
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/me/profile", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on get profile, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	if response["firstName"] != "John" {
		t.Fatalf("expected firstName 'John', got %v", response["firstName"])
	}
	if response["lastName"] != "Doe" {
		t.Fatalf("expected lastName 'Doe', got %v", response["lastName"])
	}
}

func TestGetMeBio_Success(t *testing.T) {
	testDB, _ := testutil.NewTestDB(t)
	db.DB = testDB

	r := setupRouter()

	// Create a test user with ID 1 (to match our mock auth)
	user := models.User{Model: gorm.Model{ID: 1}, Email: "test@example.com", PasswordHash: "hashedpw"}
	db.DB.Create(&user)

	// Create some test reference data
	hobby := models.Hobby{Name: "Reading"}
	interest := models.Interest{Name: "Technology"}
	language := models.Language{Name: "English", Code: "en"}
	db.DB.Create(&hobby)
	db.DB.Create(&interest)
	db.DB.Create(&language)

	// Create user bio data
	userHobby := models.UserHobby{UserID: 1, HobbyID: hobby.ID}
	userInterest := models.UserInterest{UserID: 1, InterestID: interest.ID}
	userLanguage := models.UserLanguage{UserID: 1, LanguageID: language.ID}
	db.DB.Create(&userHobby)
	db.DB.Create(&userInterest)
	db.DB.Create(&userLanguage)

	// Test GET /me/bio
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/me/bio", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on get bio, got %d, body=%s", w.Code, w.Body.String())
	}

	// Verify response structure
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	// Check that the bio data is returned
	if hobbies, ok := response["hobbies"].([]interface{}); !ok || len(hobbies) != 1 {
		t.Fatalf("expected hobbies array with 1 item, got %v", response["hobbies"])
	}
	if interests, ok := response["interests"].([]interface{}); !ok || len(interests) != 1 {
		t.Fatalf("expected interests array with 1 item, got %v", response["interests"])
	}
	if languages, ok := response["languages"].([]interface{}); !ok || len(languages) != 1 {
		t.Fatalf("expected languages array with 1 item, got %v", response["languages"])
	}
}

// Helper function for string pointers
func strptr(s string) *string { return &s }
