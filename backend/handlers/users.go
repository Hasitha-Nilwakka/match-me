package handlers

import (
	"backend/db"
	"backend/models"
	"log"

	"github.com/gin-gonic/gin"
)

// GetUsersHandler returns all users
func GetAllUsersHandler(c *gin.Context) {
	// Fetch all users from database
	var users []models.User

	// Filter out seeded users (those with @example.com emails) to show only real users
	if err := db.DB.Where("is_active = ? AND email NOT LIKE ?", true, "%@example.com").
		Select("id, email, created_at, updated_at, last_login, is_active").
		Find(&users).Error; err != nil {
		log.Printf("Error fetching users: %v", err)
		c.JSON(500, gin.H{"error": "Failed to fetch users"})
		return
	}

	// Prepare response data (exclude sensitive information)
	var responseUsers []gin.H
	for _, user := range users {
		responseUsers = append(responseUsers, gin.H{
			"id":        user.ID,
			"email":     user.Email,
			"createdAt": user.CreatedAt,
			"updatedAt": user.UpdatedAt,
			"lastLogin": user.LastLogin,
			"isActive":  user.IsActive,
		})
	}

	// Return all users
	c.JSON(200, gin.H{
		"users": responseUsers,
	})
}
