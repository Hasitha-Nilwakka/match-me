package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"math"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	socketio "github.com/zishang520/socket.io/socket"
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

	// DEBUG: Log debugging information
	// fmt.Printf("DEBUG: User ID %d requesting recommendations\n", userID)
	// fmt.Printf("DEBUG: Excluded user IDs: %v\n", excludedUserIDs)

	// Count total active users first
	var totalActiveUsers int64
	db.DB.Model(&models.User{}).Where("is_active = ?", true).Count(&totalActiveUsers)
	// fmt.Printf("DEBUG: Total active users in database: %d\n", totalActiveUsers)

	// Determine strict location preference
	locPref := "any"
	maxKm := 0
	if user.SeekingPreference != nil {
		lp := strings.ToLower(strings.TrimSpace(user.SeekingPreference.LocationPreference))
		switch lp {
		case "any", "within_city", "within_country", "define_radius":
			locPref = lp
		}
		maxKm = user.SeekingPreference.MaxDistanceKm
	}

	// Get potential matches with spatial filtering if user has location data
	var potentialMatches []models.User
	var query *gorm.DB

	// Apply spatial filtering if user has location and preferences
	if user.Location != nil && user.Location.Latitude != nil && user.Location.Longitude != nil &&
		locPref == "define_radius" && maxKm > 0 {

		// fmt.Printf("DEBUG: Using spatial filtering with radius %d km\n", user.SeekingPreference.MaxDistanceKm)
		// Get nearby users using bounding box pre-filtering
		potentialMatches = getNearbyUsers(*user.Location.Latitude, *user.Location.Longitude,
			maxKm, excludedUserIDs)
	} else {
		// fmt.Printf("DEBUG: Using fallback query (loading all users)\n")
		// Fallback to loading all users (original behavior)
		query = db.DB.Where("users.id NOT IN ? AND users.is_active = ?",
			excludedUserIDs, true).
			Preload("Profile").Preload("Location").Preload("SeekingPreference").
			Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
			Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
			Preload("UserLanguages").Find(&potentialMatches)

		if query.Error != nil {
			// fmt.Printf("DEBUG: Query error: %v\n", query.Error)
			c.JSON(500, gin.H{"error": "Failed to fetch potential matches"})
			return
		}
	}

	// fmt.Printf("DEBUG: Found %d potential matches after filtering\n", len(potentialMatches))

	// Strict location filtering (any = no filter)
	if locPref != "any" {
		filtered := make([]models.User, 0, len(potentialMatches))
		for _, u := range potentialMatches {
			if passesLocationFilter(locPref, maxKm, user.Location, u.Location) {
				filtered = append(filtered, u)
			}
		}
		potentialMatches = filtered
	}

	// === Gender mutual filtering ===
	// Only show users whose gender matches the requester's seeking preference AND
	// whose seeking preference includes the requester's gender. Treat empty/Any as open.
	potentialMatches = filterByMutualGender(user, potentialMatches)

	// === Age mutual filtering ===
	// Only show users when each party's age is within the other's seeking min/max.
	if user.SeekingPreference != nil && user.Profile != nil && user.Profile.Age != nil {
		minA := user.SeekingPreference.MinAge
		maxA := user.SeekingPreference.MaxAge
		ageA := *user.Profile.Age
		filtered := make([]models.User, 0, len(potentialMatches))
		for _, cand := range potentialMatches {
			if cand.Profile == nil || cand.Profile.Age == nil {
				continue
			}
			ageB := *cand.Profile.Age
			// requester wants candidate?
			if ageB < minA || ageB > maxA {
				continue
			}
			// candidate wants requester?
			if cand.SeekingPreference != nil {
				minB := cand.SeekingPreference.MinAge
				maxB := cand.SeekingPreference.MaxAge
				if ageA < minB || ageA > maxB {
					continue
				}
			}
			filtered = append(filtered, cand)
		}
		potentialMatches = filtered
	}

	// Calculate match scores for each potential match
	var scoredMatches []ScoredMatch
	var skippedIncomplete = 0
	var zeroScored = 0

	for _, match := range potentialMatches {
		// Skip users without complete profiles
		if match.Profile == nil || match.Profile.FirstName == "" {
			skippedIncomplete++
			// fmt.Printf("DEBUG: Skipping user %d - incomplete profile (Profile: %v, FirstName: %v)\n",
			// match.ID, match.Profile != nil, match.Profile != nil && match.Profile.FirstName != "")
			continue
		}

		score := calculateMatchScore(user, match)
		if score > 0 {
			// fmt.Printf("DEBUG: User %d (%s %s) scored: %.2f\n",
			// 	match.ID, match.Profile.FirstName, match.Profile.LastName, score)
		}

		if score > 0 { // Only include matches with positive scores
			scoredMatches = append(scoredMatches, ScoredMatch{
				User:  match,
				Score: score,
			})
		} else {
			zeroScored++
		}
	}

	// fmt.Printf("DEBUG: Scoring summary - Total potential: %d, Skipped incomplete: %d, Zero scored: %d, Valid matches: %d\n",
	// 	len(potentialMatches), skippedIncomplete, zeroScored, len(scoredMatches))

	// // Sort by score (highest first)
	// sort.Slice(scoredMatches, func(i, j int) bool {
	// 	return scoredMatches[i].Score > scoredMatches[j].Score
	// })

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
			HobbiesWeight:   2,
			InterestsWeight: 2,
			MusicWeight:     1,
			MoviesWeight:    1,
			FoodWeight:      1,
			TravelWeight:    2,
			LanguagesWeight: 3,
			EthnicityWeight: 1,
			ReligionWeight:  1,
		}
	}

	// Basic compatibility checks - if these fail, return 0
	if userA.Profile == nil || userB.Profile == nil {
		return 0.0
	}

	// NOTE: Gender is enforced as a hard filter before scoring. It does not
	// contribute to score or denominator anymore.

	// Check status preference (case-insensitive) - flexible scoring
	if preferences.StatusPreference != nil && userB.Profile.Status != nil {
		wantStatus := strings.ToLower(*preferences.StatusPreference)
		foundStatus := strings.ToLower(*userB.Profile.Status)
		if wantStatus == foundStatus {
			// Perfect match - full score
			score += float64(preferences.StatusWeight)
		} else {
			// Mismatch - reduced score (25% of weight)
			score += float64(preferences.StatusWeight) * 0.25
		}
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

	return math.Round(baseScore*100) / 100 // Round to 2 decimal places
}

// filterByMutualGender returns users that satisfy mutual gender preferences
// Requester sees a candidate only if:
//   - requester's seeking gender matches candidate's gender, or requester's seeking is Any/empty
//   - candidate's seeking gender matches requester's gender, or candidate's seeking is Any/empty
func filterByMutualGender(requester models.User, candidates []models.User) []models.User {
	var out []models.User

	reqGender := valueOrEmpty(requester.Profile, func(p *models.Profile) *string { return p.Gender })
	reqPref := valueOrEmptyPref(requester.SeekingPreference, func(sp *models.SeekingPreference) *string { return sp.GenderPreference })

	for _, cand := range candidates {
		candGender := valueOrEmpty(cand.Profile, func(p *models.Profile) *string { return p.Gender })
		candPref := valueOrEmptyPref(cand.SeekingPreference, func(sp *models.SeekingPreference) *string { return sp.GenderPreference })

		// requester wants candidate?
		if !genderAllowed(reqPref, candGender) {
			continue
		}
		// candidate wants requester?
		if !genderAllowed(candPref, reqGender) {
			continue
		}

		out = append(out, cand)
	}
	return out
}

// Helpers
func valueOrEmpty[T any](ptr *T, get func(*T) *string) string {
	if ptr == nil {
		return ""
	}
	gp := get(ptr)
	if gp == nil {
		return ""
	}
	return strings.ToLower(strings.TrimSpace(*gp))
}

func valueOrEmptyPref[T any](ptr *T, get func(*T) *string) string {
	v := valueOrEmpty(ptr, get)
	return v
}

// genderAllowed returns true if pref is open ("", "any") or contains gender
// Supports comma-separated multiple gender preferences like "male,female"
func genderAllowed(pref string, gender string) bool {
	if pref == "" || pref == "any" {
		return true
	}
	if gender == "" {
		return true
	} // if candidate hasn't set gender, treat as open

	// Handle comma-separated multiple preferences
	prefList := strings.Split(pref, ",")
	for _, p := range prefList {
		p = strings.ToLower(strings.TrimSpace(p))
		g := strings.ToLower(strings.TrimSpace(gender))
		if p == g || p == "any" {
			return true
		}
	}
	return false
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

	// Parse request body for optional message
	var requestBody struct {
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		// Message is optional, so we don't require JSON body
		requestBody.Message = ""
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
		Message:     requestBody.Message,
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

	// Real-time: notify receiver a request was created
	if SocketIOServer != nil {
		evt := gin.H{
			"type":         "request_created",
			"connectionId": connection.ID,
			"requesterId":  connection.RequesterID,
			"receiverId":   connection.ReceiverID,
		}
		receiverRoom := "user-" + strconv.FormatUint(uint64(connection.ReceiverID), 10)
		SocketIOServer.To(socketio.Room(receiverRoom)).Emit("request_created", evt)
	}
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
	var nearbyUsers []models.User
	query := db.DB.
		Joins("JOIN locations ON locations.user_id = users.id").
		Where(`
			users.id NOT IN ? AND users.is_active = ? AND
			locations.latitude IS NOT NULL AND locations.longitude IS NOT NULL AND
			locations.latitude BETWEEN ? AND ? AND locations.longitude BETWEEN ? AND ?
		`, excludedUserIDs, true, minLat, maxLat, minLon, maxLon).
		Preload("Profile").Preload("Location").Preload("SeekingPreference").
		Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
		Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
		Preload("UserLanguages").Find(&nearbyUsers)

	if query.Error != nil {
		// If spatial query fails, fallback to loading all users
		var allUsers []models.User
		db.DB.Where("users.id NOT IN ? AND users.is_active = ?",
			excludedUserIDs, true).
			Preload("Profile").Preload("Location").Preload("SeekingPreference").
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

// passesLocationFilter applies strict location rules
func passesLocationFilter(pref string, maxKm int, me *models.Location, other *models.Location) bool {
	switch pref {
	case "any", "":
		return true
	case "within_city":
		if me == nil || other == nil || me.City == nil || other.City == nil {
			return false
		}
		return strings.EqualFold(strings.TrimSpace(*me.City), strings.TrimSpace(*other.City))
	case "within_country":
		if me == nil || other == nil || me.Country == nil || other.Country == nil {
			return false
		}
		return strings.EqualFold(strings.TrimSpace(*me.Country), strings.TrimSpace(*other.Country))
	case "define_radius":
		if me == nil || other == nil ||
			me.Latitude == nil || me.Longitude == nil ||
			other.Latitude == nil || other.Longitude == nil ||
			maxKm <= 0 {
			return false
		}
		return calculateDistance(*me.Latitude, *me.Longitude, *other.Latitude, *other.Longitude) <= float64(maxKm)
	default:
		return true
	}
}
