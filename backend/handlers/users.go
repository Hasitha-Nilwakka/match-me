package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"log"

	"github.com/gin-gonic/gin"
)

// GetUsersHandler returns all users
func GetAllUsersHandler(c *gin.Context) {
	// Fetch all users from database
	var users []models.User

	if err := db.DB.Find(&users).Error; err != nil {
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

// authorization helpers
func isConnectedOrPending(viewerID, targetID uint) bool {
	var conn models.Connection
	if err := db.DB.Where(
		"((requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?))",
		viewerID, targetID, targetID, viewerID,
	).First(&conn).Error; err != nil {
		return false
	}
	// accepted or pending qualifies
	return conn.Status == "accepted" || conn.Status == "pending"
}

func isCurrentlyRecommended(viewerID, targetID uint) bool {
	// Minimal, performant check: look at last up-to-10 scored results we compute on demand here
	// Reuse getExcludedUserIDs and calculateMatchScore from recommendations.go
	excluded := getExcludedUserIDs(viewerID)
	var candidates []models.User
	if err := db.DB.Where("id NOT IN ? AND is_active = ?", excluded, true).Preload("Profile").
		Preload("Location").Find(&candidates).Error; err != nil {
		return false
	}
	var viewer models.User
	if err := db.DB.Preload("Profile").Preload("Location").Preload("SeekingPreference").
		Preload("UserHobbies").Preload("UserInterests").Preload("UserMusic").
		Preload("UserMovies").Preload("UserFood").Preload("UserTravel").
		Preload("UserLanguages").First(&viewer, viewerID).Error; err != nil {
		return false
	}
	type pair struct {
		id    uint
		score float64
	}
	var scored []pair
	for _, u := range candidates {
		if u.ID == targetID {
			// quick acceptance if positive score
			if calculateMatchScore(viewer, u) > 0 {
				return true
			}
		}
		// keep list short if needed (optional)
	}
	_ = scored
	return false
}

// GetUserHandler enforces access control for viewing other users
func GetUserHandler(c *gin.Context) {
	viewerID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	targetIDParam := c.Param("id")
	var target models.User
	if err := db.DB.Where("id = ? AND is_active = ?", targetIDParam, true).First(&target).Error; err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Allow self
	if target.ID == viewerID {
		c.JSON(200, gin.H{
			"id":        target.ID,
			"createdAt": target.CreatedAt,
			"updatedAt": target.UpdatedAt,
			"isActive":  target.IsActive,
		})
		return
	}

	// Allow if connected or pending
	if isConnectedOrPending(viewerID, target.ID) || isCurrentlyRecommended(viewerID, target.ID) {
		c.JSON(200, gin.H{
			"id":        target.ID,
			"createdAt": target.CreatedAt,
			"updatedAt": target.UpdatedAt,
			"isActive":  target.IsActive,
		})
		return
	}

	// Otherwise 404 per spec
	c.JSON(404, gin.H{"error": "User not found"})
}
