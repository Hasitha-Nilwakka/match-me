package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
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

// GetUserHandler moved to users.go to enforce access control

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

	// Access control: allow self, connection/pending, or currently recommended
	viewerID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	if uint(userID) != viewerID {
		if !(isConnectedOrPending(viewerID, uint(userID)) || isCurrentlyRecommended(viewerID, uint(userID))) {
			// Temporary: Allow all users to view each other for testing
			// c.JSON(404, gin.H{"error": "User not found"})
			// return
		}
	}

	// Get user's profile
	var profile models.Profile
	if err := db.DB.Where("user_id = ?", uint(userID)).First(&profile).Error; err != nil {
		c.JSON(404, gin.H{"error": "Profile not found"})
		return
	}

	// Get user's location data
	var location models.Location
	locationData := gin.H{}
	if err := db.DB.Where("user_id = ?", uint(userID)).First(&location).Error; err == nil {
		// Location data found, include it in response
		locationData = gin.H{
			"city":      location.City,
			"country":   location.Country,
			"latitude":  location.Latitude,
			"longitude": location.Longitude,
		}
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
		"city":               locationData["city"],
		"country":            locationData["country"],
		"latitude":           locationData["latitude"],
		"longitude":          locationData["longitude"],
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

	// Access control: allow self, connection/pending, or currently recommended
	viewerID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}
	if uint(userID) != viewerID {
		if !(isConnectedOrPending(viewerID, uint(userID)) || isCurrentlyRecommended(viewerID, uint(userID))) {
			// Temporary: Allow all users to view each other for testing
			// c.JSON(404, gin.H{"error": "User not found"})
			// return
		}
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

	// Get user's languages
	var userLanguages []models.UserLanguage
	db.DB.Where("user_id = ?", userID).Find(&userLanguages)

	var languages []string
	for _, ul := range userLanguages {
		var language models.Language
		if err := db.DB.First(&language, ul.LanguageID).Error; err == nil {
			languages = append(languages, language.Name)
		}
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
		"languages":          languages,
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

// UpdateMeProfileHandler updates current user's profile information
func UpdateMeProfileHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		ProfilePictureURL  *string   `json:"profilePictureURL"`
		FirstName          *string   `json:"firstName"`
		LastName           *string   `json:"lastName"`
		Gender             *string   `json:"gender"`
		Status             *string   `json:"status"`
		RelationshipStatus *string   `json:"relationshipStatus"`
		AboutMe            *string   `json:"aboutMe"`
		Ethnicity          *string   `json:"ethnicity"`
		Religion           *string   `json:"religion"`
		Languages          *[]string `json:"languages"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Find or create profile
	var profile models.Profile
	result := db.DB.Where("user_id = ?", userID).First(&profile)
	if result.Error != nil {
		// Create new profile if not exists
		profile = models.Profile{
			UserID: userID,
		}
	}

	// Update only provided fields
	if updateData.ProfilePictureURL != nil {
		profile.ProfilePictureURL = *updateData.ProfilePictureURL
	}
	if updateData.FirstName != nil {
		profile.FirstName = *updateData.FirstName
	}
	if updateData.LastName != nil {
		profile.LastName = *updateData.LastName
	}
	if updateData.Gender != nil {
		profile.Gender = updateData.Gender
	}
	if updateData.Status != nil {
		profile.Status = updateData.Status
	}
	if updateData.RelationshipStatus != nil {
		profile.RelationshipStatus = updateData.RelationshipStatus
	}
	if updateData.AboutMe != nil {
		profile.AboutMe = updateData.AboutMe
	}
	if updateData.Ethnicity != nil {
		profile.Ethnicity = updateData.Ethnicity
	}
	if updateData.Religion != nil {
		profile.Religion = updateData.Religion
	}

	// Handle language updates
	if updateData.Languages != nil {
		// Start a transaction for language updates
		tx := db.DB.Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// Delete existing user language relationships
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserLanguage{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update languages", "details": err.Error()})
			return
		}

		// Add new language relationships
		for _, languageName := range *updateData.Languages {
			// Find language by name
			var language models.Language
			if err := tx.Where("name = ?", languageName).First(&language).Error; err != nil {
				// If language doesn't exist, create it
				language = models.Language{
					Name: languageName,
					Code: languageName[:2], // Simple code generation
				}
				if err := tx.Create(&language).Error; err != nil {
					tx.Rollback()
					c.JSON(500, gin.H{"error": "Failed to create language", "details": err.Error()})
					return
				}
			}

			// Create user language relationship
			userLanguage := models.UserLanguage{
				UserID:     userID,
				LanguageID: language.ID,
			}
			if err := tx.Create(&userLanguage).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add language", "details": err.Error()})
				return
			}
		}

		// Commit transaction
		if err := tx.Commit().Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update languages", "details": err.Error()})
			return
		}
	}

	// Save profile
	if err := db.DB.Save(&profile).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update profile", "details": err.Error()})
		return
	}

	// Get updated languages for response
	var userLanguages []models.UserLanguage
	db.DB.Where("user_id = ?", userID).Find(&userLanguages)

	var languages []string
	for _, ul := range userLanguages {
		var language models.Language
		if err := db.DB.First(&language, ul.LanguageID).Error; err == nil {
			languages = append(languages, language.Name)
		}
	}

	c.JSON(200, gin.H{
		"message": "Profile updated successfully",
		"profile": gin.H{
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
			"languages":          languages,
			"updatedAt":          profile.UpdatedAt,
		},
	})
}

// UpdateMeBioHandler updates current user's bio data (interests, hobbies, etc.)
func UpdateMeBioHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		HobbyIDs          []uint `json:"hobbyIds"`
		InterestIDs       []uint `json:"interestIds"`
		MusicGenreIDs     []uint `json:"musicGenreIds"`
		MovieGenreIDs     []uint `json:"movieGenreIds"`
		FoodPreferenceIDs []uint `json:"foodPreferenceIds"`
		TravelTypeIDs     []uint `json:"travelTypeIds"`
		LanguageIDs       []uint `json:"languageIds"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Use transaction to ensure atomicity
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Update hobbies
	if updateData.HobbyIDs != nil {
		// Delete existing hobbies
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserHobby{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update hobbies", "details": err.Error()})
			return
		}
		// Add new hobbies
		for _, hobbyID := range updateData.HobbyIDs {
			userHobby := models.UserHobby{UserID: userID, HobbyID: hobbyID}
			if err := tx.Create(&userHobby).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add hobby", "details": err.Error()})
				return
			}
		}
	}

	// Update interests
	if updateData.InterestIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserInterest{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update interests", "details": err.Error()})
			return
		}
		for _, interestID := range updateData.InterestIDs {
			userInterest := models.UserInterest{UserID: userID, InterestID: interestID}
			if err := tx.Create(&userInterest).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add interest", "details": err.Error()})
				return
			}
		}
	}

	// Update music genres
	if updateData.MusicGenreIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserMusic{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update music genres", "details": err.Error()})
			return
		}
		for _, musicID := range updateData.MusicGenreIDs {
			userMusic := models.UserMusic{UserID: userID, MusicGenreID: musicID}
			if err := tx.Create(&userMusic).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add music genre", "details": err.Error()})
				return
			}
		}
	}

	// Update movie genres
	if updateData.MovieGenreIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserMovie{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update movie genres", "details": err.Error()})
			return
		}
		for _, movieID := range updateData.MovieGenreIDs {
			userMovie := models.UserMovie{UserID: userID, MovieGenreID: movieID}
			if err := tx.Create(&userMovie).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add movie genre", "details": err.Error()})
				return
			}
		}
	}

	// Update food preferences
	if updateData.FoodPreferenceIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserFood{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update food preferences", "details": err.Error()})
			return
		}
		for _, foodID := range updateData.FoodPreferenceIDs {
			userFood := models.UserFood{UserID: userID, FoodPreferenceID: foodID}
			if err := tx.Create(&userFood).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add food preference", "details": err.Error()})
				return
			}
		}
	}

	// Update travel types
	if updateData.TravelTypeIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserTravel{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update travel types", "details": err.Error()})
			return
		}
		for _, travelID := range updateData.TravelTypeIDs {
			userTravel := models.UserTravel{UserID: userID, TravelTypeID: travelID}
			if err := tx.Create(&userTravel).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add travel type", "details": err.Error()})
				return
			}
		}
	}

	// Update languages
	if updateData.LanguageIDs != nil {
		if err := tx.Where("user_id = ?", userID).Delete(&models.UserLanguage{}).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to update languages", "details": err.Error()})
			return
		}
		for _, languageID := range updateData.LanguageIDs {
			userLanguage := models.UserLanguage{UserID: userID, LanguageID: languageID}
			if err := tx.Create(&userLanguage).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to add language", "details": err.Error()})
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to commit bio update", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message": "Bio data updated successfully",
		"updated": gin.H{
			"hobbies":         len(updateData.HobbyIDs),
			"interests":       len(updateData.InterestIDs),
			"musicGenres":     len(updateData.MusicGenreIDs),
			"movieGenres":     len(updateData.MovieGenreIDs),
			"foodPreferences": len(updateData.FoodPreferenceIDs),
			"travelTypes":     len(updateData.TravelTypeIDs),
			"languages":       len(updateData.LanguageIDs),
		},
	})
}

// GetMePreferencesHandler gets current user's seeking preferences
func GetMePreferencesHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	var preferences models.SeekingPreference
	result := db.DB.Where("user_id = ?", userID).First(&preferences)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			// Return default preferences if none exist
			c.JSON(200, gin.H{
				"id":                     userID,
				"minAge":                 18,
				"maxAge":                 99,
				"genderPreference":       nil,
				"statusPreference":       nil,
				"relationshipPreference": nil,
				"locationPreference":     "within_city",
				"maxDistanceKm":          50,
				"hobbyPreference":        nil,
				"interestPreference":     nil,
				"musicPreference":        nil,
				"moviePreference":        nil,
				"foodPreference":         nil,
				"travelPreference":       nil,
				"languagePreference":     nil,
				"ethnicityPreference":    nil,
				"religionPreference":     nil,
				"genderWeight":           2,
				"statusWeight":           2,
				"relationshipWeight":     2,
				"locationWeight":         2,
				"hobbiesWeight":          5,
				"interestsWeight":        5,
				"musicWeight":            3,
				"moviesWeight":           3,
				"foodWeight":             2,
				"travelWeight":           4,
				"languagesWeight":        7,
				"ethnicityWeight":        6,
				"religionWeight":         6,
			})
			return
		}
		c.JSON(500, gin.H{"error": "Failed to get preferences", "details": result.Error.Error()})
		return
	}

	// Convert preference strings back to arrays for frontend
	var interestsPreference []string
	var hobbiesPreference []string
	var foodPreferencesPreference []string
	var musicGenresPreference []string
	var movieGenresPreference []string
	var travelTypesPreference []string
	var languagesPreference []string

	if preferences.InterestPreference != nil && *preferences.InterestPreference != "" {
		interestsPreference = strings.Split(*preferences.InterestPreference, ",")
	}
	if preferences.HobbyPreference != nil && *preferences.HobbyPreference != "" {
		hobbiesPreference = strings.Split(*preferences.HobbyPreference, ",")
	}
	if preferences.FoodPreference != nil && *preferences.FoodPreference != "" {
		foodPreferencesPreference = strings.Split(*preferences.FoodPreference, ",")
	}
	if preferences.MusicPreference != nil && *preferences.MusicPreference != "" {
		musicGenresPreference = strings.Split(*preferences.MusicPreference, ",")
	}
	if preferences.MoviePreference != nil && *preferences.MoviePreference != "" {
		movieGenresPreference = strings.Split(*preferences.MoviePreference, ",")
	}
	if preferences.TravelPreference != nil && *preferences.TravelPreference != "" {
		travelTypesPreference = strings.Split(*preferences.TravelPreference, ",")
	}
	if preferences.LanguagePreference != nil && *preferences.LanguagePreference != "" {
		languagesPreference = strings.Split(*preferences.LanguagePreference, ",")
	}

	c.JSON(200, gin.H{
		"id":                        userID,
		"minAge":                    preferences.MinAge,
		"maxAge":                    preferences.MaxAge,
		"genderPreference":          preferences.GenderPreference,
		"statusPreference":          preferences.StatusPreference,
		"relationshipPreference":    preferences.RelationshipPreference,
		"locationPreference":        preferences.LocationPreference,
		"maxDistanceKm":             preferences.MaxDistanceKm,
		"interestsPreference":       interestsPreference,
		"hobbiesPreference":         hobbiesPreference,
		"foodPreferencesPreference": foodPreferencesPreference,
		"musicGenresPreference":     musicGenresPreference,
		"movieGenresPreference":     movieGenresPreference,
		"travelTypesPreference":     travelTypesPreference,
		"languagesPreference":       languagesPreference,
		"ethnicityPreference":       preferences.EthnicityPreference,
		"religionPreference":        preferences.ReligionPreference,
		"genderWeight":              preferences.GenderWeight,
		"statusWeight":              preferences.StatusWeight,
		"relationshipWeight":        preferences.RelationshipWeight,
		"locationWeight":            preferences.LocationWeight,
		"hobbiesWeight":             preferences.HobbiesWeight,
		"interestsWeight":           preferences.InterestsWeight,
		"musicGenresWeight":         preferences.MusicWeight,
		"movieGenresWeight":         preferences.MoviesWeight,
		"foodPreferencesWeight":     preferences.FoodWeight,
		"travelTypesWeight":         preferences.TravelWeight,
		"languagesWeight":           preferences.LanguagesWeight,
		"ethnicityWeight":           preferences.EthnicityWeight,
		"religionWeight":            preferences.ReligionWeight,
	})
}

// UpdateMePreferencesHandler updates current user's seeking preferences
func UpdateMePreferencesHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		MinAge                 *int    `json:"minAge"`
		MaxAge                 *int    `json:"maxAge"`
		GenderPreference       *string `json:"genderPreference"`
		StatusPreference       *string `json:"statusPreference"`
		RelationshipPreference *string `json:"relationshipPreference"`
		LocationPreference     *string `json:"locationPreference"`
		MaxDistanceKm          *int    `json:"maxDistanceKm"`

		// Preference arrays (what they're looking for)
		InterestsPreference       *[]string `json:"interestsPreference"`
		HobbiesPreference         *[]string `json:"hobbiesPreference"`
		FoodPreferencesPreference *[]string `json:"foodPreferencesPreference"`
		MusicGenresPreference     *[]string `json:"musicGenresPreference"`
		MovieGenresPreference     *[]string `json:"movieGenresPreference"`
		TravelTypesPreference     *[]string `json:"travelTypesPreference"`
		LanguagesPreference       *[]string `json:"languagesPreference"`
		EthnicityPreference       *string   `json:"ethnicityPreference"`
		ReligionPreference        *string   `json:"religionPreference"`

		// Weight values (priority levels)
		GenderWeight          *int `json:"genderWeight"`
		StatusWeight          *int `json:"statusWeight"`
		RelationshipWeight    *int `json:"relationshipWeight"`
		LocationWeight        *int `json:"locationWeight"`
		HobbiesWeight         *int `json:"hobbiesWeight"`
		InterestsWeight       *int `json:"interestsWeight"`
		MusicGenresWeight     *int `json:"musicGenresWeight"`
		MovieGenresWeight     *int `json:"movieGenresWeight"`
		FoodPreferencesWeight *int `json:"foodPreferencesWeight"`
		TravelTypesWeight     *int `json:"travelTypesWeight"`
		LanguagesWeight       *int `json:"languagesWeight"`
		EthnicityWeight       *int `json:"ethnicityWeight"`
		ReligionWeight        *int `json:"religionWeight"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Find or create seeking preference
	var preferences models.SeekingPreference
	result := db.DB.Where("user_id = ?", userID).First(&preferences)
	if result.Error != nil {
		// Create new preferences if not exists
		preferences = models.SeekingPreference{
			UserID: userID,
		}
	}

	// Update only provided fields
	if updateData.MinAge != nil {
		preferences.MinAge = *updateData.MinAge
	}
	if updateData.MaxAge != nil {
		preferences.MaxAge = *updateData.MaxAge
	}
	if updateData.GenderPreference != nil {
		preferences.GenderPreference = updateData.GenderPreference
	}
	if updateData.StatusPreference != nil {
		preferences.StatusPreference = updateData.StatusPreference
	}
	if updateData.RelationshipPreference != nil {
		preferences.RelationshipPreference = updateData.RelationshipPreference
	}
	if updateData.LocationPreference != nil {
		preferences.LocationPreference = *updateData.LocationPreference
	}
	if updateData.MaxDistanceKm != nil {
		preferences.MaxDistanceKm = *updateData.MaxDistanceKm
	}

	// Update preference arrays (convert to comma-separated strings)
	if updateData.InterestsPreference != nil {
		interestsStr := strings.Join(*updateData.InterestsPreference, ",")
		preferences.InterestPreference = &interestsStr
	}
	if updateData.HobbiesPreference != nil {
		hobbiesStr := strings.Join(*updateData.HobbiesPreference, ",")
		preferences.HobbyPreference = &hobbiesStr
	}
	if updateData.FoodPreferencesPreference != nil {
		foodStr := strings.Join(*updateData.FoodPreferencesPreference, ",")
		preferences.FoodPreference = &foodStr
	}
	if updateData.MusicGenresPreference != nil {
		musicStr := strings.Join(*updateData.MusicGenresPreference, ",")
		preferences.MusicPreference = &musicStr
	}
	if updateData.MovieGenresPreference != nil {
		movieStr := strings.Join(*updateData.MovieGenresPreference, ",")
		preferences.MoviePreference = &movieStr
	}
	if updateData.TravelTypesPreference != nil {
		travelStr := strings.Join(*updateData.TravelTypesPreference, ",")
		preferences.TravelPreference = &travelStr
	}
	if updateData.LanguagesPreference != nil {
		languagesStr := strings.Join(*updateData.LanguagesPreference, ",")
		preferences.LanguagePreference = &languagesStr
	}
	if updateData.EthnicityPreference != nil {
		preferences.EthnicityPreference = updateData.EthnicityPreference
	}
	if updateData.ReligionPreference != nil {
		preferences.ReligionPreference = updateData.ReligionPreference
	}

	// Update weight values
	if updateData.GenderWeight != nil {
		preferences.GenderWeight = *updateData.GenderWeight
	}
	if updateData.StatusWeight != nil {
		preferences.StatusWeight = *updateData.StatusWeight
	}
	if updateData.RelationshipWeight != nil {
		preferences.RelationshipWeight = *updateData.RelationshipWeight
	}
	if updateData.LocationWeight != nil {
		preferences.LocationWeight = *updateData.LocationWeight
	}
	if updateData.HobbiesWeight != nil {
		preferences.HobbiesWeight = *updateData.HobbiesWeight
	}
	if updateData.InterestsWeight != nil {
		preferences.InterestsWeight = *updateData.InterestsWeight
	}
	if updateData.MusicGenresWeight != nil {
		preferences.MusicWeight = *updateData.MusicGenresWeight
	}
	if updateData.MovieGenresWeight != nil {
		preferences.MoviesWeight = *updateData.MovieGenresWeight
	}
	if updateData.FoodPreferencesWeight != nil {
		preferences.FoodWeight = *updateData.FoodPreferencesWeight
	}
	if updateData.TravelTypesWeight != nil {
		preferences.TravelWeight = *updateData.TravelTypesWeight
	}
	if updateData.LanguagesWeight != nil {
		preferences.LanguagesWeight = *updateData.LanguagesWeight
	}
	if updateData.EthnicityWeight != nil {
		preferences.EthnicityWeight = *updateData.EthnicityWeight
	}
	if updateData.ReligionWeight != nil {
		preferences.ReligionWeight = *updateData.ReligionWeight
	}

	// Save preferences
	if err := db.DB.Save(&preferences).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update preferences", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message": "Preferences updated successfully",
		"preferences": gin.H{
			"id":                     userID,
			"minAge":                 preferences.MinAge,
			"maxAge":                 preferences.MaxAge,
			"genderPreference":       preferences.GenderPreference,
			"statusPreference":       preferences.StatusPreference,
			"relationshipPreference": preferences.RelationshipPreference,
			"locationPreference":     preferences.LocationPreference,
			"maxDistanceKm":          preferences.MaxDistanceKm,
			"hobbiesWeight":          preferences.HobbiesWeight,
			"interestsWeight":        preferences.InterestsWeight,
			"musicWeight":            preferences.MusicWeight,
			"moviesWeight":           preferences.MoviesWeight,
			"foodWeight":             preferences.FoodWeight,
			"travelWeight":           preferences.TravelWeight,
			"languagesWeight":        preferences.LanguagesWeight,
			"ethnicityWeight":        preferences.EthnicityWeight,
			"religionWeight":         preferences.ReligionWeight,
			"updatedAt":              preferences.UpdatedAt,
		},
	})
}

// GetAllLanguagesHandler returns all available languages from the database
func GetAllLanguagesHandler(c *gin.Context) {
	var languages []models.Language
	if err := db.DB.Find(&languages).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch languages", "details": err.Error()})
		return
	}

	// Convert to simple name array for frontend
	var languageNames []string
	for _, lang := range languages {
		languageNames = append(languageNames, lang.Name)
	}

	c.JSON(200, gin.H{
		"languages": languageNames,
	})
}

// GetAllHobbiesHandler returns all available hobbies from the database
func GetAllHobbiesHandler(c *gin.Context) {
	var hobbies []models.Hobby
	if err := db.DB.Find(&hobbies).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch hobbies", "details": err.Error()})
		return
	}

	// Convert to simple name array for frontend
	var hobbyNames []string
	for _, hobby := range hobbies {
		hobbyNames = append(hobbyNames, hobby.Name)
	}

	c.JSON(200, gin.H{
		"hobbies": hobbyNames,
	})
}

// GetAllInterestsHandler returns all available interests from the database
func GetAllInterestsHandler(c *gin.Context) {
	var interests []models.Interest
	if err := db.DB.Find(&interests).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch interests", "details": err.Error()})
		return
	}

	var interestNames []string
	for _, interest := range interests {
		interestNames = append(interestNames, interest.Name)
	}

	c.JSON(200, gin.H{
		"interests": interestNames,
	})
}

// GetAllFoodPreferencesHandler returns all available food preferences from the database
func GetAllFoodPreferencesHandler(c *gin.Context) {
	var foodPreferences []models.FoodPreference
	if err := db.DB.Find(&foodPreferences).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch food preferences", "details": err.Error()})
		return
	}

	var foodNames []string
	for _, food := range foodPreferences {
		foodNames = append(foodNames, food.Name)
	}

	c.JSON(200, gin.H{
		"foodPreferences": foodNames,
	})
}

// GetAllMusicGenresHandler returns all available music genres from the database
func GetAllMusicGenresHandler(c *gin.Context) {
	var musicGenres []models.MusicGenre
	if err := db.DB.Find(&musicGenres).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch music genres", "details": err.Error()})
		return
	}

	var musicNames []string
	for _, music := range musicGenres {
		musicNames = append(musicNames, music.Name)
	}

	c.JSON(200, gin.H{
		"musicGenres": musicNames,
	})
}

// GetAllMovieGenresHandler returns all available movie genres from the database
func GetAllMovieGenresHandler(c *gin.Context) {
	var movieGenres []models.MovieGenre
	if err := db.DB.Find(&movieGenres).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch movie genres", "details": err.Error()})
		return
	}

	var movieNames []string
	for _, movie := range movieGenres {
		movieNames = append(movieNames, movie.Name)
	}

	c.JSON(200, gin.H{
		"movieGenres": movieNames,
	})
}

// GetAllTravelTypesHandler returns all available travel types from the database
func GetAllTravelTypesHandler(c *gin.Context) {
	var travelTypes []models.TravelType
	if err := db.DB.Find(&travelTypes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch travel types", "details": err.Error()})
		return
	}

	var travelNames []string
	for _, travel := range travelTypes {
		travelNames = append(travelNames, travel.Name)
	}

	c.JSON(200, gin.H{
		"travelTypes": travelNames,
	})
}

// UpdateMeLocationHandler updates current user's location information
func UpdateMeLocationHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		City      *string  `json:"city"`
		Country   *string  `json:"country"`
		Latitude  *float64 `json:"latitude"`
		Longitude *float64 `json:"longitude"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Debug logging
	fmt.Printf("Received location update data: %+v\n", updateData)

	// Find or create location
	var location models.Location
	result := db.DB.Where("user_id = ?", userID).First(&location)
	if result.Error != nil {
		// Create new location if not exists
		location = models.Location{
			UserID: userID,
		}
	}

	// Update only provided fields
	if updateData.City != nil {
		location.City = updateData.City
	}
	if updateData.Country != nil {
		location.Country = updateData.Country
	}
	if updateData.Latitude != nil {
		location.Latitude = updateData.Latitude
	}
	if updateData.Longitude != nil {
		location.Longitude = updateData.Longitude
	}

	// Save location
	if err := db.DB.Save(&location).Error; err != nil {
		fmt.Printf("Database error saving location: %v\n", err)
		c.JSON(500, gin.H{"error": "Failed to update location", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message": "Location updated successfully",
		"location": gin.H{
			"id":        location.ID,
			"city":      location.City,
			"country":   location.Country,
			"latitude":  location.Latitude,
			"longitude": location.Longitude,
			"updatedAt": location.UpdatedAt,
		},
	})
}

// GetMeLocationHandler returns current user's location information
func GetMeLocationHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get user's location
	var location models.Location
	if err := db.DB.Where("user_id = ?", userID).First(&location).Error; err != nil {
		c.JSON(404, gin.H{"error": "Location not found"})
		return
	}

	c.JSON(200, gin.H{
		"id":        location.ID,
		"city":      location.City,
		"country":   location.Country,
		"latitude":  location.Latitude,
		"longitude": location.Longitude,
		"createdAt": location.CreatedAt,
		"updatedAt": location.UpdatedAt,
	})
}

// UpdateMeBiographicalDataHandler updates current user's biographical data
func UpdateMeBiographicalDataHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		Interests       []string `json:"interests"`
		Hobbies         []string `json:"hobbies"`
		FoodPreferences []string `json:"foodPreferences"`
		MusicGenres     []string `json:"musicGenres"`
		MovieGenres     []string `json:"movieGenres"`
		TravelTypes     []string `json:"travelTypes"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Debug logging
	fmt.Printf("Received biographical data: %+v\n", updateData)

	// Start transaction
	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Clear existing biographical data
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserInterest{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing interests", "details": err.Error()})
		return
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserHobby{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing hobbies", "details": err.Error()})
		return
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserFood{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing food preferences", "details": err.Error()})
		return
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserMusic{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing music preferences", "details": err.Error()})
		return
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserMovie{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing movie preferences", "details": err.Error()})
		return
	}
	if err := tx.Where("user_id = ?", userID).Delete(&models.UserTravel{}).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to clear existing travel preferences", "details": err.Error()})
		return
	}

	// Save interests
	for _, interestName := range updateData.Interests {
		var interest models.Interest
		if err := tx.Where("name = ?", interestName).First(&interest).Error; err != nil {
			// Create interest if it doesn't exist
			interest = models.Interest{Name: interestName}
			if err := tx.Create(&interest).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create interest", "details": err.Error()})
				return
			}
		}
		userInterest := models.UserInterest{UserID: userID, InterestID: interest.ID}
		if err := tx.Create(&userInterest).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user interest", "details": err.Error()})
			return
		}
	}

	// Save hobbies
	for _, hobbyName := range updateData.Hobbies {
		var hobby models.Hobby
		if err := tx.Where("name = ?", hobbyName).First(&hobby).Error; err != nil {
			// Create hobby if it doesn't exist
			hobby = models.Hobby{Name: hobbyName}
			if err := tx.Create(&hobby).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create hobby", "details": err.Error()})
				return
			}
		}
		userHobby := models.UserHobby{UserID: userID, HobbyID: hobby.ID}
		if err := tx.Create(&userHobby).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user hobby", "details": err.Error()})
			return
		}
	}

	// Save food preferences
	for _, foodName := range updateData.FoodPreferences {
		var food models.FoodPreference
		if err := tx.Where("name = ?", foodName).First(&food).Error; err != nil {
			// Create food preference if it doesn't exist
			food = models.FoodPreference{Name: foodName}
			if err := tx.Create(&food).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create food preference", "details": err.Error()})
				return
			}
		}
		userFood := models.UserFood{UserID: userID, FoodPreferenceID: food.ID}
		if err := tx.Create(&userFood).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user food preference", "details": err.Error()})
			return
		}
	}

	// Save music genres
	for _, musicName := range updateData.MusicGenres {
		var music models.MusicGenre
		if err := tx.Where("name = ?", musicName).First(&music).Error; err != nil {
			// Create music genre if it doesn't exist
			music = models.MusicGenre{Name: musicName}
			if err := tx.Create(&music).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create music genre", "details": err.Error()})
				return
			}
		}
		userMusic := models.UserMusic{UserID: userID, MusicGenreID: music.ID}
		if err := tx.Create(&userMusic).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user music genre", "details": err.Error()})
			return
		}
	}

	// Save movie genres
	for _, movieName := range updateData.MovieGenres {
		var movie models.MovieGenre
		if err := tx.Where("name = ?", movieName).First(&movie).Error; err != nil {
			// Create movie genre if it doesn't exist
			movie = models.MovieGenre{Name: movieName}
			if err := tx.Create(&movie).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create movie genre", "details": err.Error()})
				return
			}
		}
		userMovie := models.UserMovie{UserID: userID, MovieGenreID: movie.ID}
		if err := tx.Create(&userMovie).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user movie genre", "details": err.Error()})
			return
		}
	}

	// Save travel types
	for _, travelName := range updateData.TravelTypes {
		var travel models.TravelType
		if err := tx.Where("name = ?", travelName).First(&travel).Error; err != nil {
			// Create travel type if it doesn't exist
			travel = models.TravelType{Name: travelName}
			if err := tx.Create(&travel).Error; err != nil {
				tx.Rollback()
				c.JSON(500, gin.H{"error": "Failed to create travel type", "details": err.Error()})
				return
			}
		}
		userTravel := models.UserTravel{UserID: userID, TravelTypeID: travel.ID}
		if err := tx.Create(&userTravel).Error; err != nil {
			tx.Rollback()
			c.JSON(500, gin.H{"error": "Failed to save user travel type", "details": err.Error()})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to save biographical data", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message": "Biographical data saved successfully",
		"data": gin.H{
			"interests":       updateData.Interests,
			"hobbies":         updateData.Hobbies,
			"foodPreferences": updateData.FoodPreferences,
			"musicGenres":     updateData.MusicGenres,
			"movieGenres":     updateData.MovieGenres,
			"travelTypes":     updateData.TravelTypes,
		},
	})
}

// GetMeBiographicalDataHandler retrieves current user's biographical data
func GetMeBiographicalDataHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get interests using raw SQL join
	var interests []string
	if err := db.DB.Raw(`
		SELECT i.name 
		FROM interests i 
		INNER JOIN user_interests ui ON i.id = ui.interest_id 
		WHERE ui.user_id = ?
	`, userID).Scan(&interests).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch interests", "details": err.Error()})
		return
	}

	// Get hobbies using raw SQL join
	var hobbies []string
	if err := db.DB.Raw(`
		SELECT h.name 
		FROM hobbies h 
		INNER JOIN user_hobbies uh ON h.id = uh.hobby_id 
		WHERE uh.user_id = ?
	`, userID).Scan(&hobbies).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch hobbies", "details": err.Error()})
		return
	}

	// Get food preferences using raw SQL join
	var foodPreferences []string
	if err := db.DB.Raw(`
		SELECT fp.name 
		FROM food_preferences fp 
		INNER JOIN user_food uf ON fp.id = uf.food_preference_id 
		WHERE uf.user_id = ?
	`, userID).Scan(&foodPreferences).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch food preferences", "details": err.Error()})
		return
	}

	// Get music genres using raw SQL join
	var musicGenres []string
	if err := db.DB.Raw(`
		SELECT mg.name 
		FROM music_genres mg 
		INNER JOIN user_music um ON mg.id = um.music_genre_id 
		WHERE um.user_id = ?
	`, userID).Scan(&musicGenres).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch music genres", "details": err.Error()})
		return
	}

	// Get movie genres using raw SQL join
	var movieGenres []string
	if err := db.DB.Raw(`
		SELECT mg.name 
		FROM movie_genres mg 
		INNER JOIN user_movies um ON mg.id = um.movie_genre_id 
		WHERE um.user_id = ?
	`, userID).Scan(&movieGenres).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch movie genres", "details": err.Error()})
		return
	}

	// Get travel types using raw SQL join
	var travelTypes []string
	if err := db.DB.Raw(`
		SELECT tt.name 
		FROM travel_types tt 
		INNER JOIN user_travel ut ON tt.id = ut.travel_type_id 
		WHERE ut.user_id = ?
	`, userID).Scan(&travelTypes).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch travel types", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"interests":       interests,
		"hobbies":         hobbies,
		"foodPreferences": foodPreferences,
		"musicGenres":     musicGenres,
		"movieGenres":     movieGenres,
		"travelTypes":     travelTypes,
	})
}

// UpdateMeSeekingPreferencesHandler updates current user's seeking preferences
func UpdateMeSeekingPreferencesHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		GenderPreference       *string `json:"genderPreference"`
		StatusPreference       *string `json:"statusPreference"`
		RelationshipPreference *string `json:"relationshipPreference"`
		LocationPreference     string  `json:"locationPreference"`

		// Single preference values
		EthnicityPreference *string `json:"ethnicityPreference"`
		ReligionPreference  *string `json:"religionPreference"`

		// Multiple preference values (what they're looking for)
		InterestsPreference       []string `json:"interestsPreference"`
		HobbiesPreference         []string `json:"hobbiesPreference"`
		FoodPreferencesPreference []string `json:"foodPreferencesPreference"`
		MusicGenresPreference     []string `json:"musicGenresPreference"`
		MovieGenresPreference     []string `json:"movieGenresPreference"`
		TravelTypesPreference     []string `json:"travelTypesPreference"`
		LanguagesPreference       []string `json:"languagesPreference"`

		// Weight values (priority levels)
		GenderWeight          int `json:"genderWeight"`
		StatusWeight          int `json:"statusWeight"`
		RelationshipWeight    int `json:"relationshipWeight"`
		LocationWeight        int `json:"locationWeight"`
		LanguagesWeight       int `json:"languagesWeight"`
		InterestsWeight       int `json:"interestsWeight"`
		HobbiesWeight         int `json:"hobbiesWeight"`
		FoodPreferencesWeight int `json:"foodPreferencesWeight"`
		MusicGenresWeight     int `json:"musicGenresWeight"`
		MovieGenresWeight     int `json:"movieGenresWeight"`
		TravelTypesWeight     int `json:"travelTypesWeight"`
		EthnicityWeight       int `json:"ethnicityWeight"`
		ReligionWeight        int `json:"religionWeight"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Debug logging
	fmt.Printf("Received seeking preferences: %+v\n", updateData)

	// Find or create seeking preference
	var seekingPreference models.SeekingPreference
	result := db.DB.Where("user_id = ?", userID).First(&seekingPreference)
	if result.Error != nil {
		// Create new seeking preference if not exists
		seekingPreference = models.SeekingPreference{
			UserID: userID,
		}
	}

	// Update the seeking preference
	seekingPreference.GenderPreference = updateData.GenderPreference
	seekingPreference.StatusPreference = updateData.StatusPreference
	seekingPreference.RelationshipPreference = updateData.RelationshipPreference
	seekingPreference.LocationPreference = updateData.LocationPreference

	// Update single preference values
	seekingPreference.EthnicityPreference = updateData.EthnicityPreference
	seekingPreference.ReligionPreference = updateData.ReligionPreference

	// Update multiple preference values (stored as JSON strings)
	if len(updateData.InterestsPreference) > 0 {
		interestsJSON, _ := json.Marshal(updateData.InterestsPreference)
		interestsStr := string(interestsJSON)
		seekingPreference.InterestPreference = &interestsStr
	} else {
		seekingPreference.InterestPreference = nil
	}

	if len(updateData.HobbiesPreference) > 0 {
		hobbiesJSON, _ := json.Marshal(updateData.HobbiesPreference)
		hobbiesStr := string(hobbiesJSON)
		seekingPreference.HobbyPreference = &hobbiesStr
	} else {
		seekingPreference.HobbyPreference = nil
	}

	if len(updateData.FoodPreferencesPreference) > 0 {
		foodJSON, _ := json.Marshal(updateData.FoodPreferencesPreference)
		foodStr := string(foodJSON)
		seekingPreference.FoodPreference = &foodStr
	} else {
		seekingPreference.FoodPreference = nil
	}

	if len(updateData.MusicGenresPreference) > 0 {
		musicJSON, _ := json.Marshal(updateData.MusicGenresPreference)
		musicStr := string(musicJSON)
		seekingPreference.MusicPreference = &musicStr
	} else {
		seekingPreference.MusicPreference = nil
	}

	if len(updateData.MovieGenresPreference) > 0 {
		movieJSON, _ := json.Marshal(updateData.MovieGenresPreference)
		movieStr := string(movieJSON)
		seekingPreference.MoviePreference = &movieStr
	} else {
		seekingPreference.MoviePreference = nil
	}

	if len(updateData.TravelTypesPreference) > 0 {
		travelJSON, _ := json.Marshal(updateData.TravelTypesPreference)
		travelStr := string(travelJSON)
		seekingPreference.TravelPreference = &travelStr
	} else {
		seekingPreference.TravelPreference = nil
	}

	if len(updateData.LanguagesPreference) > 0 {
		languagesJSON, _ := json.Marshal(updateData.LanguagesPreference)
		languagesStr := string(languagesJSON)
		seekingPreference.LanguagePreference = &languagesStr
	} else {
		seekingPreference.LanguagePreference = nil
	}

	// Update weight values (priority levels)
	seekingPreference.GenderWeight = updateData.GenderWeight
	seekingPreference.StatusWeight = updateData.StatusWeight
	seekingPreference.RelationshipWeight = updateData.RelationshipWeight
	seekingPreference.LocationWeight = updateData.LocationWeight
	seekingPreference.LanguagesWeight = updateData.LanguagesWeight
	seekingPreference.InterestsWeight = updateData.InterestsWeight
	seekingPreference.HobbiesWeight = updateData.HobbiesWeight
	seekingPreference.FoodWeight = updateData.FoodPreferencesWeight
	seekingPreference.MusicWeight = updateData.MusicGenresWeight
	seekingPreference.MoviesWeight = updateData.MovieGenresWeight
	seekingPreference.TravelWeight = updateData.TravelTypesWeight
	seekingPreference.EthnicityWeight = updateData.EthnicityWeight
	seekingPreference.ReligionWeight = updateData.ReligionWeight

	// Save to database
	if err := db.DB.Save(&seekingPreference).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to save seeking preferences", "details": err.Error()})
		return
	}

	c.JSON(200, gin.H{
		"message": "Seeking preferences saved successfully",
		"data": gin.H{
			"genderPreference":       seekingPreference.GenderPreference,
			"statusPreference":       seekingPreference.StatusPreference,
			"relationshipPreference": seekingPreference.RelationshipPreference,
			"locationPreference":     seekingPreference.LocationPreference,
			"hobbiesWeight":          seekingPreference.HobbiesWeight,
			"interestsWeight":        seekingPreference.InterestsWeight,
			"musicWeight":            seekingPreference.MusicWeight,
			"moviesWeight":           seekingPreference.MoviesWeight,
			"foodWeight":             seekingPreference.FoodWeight,
			"travelWeight":           seekingPreference.TravelWeight,
			"languagesWeight":        seekingPreference.LanguagesWeight,
			"ethnicityWeight":        seekingPreference.EthnicityWeight,
			"religionWeight":         seekingPreference.ReligionWeight,
		},
	})
}

// GetMeSeekingPreferencesHandler retrieves the current user's seeking preferences
func GetMeSeekingPreferencesHandler(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get seeking preferences from database
	var seekingPreference models.SeekingPreference
	if err := db.DB.Where("user_id = ?", userID).First(&seekingPreference).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Return default values if no seeking preferences exist
			c.JSON(200, gin.H{
				"genderPreference":       nil,
				"statusPreference":       nil,
				"relationshipPreference": nil,
				"locationPreference":     "within_city",

				// Single preference values
				"ethnicityPreference": nil,
				"religionPreference":  nil,

				// Multiple preference values (empty arrays by default)
				"interestsPreference":       []string{},
				"hobbiesPreference":         []string{},
				"foodPreferencesPreference": []string{},
				"musicGenresPreference":     []string{},
				"movieGenresPreference":     []string{},
				"travelTypesPreference":     []string{},
				"languagesPreference":       []string{},

				// Weight values (priority levels)
				"genderWeight":          2,
				"statusWeight":          2,
				"relationshipWeight":    2,
				"locationWeight":        2,
				"languagesWeight":       2,
				"interestsWeight":       2,
				"hobbiesWeight":         2,
				"foodPreferencesWeight": 2,
				"musicGenresWeight":     2,
				"movieGenresWeight":     2,
				"travelTypesWeight":     2,
				"ethnicityWeight":       2,
				"religionWeight":        2,
			})
			return
		}
		c.JSON(500, gin.H{"error": "Failed to retrieve seeking preferences"})
		return
	}

	// Parse JSON strings back to arrays for multiple selections
	var interestsPreference []string
	var hobbiesPreference []string
	var foodPreferencesPreference []string
	var musicGenresPreference []string
	var movieGenresPreference []string
	var travelTypesPreference []string
	var languagesPreference []string

	if seekingPreference.InterestPreference != nil {
		json.Unmarshal([]byte(*seekingPreference.InterestPreference), &interestsPreference)
	}
	if seekingPreference.HobbyPreference != nil {
		json.Unmarshal([]byte(*seekingPreference.HobbyPreference), &hobbiesPreference)
	}
	if seekingPreference.FoodPreference != nil {
		json.Unmarshal([]byte(*seekingPreference.FoodPreference), &foodPreferencesPreference)
	}
	if seekingPreference.MusicPreference != nil {
		json.Unmarshal([]byte(*seekingPreference.MusicPreference), &musicGenresPreference)
	}
	if seekingPreference.MoviePreference != nil {
		json.Unmarshal([]byte(*seekingPreference.MoviePreference), &movieGenresPreference)
	}
	if seekingPreference.TravelPreference != nil {
		json.Unmarshal([]byte(*seekingPreference.TravelPreference), &travelTypesPreference)
	}
	if seekingPreference.LanguagePreference != nil {
		json.Unmarshal([]byte(*seekingPreference.LanguagePreference), &languagesPreference)
	}

	// Return seeking preferences
	c.JSON(200, gin.H{
		"genderPreference":       seekingPreference.GenderPreference,
		"statusPreference":       seekingPreference.StatusPreference,
		"relationshipPreference": seekingPreference.RelationshipPreference,
		"locationPreference":     seekingPreference.LocationPreference,

		// Single preference values
		"ethnicityPreference": seekingPreference.EthnicityPreference,
		"religionPreference":  seekingPreference.ReligionPreference,

		// Multiple preference values (parsed from JSON)
		"interestsPreference":       interestsPreference,
		"hobbiesPreference":         hobbiesPreference,
		"foodPreferencesPreference": foodPreferencesPreference,
		"musicGenresPreference":     musicGenresPreference,
		"movieGenresPreference":     movieGenresPreference,
		"travelTypesPreference":     travelTypesPreference,
		"languagesPreference":       languagesPreference,

		// Weight values (priority levels)
		"genderWeight":          seekingPreference.GenderWeight,
		"statusWeight":          seekingPreference.StatusWeight,
		"relationshipWeight":    seekingPreference.RelationshipWeight,
		"locationWeight":        seekingPreference.LocationWeight,
		"languagesWeight":       seekingPreference.LanguagesWeight,
		"interestsWeight":       seekingPreference.InterestsWeight,
		"hobbiesWeight":         seekingPreference.HobbiesWeight,
		"foodPreferencesWeight": seekingPreference.FoodWeight,
		"musicGenresWeight":     seekingPreference.MusicWeight,
		"movieGenresWeight":     seekingPreference.MoviesWeight,
		"travelTypesWeight":     seekingPreference.TravelWeight,
		"ethnicityWeight":       seekingPreference.EthnicityWeight,
		"religionWeight":        seekingPreference.ReligionWeight,
	})
}

// UploadProfilePictureHandler handles profile picture uploads
func UploadProfilePictureHandler(c *gin.Context) {
	fmt.Println("UploadProfilePictureHandler called")

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Println("User not authenticated")
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("User ID: %v\n", userID)

	// Parse multipart form with 10MB max memory
	err := c.Request.ParseMultipartForm(10 << 20) // 10MB
	if err != nil {
		fmt.Printf("Failed to parse multipart form: %v\n", err)
		c.JSON(400, gin.H{"error": "Failed to parse multipart form", "details": err.Error()})
		return
	}

	fmt.Println("Multipart form parsed successfully")

	// Get the uploaded file
	file, header, err := c.Request.FormFile("profilePicture")
	if err != nil {
		fmt.Printf("No file uploaded: %v\n", err)
		c.JSON(400, gin.H{"error": "No file uploaded", "details": err.Error()})
		return
	}
	defer file.Close()

	fmt.Printf("File received: %s, Size: %d\n", header.Filename, header.Size)

	// Validate file type
	contentType := header.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		c.JSON(400, gin.H{"error": "File must be an image"})
		return
	}

	// Validate file size (5MB max)
	if header.Size > 5*1024*1024 {
		c.JSON(400, gin.H{"error": "File size must be less than 5MB"})
		return
	}

	// Generate unique filename
	fileExt := filepath.Ext(header.Filename)
	fileName := fmt.Sprintf("profile_%d_%d%s", userID, time.Now().Unix(), fileExt)

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads/profile_pictures"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(500, gin.H{"error": "Failed to create upload directory", "details": err.Error()})
		return
	}

	// Save file to disk
	filePath := filepath.Join(uploadDir, fileName)
	dst, err := os.Create(filePath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to create file", "details": err.Error()})
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file", "details": err.Error()})
		return
	}

	// Generate URL for the uploaded file
	profilePictureURL := fmt.Sprintf("/uploads/profile_pictures/%s", fileName)

	// Update profile in database
	var profile models.Profile
	if err := db.DB.Where("user_id = ?", userID).First(&profile).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new profile if it doesn't exist
			profile = models.Profile{
				UserID:            userID.(uint),
				ProfilePictureURL: profilePictureURL,
			}
			if err := db.DB.Create(&profile).Error; err != nil {
				c.JSON(500, gin.H{"error": "Failed to create profile", "details": err.Error()})
				return
			}
		} else {
			c.JSON(500, gin.H{"error": "Failed to find profile", "details": err.Error()})
			return
		}
	} else {
		// Update existing profile
		profile.ProfilePictureURL = profilePictureURL
		if err := db.DB.Save(&profile).Error; err != nil {
			c.JSON(500, gin.H{"error": "Failed to update profile", "details": err.Error()})
			return
		}
	}

	c.JSON(200, gin.H{
		"message":           "Profile picture uploaded successfully",
		"profilePictureURL": profilePictureURL,
	})
}

// ChangePasswordHandler handles password changes
func ChangePasswordHandler(c *gin.Context) {
	fmt.Println("ChangePasswordHandler called")

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Println("User not authenticated")
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("User ID: %v\n", userID)

	// Parse request body
	var requestData struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate new password length
	if len(requestData.NewPassword) < 6 {
		c.JSON(400, gin.H{"error": "New password must be at least 6 characters long"})
		return
	}

	// Get user from database
	var user models.User
	if err := db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(requestData.CurrentPassword)); err != nil {
		c.JSON(400, gin.H{"error": "Current password is incorrect"})
		return
	}

	// Hash new password
	newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(requestData.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to hash new password"})
		return
	}

	// Update password in database
	user.PasswordHash = string(newPasswordHash)
	if err := db.DB.Save(&user).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update password"})
		return
	}

	fmt.Println("Password changed successfully for user:", userID)
	c.JSON(200, gin.H{"message": "Password changed successfully"})
}

// DeleteProfileHandler handles profile deletion
func DeleteProfileHandler(c *gin.Context) {
	fmt.Println("DeleteProfileHandler called")

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		fmt.Println("User not authenticated")
		c.JSON(401, gin.H{"error": "User not authenticated"})
		return
	}

	fmt.Printf("User ID: %v\n", userID)

	// Parse request body
	var requestData struct {
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Get user from database
	var user models.User
	if err := db.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(requestData.Password)); err != nil {
		c.JSON(400, gin.H{"error": "Password is incorrect"})
		return
	}

	// Start transaction for cascading deletion
	tx := db.DB.Begin()
	if tx.Error != nil {
		c.JSON(500, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Delete user and all related data (cascading delete)
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(500, gin.H{"error": "Failed to delete profile"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to commit deletion"})
		return
	}

	fmt.Println("Profile deleted successfully for user:", userID)
	c.JSON(200, gin.H{"message": "Profile deleted successfully"})
}
