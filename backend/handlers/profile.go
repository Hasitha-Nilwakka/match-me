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

// UpdateMeProfileHandler updates current user's profile information
func UpdateMeProfileHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Parse request body
	var updateData struct {
		ProfilePictureURL  *string `json:"profilePictureURL"`
		FirstName          *string `json:"firstName"`
		LastName           *string `json:"lastName"`
		Gender             *string `json:"gender"`
		Status             *string `json:"status"`
		RelationshipStatus *string `json:"relationshipStatus"`
		AboutMe            *string `json:"aboutMe"`
		Ethnicity          *string `json:"ethnicity"`
		Religion           *string `json:"religion"`
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

	// Save profile
	if err := db.DB.Save(&profile).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update profile", "details": err.Error()})
		return
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
