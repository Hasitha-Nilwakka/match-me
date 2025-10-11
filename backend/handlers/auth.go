// Package handlers contains HTTP request handlers for the Match-Me dating application.
// It provides handlers for user authentication, profile management, recommendations,
// connections, and real-time chat functionality.
package handlers

import (
	"backend/db"
	"backend/models"
	"backend/utils"
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// RegisterHandler handles user registration
func RegisterHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

	fmt.Println("RegisterHandler called")
	fmt.Println("Request Body:", c.Request.Body)

	// Bind and validate JSON request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(409, gin.H{"error": "User with this email already exists"})
		return
	}

	// Hash the password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Error hashing password: %v", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}

	// Create new user (without relationships to avoid circular dependencies)
	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		IsActive:     true,
	}

	// Save to database (only the user, not relationships)
	if err := db.DB.Omit("Profile", "Location", "SeekingPreference", "ConnectionsFrom", "ConnectionsTo", "Messages", "DismissedFrom", "DismissedTo", "OnlineStatus", "UserHobbies", "UserInterests", "UserMusic", "UserMovies", "UserFood", "UserTravel", "UserLanguages").Create(&user).Error; err != nil {
		log.Printf("Error creating user: %v", err)
		c.JSON(500, gin.H{"error": "Failed to create user"})
		return
	}

	// Return success (don't send sensitive data)
	c.JSON(201, gin.H{
		"message": "User registered successfully",
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"isActive": user.IsActive,
		},
	})
}

// LoginHandler handles user login
func LoginHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	// Bind and validate JSON request
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var user models.User
	if err := db.DB.Where("email = ? AND is_active = ?", req.Email, true).First(&user).Error; err != nil {
		c.JSON(401, gin.H{"error": "Invalid email or password"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(401, gin.H{"error": "Invalid email or password"})
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	db.DB.Save(&user)

	// Set user as online
	var onlineStatus models.OnlineStatus
	err = db.DB.Where("user_id = ?", user.ID).First(&onlineStatus).Error
	switch err {
	case gorm.ErrRecordNotFound:
		// Create new online status record
		onlineStatus = models.OnlineStatus{
			UserID:   user.ID,
			IsOnline: true,
			LastSeen: now,
		}
		if err := db.DB.Create(&onlineStatus).Error; err != nil {
			log.Printf("Error creating online status: %v", err)
		}
	case nil:
		// Update existing online status
		onlineStatus.IsOnline = true
		onlineStatus.LastSeen = now
		if err := db.DB.Save(&onlineStatus).Error; err != nil {
			log.Printf("Error updating online status: %v", err)
		}
	default:
		log.Printf("Error fetching online status: %v", err)
	}

	// Return success with token
	c.JSON(200, gin.H{
		"message": "Login successful",
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"isActive": user.IsActive,
		},
	})
}

// UpdateOnlineStatusHandler updates user's online status
func UpdateOnlineStatusHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		IsOnline bool `json:"isOnline"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	// Update or create online status record
	var onlineStatus models.OnlineStatus
	err := db.DB.Where("user_id = ?", userID).First(&onlineStatus).Error

	if err == gorm.ErrRecordNotFound {
		// Create new online status record
		onlineStatus = models.OnlineStatus{
			UserID:   userID.(uint),
			IsOnline: req.IsOnline,
			LastSeen: time.Now(),
		}
		if err := db.DB.Create(&onlineStatus).Error; err != nil {
			log.Printf("Error creating online status: %v", err)
			c.JSON(500, gin.H{"error": "Failed to update online status"})
			return
		}
	} else if err != nil {
		log.Printf("Error fetching online status: %v", err)
		c.JSON(500, gin.H{"error": "Failed to update online status"})
		return
	} else {
		// Update existing record
		onlineStatus.IsOnline = req.IsOnline
		onlineStatus.LastSeen = time.Now()
		if err := db.DB.Save(&onlineStatus).Error; err != nil {
			log.Printf("Error updating online status: %v", err)
			c.JSON(500, gin.H{"error": "Failed to update online status"})
			return
		}
	}

	c.JSON(200, gin.H{
		"message":  "Online status updated successfully",
		"isOnline": onlineStatus.IsOnline,
		"lastSeen": onlineStatus.LastSeen,
	})
}

// GetOnlineStatusHandler gets online status for a specific user
func GetOnlineStatusHandler(c *gin.Context) {
	userIDParam := c.Param("id")

	// Convert string to uint
	var targetUserID uint
	if _, err := fmt.Sscanf(userIDParam, "%d", &targetUserID); err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user exists
	var user models.User
	if err := db.DB.Where("id = ? AND is_active = ?", targetUserID, true).First(&user).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Get online status
	var onlineStatus models.OnlineStatus
	err := db.DB.Where("user_id = ?", targetUserID).First(&onlineStatus).Error

	isOnline := false
	lastSeen := time.Now()

	if err == nil {
		isOnline = onlineStatus.IsOnline
		lastSeen = onlineStatus.LastSeen
	}
	// If no online status record exists, user is considered offline

	c.JSON(200, gin.H{
		"userId":   targetUserID,
		"isOnline": isOnline,
		"lastSeen": lastSeen,
	})
}

// RefreshTokenHandler handles JWT token refresh
func RefreshTokenHandler(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Verify user still exists and is active
	var user models.User
	if err := db.DB.Where("id = ? AND is_active = ?", userID, true).First(&user).Error; err != nil {
		c.JSON(401, gin.H{"error": "User not found or inactive"})
		return
	}

	// Generate new JWT token
	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		log.Printf("Error generating refresh JWT: %v", err)
		c.JSON(500, gin.H{"error": "Internal server error"})
		return
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	db.DB.Save(&user)

	c.JSON(200, gin.H{
		"message": "Token refreshed successfully",
		"token":   token,
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"isActive": user.IsActive,
		},
	})
}
