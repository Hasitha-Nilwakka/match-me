package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"math"
	"sort"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RecommendationResponse represents a single recommendation
type RecommendationResponse struct {
	ID    uint    `json:"id"`
	Score float64 `json:"score"`
}

// RecommendationsResponse represents the full recommendations response
type RecommendationsResponse struct {
	Recommendations []RecommendationResponse `json:"recommendations"`
	Total           int                      `json:"total"`
}

// GetRecommendationsHandler returns up to 10 recommended user IDs
func GetRecommendationsHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get current user's profile and preferences
	var user models.User
	if err := db.DB.Preload("Profile").Preload("Location").Preload("SeekingPreference").
		Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
		Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
		Preload("UserLanguages").First(&user, userID).Error; err != nil {
		c.JSON(404, gin.H{"error": "User profile not found"})
		return
	}

	// Check if user has completed profile
	if user.Profile == nil || user.Profile.FirstName == "" {
		c.JSON(400, gin.H{"error": "Profile must be completed before getting recommendations"})
		return
	}

	// Get all potential matches (exclude current user, dismissed users, and existing connections)
	excludedUserIDs := getExcludedUserIDs(userID)

	// Get potential matches with spatial filtering if user has location data
	var potentialMatches []models.User
	var query *gorm.DB

	// Apply spatial filtering if user has location and preferences
	if user.Location != nil && user.Location.Latitude != nil && user.Location.Longitude != nil &&
		user.SeekingPreference != nil && user.SeekingPreference.LocationPreference == "define_radius" {

		// Get nearby users using bounding box pre-filtering
		potentialMatches = getNearbyUsers(*user.Location.Latitude, *user.Location.Longitude,
			user.SeekingPreference.MaxDistanceKm, excludedUserIDs)
	} else {
		// Fallback to loading all users (original behavior)
		// Filter out seeded users (those with @example.com emails) to show only real users
		query = db.DB.Where("id NOT IN ? AND is_active = ? AND email NOT LIKE ?",
			excludedUserIDs, true, "%@example.com").
			Preload("Profile").Preload("Location").
			Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
			Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
			Preload("UserLanguages").Find(&potentialMatches)

		if query.Error != nil {
			c.JSON(500, gin.H{"error": "Failed to fetch potential matches"})
			return
		}
	}

	// Calculate match scores for each potential match
	var scoredMatches []ScoredMatch
	for _, match := range potentialMatches {
		// Skip users without complete profiles
		if match.Profile == nil || match.Profile.FirstName == "" {
			continue
		}

		score := calculateMatchScore(user, match)
		if score > 0 { // Only include matches with positive scores
			scoredMatches = append(scoredMatches, ScoredMatch{
				User:  match,
				Score: score,
			})
		}
	}

	// Sort by score (highest first)
	sort.Slice(scoredMatches, func(i, j int) bool {
		return scoredMatches[i].Score > scoredMatches[j].Score
	})

	// Take top 10 recommendations
	maxRecommendations := 10
	if len(scoredMatches) > maxRecommendations {
		scoredMatches = scoredMatches[:maxRecommendations]
	}

    // Minimal mode: only return IDs
    if c.Query("minimal") == "true" {
        ids := make([]gin.H, 0, len(scoredMatches))
        for _, match := range scoredMatches {
            ids = append(ids, gin.H{"id": match.User.ID})
        }
        c.JSON(200, ids)
        return
    }

    // Build full response
    var recommendations []RecommendationResponse
    for _, match := range scoredMatches {
        recommendations = append(recommendations, RecommendationResponse{
            ID:    match.User.ID,
            Score: match.Score,
        })
    }

    if recommendations == nil {
        recommendations = []RecommendationResponse{}
    }

    c.JSON(200, gin.H{
        "recommendations": recommendations,
        "total":           len(recommendations),
    })
}

// ScoredMatch represents a user with their match score
type ScoredMatch struct {
	User  models.User
	Score float64
}

// getExcludedUserIDs returns a list of user IDs to exclude from recommendations
func getExcludedUserIDs(userID uint) []uint {
	var excludedIDs []uint
	excludedIDs = append(excludedIDs, userID) // Exclude self

	// Get dismissed users
	var dismissedUsers []models.DismissedRecommendation
	db.DB.Where("user_id = ?", userID).Find(&dismissedUsers)
	for _, dismissed := range dismissedUsers {
		excludedIDs = append(excludedIDs, dismissed.DismissedUserID)
	}

	// Get existing connections (both directions)
	var connections []models.Connection
	db.DB.Where("requester_id = ? OR receiver_id = ?", userID, userID).Find(&connections)
	for _, conn := range connections {
		if conn.RequesterID == userID {
			excludedIDs = append(excludedIDs, conn.ReceiverID)
		} else {
			excludedIDs = append(excludedIDs, conn.RequesterID)
		}
	}

	return excludedIDs
}

// calculateMatchScore calculates the compatibility score between two users
func calculateMatchScore(userA, userB models.User) float64 {
	score := 0.0
	totalWeight := 0.0

	// Get user preferences (default weights if not set)
	preferences := userA.SeekingPreference
	if preferences == nil {
		preferences = &models.SeekingPreference{
			HobbiesWeight:   5,
			InterestsWeight: 5,
			MusicWeight:     3,
			MoviesWeight:    3,
			FoodWeight:      2,
			TravelWeight:    4,
			LanguagesWeight: 7,
			EthnicityWeight: 6,
			ReligionWeight:  6,
		}
	}

	// Basic compatibility checks - if these fail, return 0
	if userA.Profile == nil || userB.Profile == nil {
		return 0.0
	}

	// Check gender preference
	if preferences.GenderPreference != nil && userB.Profile.Gender != nil {
		if *preferences.GenderPreference != *userB.Profile.Gender {
			return 0.0 // Gender doesn't match preference
		}
		score += float64(preferences.GenderWeight)
		totalWeight += float64(preferences.GenderWeight)
	}

	// Check status preference
	if preferences.StatusPreference != nil && userB.Profile.Status != nil {
		if *preferences.StatusPreference != *userB.Profile.Status {
			return 0.0 // Status doesn't match preference
		}
		score += float64(preferences.StatusWeight)
		totalWeight += float64(preferences.StatusWeight)
	}

	// Compare hobbies
	commonHobbies := findCommonHobbies(userA.UserHobbies, userB.UserHobbies)
	score += float64(len(commonHobbies)) * float64(preferences.HobbiesWeight)
	totalWeight += float64(preferences.HobbiesWeight)

	// Compare interests
	commonInterests := findCommonInterests(userA.UserInterests, userB.UserInterests)
	score += float64(len(commonInterests)) * float64(preferences.InterestsWeight)
	totalWeight += float64(preferences.InterestsWeight)

	// Compare music preferences
	commonMusic := findCommonMusic(userA.UserMusic, userB.UserMusic)
	score += float64(len(commonMusic)) * float64(preferences.MusicWeight)
	totalWeight += float64(preferences.MusicWeight)

	// Compare movie preferences
	commonMovies := findCommonMovies(userA.UserMovies, userB.UserMovies)
	score += float64(len(commonMovies)) * float64(preferences.MoviesWeight)
	totalWeight += float64(preferences.MoviesWeight)

	// Compare food preferences
	commonFood := findCommonFood(userA.UserFood, userB.UserFood)
	score += float64(len(commonFood)) * float64(preferences.FoodWeight)
	totalWeight += float64(preferences.FoodWeight)

	// Compare travel preferences
	commonTravel := findCommonTravel(userA.UserTravel, userB.UserTravel)
	score += float64(len(commonTravel)) * float64(preferences.TravelWeight)
	totalWeight += float64(preferences.TravelWeight)

	// Compare languages
	commonLanguages := findCommonLanguages(userA.UserLanguages, userB.UserLanguages)
	score += float64(len(commonLanguages)) * float64(preferences.LanguagesWeight)
	totalWeight += float64(preferences.LanguagesWeight)

	// Compare ethnicity (exact match)
	if userA.Profile != nil && userB.Profile != nil &&
		userA.Profile.Ethnicity != nil && userB.Profile.Ethnicity != nil &&
		*userA.Profile.Ethnicity == *userB.Profile.Ethnicity {
		score += float64(preferences.EthnicityWeight)
	}
	totalWeight += float64(preferences.EthnicityWeight)

	// Compare religion (exact match)
	if userA.Profile != nil && userB.Profile != nil &&
		userA.Profile.Religion != nil && userB.Profile.Religion != nil &&
		*userA.Profile.Religion == *userB.Profile.Religion {
		score += float64(preferences.ReligionWeight)
	}
	totalWeight += float64(preferences.ReligionWeight)

	// Calculate base score
	if totalWeight == 0 {
		return 0
	}
	baseScore := (score / totalWeight) * 100

	// Apply location penalty if users are too far apart
	if userA.Location != nil && userB.Location != nil &&
		userA.Location.Latitude != nil && userA.Location.Longitude != nil &&
		userB.Location.Latitude != nil && userB.Location.Longitude != nil {

		distance := calculateDistance(
			*userA.Location.Latitude, *userA.Location.Longitude,
			*userB.Location.Latitude, *userB.Location.Longitude,
		)

		maxDistance := float64(preferences.MaxDistanceKm)
		if distance > maxDistance {
			// Apply 70% penalty for distant matches
			baseScore *= 0.3
		}
	}

	return math.Round(baseScore*100) / 100 // Round to 2 decimal places
}

// Helper functions to find common items
func findCommonHobbies(hobbiesA, hobbiesB []models.UserHobby) []uint {
	common := []uint{}
	hobbyMap := make(map[uint]bool)

	for _, hobby := range hobbiesA {
		hobbyMap[hobby.HobbyID] = true
	}

	for _, hobby := range hobbiesB {
		if hobbyMap[hobby.HobbyID] {
			common = append(common, hobby.HobbyID)
		}
	}

	return common
}

func findCommonInterests(interestsA, interestsB []models.UserInterest) []uint {
	common := []uint{}
	interestMap := make(map[uint]bool)

	for _, interest := range interestsA {
		interestMap[interest.InterestID] = true
	}

	for _, interest := range interestsB {
		if interestMap[interest.InterestID] {
			common = append(common, interest.InterestID)
		}
	}

	return common
}

func findCommonMusic(musicA, musicB []models.UserMusic) []uint {
	common := []uint{}
	musicMap := make(map[uint]bool)

	for _, music := range musicA {
		musicMap[music.MusicGenreID] = true
	}

	for _, music := range musicB {
		if musicMap[music.MusicGenreID] {
			common = append(common, music.MusicGenreID)
		}
	}

	return common
}

func findCommonMovies(moviesA, moviesB []models.UserMovie) []uint {
	common := []uint{}
	movieMap := make(map[uint]bool)

	for _, movie := range moviesA {
		movieMap[movie.MovieGenreID] = true
	}

	for _, movie := range moviesB {
		if movieMap[movie.MovieGenreID] {
			common = append(common, movie.MovieGenreID)
		}
	}

	return common
}

func findCommonFood(foodA, foodB []models.UserFood) []uint {
	common := []uint{}
	foodMap := make(map[uint]bool)

	for _, food := range foodA {
		foodMap[food.FoodPreferenceID] = true
	}

	for _, food := range foodB {
		if foodMap[food.FoodPreferenceID] {
			common = append(common, food.FoodPreferenceID)
		}
	}

	return common
}

func findCommonTravel(travelA, travelB []models.UserTravel) []uint {
	common := []uint{}
	travelMap := make(map[uint]bool)

	for _, travel := range travelA {
		travelMap[travel.TravelTypeID] = true
	}

	for _, travel := range travelB {
		if travelMap[travel.TravelTypeID] {
			common = append(common, travel.TravelTypeID)
		}
	}

	return common
}

func findCommonLanguages(languagesA, languagesB []models.UserLanguage) []uint {
	common := []uint{}
	languageMap := make(map[uint]bool)

	for _, language := range languagesA {
		languageMap[language.LanguageID] = true
	}

	for _, language := range languagesB {
		if languageMap[language.LanguageID] {
			common = append(common, language.LanguageID)
		}
	}

	return common
}

// calculateDistance calculates the distance between two coordinates using Haversine formula
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// LikeRecommendationHandler handles liking a recommendation (creates connection request)
func LikeRecommendationHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get the user ID from URL parameter
	recommendedUserIDStr := c.Param("id")
	recommendedUserID, err := strconv.ParseUint(recommendedUserIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists and is active
	var recommendedUser models.User
	if err := db.DB.Where("id = ? AND is_active = ?", uint(recommendedUserID), true).First(&recommendedUser).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Check if connection already exists
	var existingConnection models.Connection
	if err := db.DB.Where("(requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)",
		userID, uint(recommendedUserID), uint(recommendedUserID), userID).First(&existingConnection).Error; err == nil {
		c.JSON(409, gin.H{"error": "Connection already exists"})
		return
	}

	// Create connection request
	connection := models.Connection{
		RequesterID: userID,
		ReceiverID:  uint(recommendedUserID),
		Status:      "pending",
	}

	if err := db.DB.Create(&connection).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to create connection request"})
		return
	}

	c.JSON(201, gin.H{
		"message":      "Connection request sent",
		"connectionId": connection.ID,
		"status":       connection.Status,
	})
}

// DismissRecommendationHandler handles dismissing a recommendation
func DismissRecommendationHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get the user ID from URL parameter
	recommendedUserIDStr := c.Param("id")
	recommendedUserID, err := strconv.ParseUint(recommendedUserIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var recommendedUser models.User
	if err := db.DB.Where("id = ? AND is_active = ?", uint(recommendedUserID), true).First(&recommendedUser).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Check if already dismissed
	var existingDismissal models.DismissedRecommendation
	if err := db.DB.Where("user_id = ? AND dismissed_user_id = ?", userID, uint(recommendedUserID)).First(&existingDismissal).Error; err == nil {
		c.JSON(409, gin.H{"error": "User already dismissed"})
		return
	}

	// Create dismissal record
	dismissal := models.DismissedRecommendation{
		UserID:          userID,
		DismissedUserID: uint(recommendedUserID),
	}

	if err := db.DB.Create(&dismissal).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to dismiss recommendation"})
		return
	}

	c.JSON(200, gin.H{
		"message": "Recommendation dismissed",
	})
}

// getNearbyUsers efficiently finds users within a specified radius using bounding box pre-filtering
func getNearbyUsers(userLat, userLon float64, radiusKm int, excludedUserIDs []uint) []models.User {
	// Calculate bounding box for efficient pre-filtering
	// Approximate km per degree of latitude (constant)
	latDelta := float64(radiusKm) / 111.0

	// Approximate km per degree of longitude (varies by latitude)
	lonDelta := float64(radiusKm) / (111.0 * math.Cos(userLat*math.Pi/180))

	// Define bounding box
	minLat := userLat - latDelta
	maxLat := userLat + latDelta
	minLon := userLon - lonDelta
	maxLon := userLon + lonDelta

	// Query users within bounding box first (much faster than Haversine for all users)
	// Filter out seeded users (those with @example.com emails) to show only real users
	var nearbyUsers []models.User
	query := db.DB.Where(`
		id NOT IN ? AND is_active = ? AND email NOT LIKE ? AND
		latitude IS NOT NULL AND longitude IS NOT NULL AND
		latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?
	`, excludedUserIDs, true, "%@example.com", minLat, maxLat, minLon, maxLon).
		Preload("Profile").Preload("Location").
		Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
		Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
		Preload("UserLanguages").Find(&nearbyUsers)

	if query.Error != nil {
		// If spatial query fails, fallback to loading all users
		// Filter out seeded users (those with @example.com emails) to show only real users
		var allUsers []models.User
		db.DB.Where("id NOT IN ? AND is_active = ? AND email NOT LIKE ?",
			excludedUserIDs, true, "%@example.com").
			Preload("Profile").Preload("Location").
			Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
			Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
			Preload("UserLanguages").Find(&allUsers)
		return allUsers
	}

	// Now apply precise Haversine distance filtering to the pre-filtered results
	var filteredUsers []models.User
	for _, user := range nearbyUsers {
		if user.Location != nil && user.Location.Latitude != nil && user.Location.Longitude != nil {
			distance := calculateDistance(userLat, userLon, *user.Location.Latitude, *user.Location.Longitude)
			if distance <= float64(radiusKm) {
				filteredUsers = append(filteredUsers, user)
			}
		}
	}

	return filteredUsers
}
