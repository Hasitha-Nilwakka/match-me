package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"fmt"
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
		HobbiesWeight          *int    `json:"hobbiesWeight"`
		InterestsWeight        *int    `json:"interestsWeight"`
		MusicWeight            *int    `json:"musicWeight"`
		MoviesWeight           *int    `json:"moviesWeight"`
		FoodWeight             *int    `json:"foodWeight"`
		TravelWeight           *int    `json:"travelWeight"`
		LanguagesWeight        *int    `json:"languagesWeight"`
		EthnicityWeight        *int    `json:"ethnicityWeight"`
		ReligionWeight         *int    `json:"religionWeight"`
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
	if updateData.HobbiesWeight != nil {
		preferences.HobbiesWeight = *updateData.HobbiesWeight
	}
	if updateData.InterestsWeight != nil {
		preferences.InterestsWeight = *updateData.InterestsWeight
	}
	if updateData.MusicWeight != nil {
		preferences.MusicWeight = *updateData.MusicWeight
	}
	if updateData.MoviesWeight != nil {
		preferences.MoviesWeight = *updateData.MoviesWeight
	}
	if updateData.FoodWeight != nil {
		preferences.FoodWeight = *updateData.FoodWeight
	}
	if updateData.TravelWeight != nil {
		preferences.TravelWeight = *updateData.TravelWeight
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
