package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

// GetMeHandler returns current user's basic info
func GetMeHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := db.DB.Select("id, email, created_at, updated_at, last_login, is_active").First(&user, userID).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	c.JSON(200, gin.H{
		"id":        user.ID,
		"email":     user.Email,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
		"lastLogin": user.LastLogin,
		"isActive":  user.IsActive,
	})
}

// GetUserHandler returns a specific user's basic info (public data only)
func GetUserHandler(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := db.DB.Select("id, created_at, updated_at, is_active").First(&user, uint(userID)).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Only return public data
	c.JSON(200, gin.H{
		"id":        user.ID,
		"createdAt": user.CreatedAt,
		"updatedAt": user.UpdatedAt,
		"isActive":  user.IsActive,
	})
}

// GetUserProfileHandler returns a specific user's profile information
func GetUserProfileHandler(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists and is active
	var user models.User
	if err := db.DB.Where("id = ? AND is_active = ?", uint(userID), true).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Get user's profile
	var profile models.Profile
	if err := db.DB.Where("user_id = ?", uint(userID)).First(&profile).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	// Return profile data (excluding sensitive information)
	c.JSON(200, gin.H{
		"id":                 user.ID,
		"profilePictureURL":  profile.ProfilePictureURL,
		"firstName":          profile.FirstName,
		"lastName":           profile.LastName,
		"gender":             profile.Gender,
		"status":             profile.Status,
		"relationshipStatus": profile.RelationshipStatus,
		"aboutMe":            profile.AboutMe,
		"ethnicity":          profile.Ethnicity,
		"religion":           profile.Religion,
		"createdAt":          profile.CreatedAt,
		"updatedAt":          profile.UpdatedAt,
	})
}

// GetUserBioHandler returns a specific user's bio data (for matching)
func GetUserBioHandler(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists and is active
	var user models.User
	if err := db.DB.Where("id = ? AND is_active = ?", uint(userID), true).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Get user's bio data (hobbies, interests, etc.)
	var userHobbies []models.UserHobby
	var userInterests []models.UserInterest
	var userMusic []models.UserMusic
	var userMovies []models.UserMovie
	var userFood []models.UserFood
	var userTravel []models.UserTravel
	var userLanguages []models.UserLanguage

	// Fetch all bio-related data
	db.DB.Where("user_id = ?", uint(userID)).Find(&userHobbies)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userInterests)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userMusic)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userMovies)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userFood)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userTravel)
	db.DB.Where("user_id = ?", uint(userID)).Find(&userLanguages)

	// Get the actual hobby/interest names
	var hobbies []string
	var interests []string
	var musicGenres []string
	var movieGenres []string
	var foodPreferences []string
	var travelTypes []string
	var languages []string

	// Extract hobby names
	for _, uh := range userHobbies {
		var hobby models.Hobby
		if err := db.DB.First(&hobby, uh.HobbyID).Error; err == nil {
			hobbies = append(hobbies, hobby.Name)
		}
	}

	// Extract interest names
	for _, ui := range userInterests {
		var interest models.Interest
		if err := db.DB.First(&interest, ui.InterestID).Error; err == nil {
			interests = append(interests, interest.Name)
		}
	}

	// Extract music genre names
	for _, um := range userMusic {
		var music models.MusicGenre
		if err := db.DB.First(&music, um.MusicGenreID).Error; err == nil {
			musicGenres = append(musicGenres, music.Name)
		}
	}

	// Extract movie genre names
	for _, um := range userMovies {
		var movie models.MovieGenre
		if err := db.DB.First(&movie, um.MovieGenreID).Error; err == nil {
			movieGenres = append(movieGenres, movie.Name)
		}
	}

	// Extract food preference names
	for _, uf := range userFood {
		var food models.FoodPreference
		if err := db.DB.First(&food, uf.FoodPreferenceID).Error; err == nil {
			foodPreferences = append(foodPreferences, food.Name)
		}
	}

	// Extract travel type names
	for _, ut := range userTravel {
		var travel models.TravelType
		if err := db.DB.First(&travel, ut.TravelTypeID).Error; err == nil {
			travelTypes = append(travelTypes, travel.Name)
		}
	}

	// Extract language names
	for _, ul := range userLanguages {
		var language models.Language
		if err := db.DB.First(&language, ul.LanguageID).Error; err == nil {
			languages = append(languages, language.Name)
		}
	}

	// Return bio data
	c.JSON(200, gin.H{
		"id":              user.ID,
		"hobbies":         hobbies,
		"interests":       interests,
		"musicGenres":     musicGenres,
		"movieGenres":     movieGenres,
		"foodPreferences": foodPreferences,
		"travelTypes":     travelTypes,
		"languages":       languages,
	})
}

// GetMeProfileHandler returns current user's profile
func GetMeProfileHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get user's profile
	var profile models.Profile
	if err := db.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	// Return full profile data for own profile
	c.JSON(200, gin.H{
		"id":                 userID,
		"profilePictureURL":  profile.ProfilePictureURL,
		"firstName":          profile.FirstName,
		"lastName":           profile.LastName,
		"gender":             profile.Gender,
		"status":             profile.Status,
		"relationshipStatus": profile.RelationshipStatus,
		"aboutMe":            profile.AboutMe,
		"ethnicity":          profile.Ethnicity,
		"religion":           profile.Religion,
		"createdAt":          profile.CreatedAt,
		"updatedAt":          profile.UpdatedAt,
	})
}

// GetMeBioHandler returns current user's bio data
func GetMeBioHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get user's bio data (same logic as GetUserBioHandler but for current user)
	var userHobbies []models.UserHobby
	var userInterests []models.UserInterest
	var userMusic []models.UserMusic
	var userMovies []models.UserMovie
	var userFood []models.UserFood
	var userTravel []models.UserTravel
	var userLanguages []models.UserLanguage

	// Fetch all bio-related data
	db.DB.Where("user_id = ?", userID).Find(&userHobbies)
	db.DB.Where("user_id = ?", userID).Find(&userInterests)
	db.DB.Where("user_id = ?", userID).Find(&userMusic)
	db.DB.Where("user_id = ?", userID).Find(&userMovies)
	db.DB.Where("user_id = ?", userID).Find(&userFood)
	db.DB.Where("user_id = ?", userID).Find(&userTravel)
	db.DB.Where("user_id = ?", userID).Find(&userLanguages)

	// Get the actual names (same logic as GetUserBioHandler)
	var hobbies []string
	var interests []string
	var musicGenres []string
	var movieGenres []string
	var foodPreferences []string
	var travelTypes []string
	var languages []string

	// Extract names (same logic as GetUserBioHandler)
	for _, uh := range userHobbies {
		var hobby models.Hobby
		if err := db.DB.First(&hobby, uh.HobbyID).Error; err == nil {
			hobbies = append(hobbies, hobby.Name)
		}
	}

	for _, ui := range userInterests {
		var interest models.Interest
		if err := db.DB.First(&interest, ui.InterestID).Error; err == nil {
			interests = append(interests, interest.Name)
		}
	}

	for _, um := range userMusic {
		var music models.MusicGenre
		if err := db.DB.First(&music, um.MusicGenreID).Error; err == nil {
			musicGenres = append(musicGenres, music.Name)
		}
	}

	for _, um := range userMovies {
		var movie models.MovieGenre
		if err := db.DB.First(&movie, um.MovieGenreID).Error; err == nil {
			movieGenres = append(movieGenres, movie.Name)
		}
	}

	for _, uf := range userFood {
		var food models.FoodPreference
		if err := db.DB.First(&food, uf.FoodPreferenceID).Error; err == nil {
			foodPreferences = append(foodPreferences, food.Name)
		}
	}

	for _, ut := range userTravel {
		var travel models.TravelType
		if err := db.DB.First(&travel, ut.TravelTypeID).Error; err == nil {
			travelTypes = append(travelTypes, travel.Name)
		}
	}

	for _, ul := range userLanguages {
		var language models.Language
		if err := db.DB.First(&language, ul.LanguageID).Error; err == nil {
			languages = append(languages, language.Name)
		}
	}

	// Return bio data
	c.JSON(200, gin.H{
		"id":              userID,
		"hobbies":         hobbies,
		"interests":       interests,
		"musicGenres":     musicGenres,
		"movieGenres":     movieGenres,
		"foodPreferences": foodPreferences,
		"travelTypes":     travelTypes,
		"languages":       languages,
	})
}
