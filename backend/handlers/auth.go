package handlers

import (
	"backend/db"
	"backend/models"
	"log"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// RegisterHandler handles user registration
func RegisterHandler(c *gin.Context) {
	var req struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
	}

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

}
