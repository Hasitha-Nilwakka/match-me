package handlers

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ConnectionResponse represents a connection in the API response
type ConnectionResponse struct {
	ID          uint   `json:"id"`
	RequesterID uint   `json:"requesterId"`
	ReceiverID  uint   `json:"receiverId"`
	Status      string `json:"status"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`

	// User details for display
	RequesterName           string `json:"requesterName,omitempty"`
	ReceiverName            string `json:"receiverName,omitempty"`
	RequesterProfilePicture string `json:"requesterProfilePicture,omitempty"`
	ReceiverProfilePicture  string `json:"receiverProfilePicture,omitempty"`
}

// ConnectionsResponse represents the connections list response
type ConnectionsResponse struct {
	Connections []ConnectionResponse `json:"connections"`
	Total       int                  `json:"total"`
}

// toConnectionResponse converts a models.Connection to a ConnectionResponse
func toConnectionResponse(conn models.Connection) ConnectionResponse {
	response := ConnectionResponse{
		ID:          conn.ID,
		RequesterID: conn.RequesterID,
		ReceiverID:  conn.ReceiverID,
		Status:      conn.Status,
		CreatedAt:   conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	if conn.Requester.Profile != nil {
		response.RequesterName = conn.Requester.Profile.FirstName + " " + conn.Requester.Profile.LastName
		response.RequesterProfilePicture = conn.Requester.Profile.ProfilePictureURL
	}
	if conn.Receiver.Profile != nil {
		response.ReceiverName = conn.Receiver.Profile.FirstName + " " + conn.Receiver.Profile.LastName
		response.ReceiverProfilePicture = conn.Receiver.Profile.ProfilePictureURL
	}
	return response
}

// GetConnectionsHandler returns all user connections with profile information
func GetConnectionsHandler(c *gin.Context) {
	// Get current user ID from JWT middleware
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  http.StatusUnauthorized,
			"success": false,
			"data":    gin.H{"error": "User not authenticated"},
		})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Invalid user ID"},
		})
		return
	}

	// Fetch accepted connections for the current user
	var connections []models.Connection
	result := db.DB.Preload("Chat").Where("(requester_id = ? OR receiver_id = ?) AND status = ?",
		userID, userID, "accepted").Find(&connections)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Failed to fetch connections"},
		})
		return
	}

	// Format connections for frontend
	var formattedConnections []gin.H
	for _, conn := range connections {
		// Determine which user is the connected user (not the current user)
		var connectedUserID uint
		if conn.RequesterID == userID {
			connectedUserID = conn.ReceiverID
		} else {
			connectedUserID = conn.RequesterID
		}

		// Get connected user's profile information
		var profile models.Profile
		var user models.User
		var location models.Location

		// Fetch user data
		if err := db.DB.First(&user, connectedUserID).Error; err != nil {
			continue // Skip if user not found
		}

		// Fetch profile data
		if err := db.DB.Where("user_id = ?", connectedUserID).First(&profile).Error; err != nil {
			continue // Skip if profile not found
		}

		// Fetch location data (optional)
		db.DB.Where("user_id = ?", connectedUserID).First(&location)

		// Fetch online status (optional) - handle missing records gracefully with silent mode
		var onlineStatusExists models.OnlineStatus
		err := db.DB.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).
			Where("user_id = ?", connectedUserID).First(&onlineStatusExists).Error
		isOnline := false
		var lastSeen time.Time
		if err == nil {
			// Online status record exists
			isOnline = onlineStatusExists.IsOnline
			lastSeen = onlineStatusExists.LastSeen
		}
		// If error != nil, use default values (isOnline = false, lastSeen = zero time)

		// Get chat ID for this connection
		var chatID interface{}
		if conn.Chat != nil {
			chatID = conn.Chat.ID
		} else {
			chatID = nil
		}

		// Create formatted connection object
		formattedConnection := gin.H{
			"id":             conn.ID,
			"userId":         connectedUserID,
			"firstName":      profile.FirstName,
			"lastName":       profile.LastName,
			"city":           location.City,
			"country":        location.Country,
			"profilePicture": profile.ProfilePictureURL,
			"isOnline":       isOnline,
			"lastSeen":       formatLastSeen(lastSeen),
			"connectionDate": conn.CreatedAt.Format("2006-01-02"),
			"status":         conn.Status,
			"chatId":         chatID,
		}

		formattedConnections = append(formattedConnections, formattedConnection)
	}

	c.JSON(http.StatusOK, gin.H{
		"connections": formattedConnections,
	})
}

// Helper function to format last seen time
func formatLastSeen(lastSeen time.Time) string {
	if lastSeen.IsZero() {
		return "Never"
	}

	now := time.Now()
	duration := now.Sub(lastSeen)

	if duration < time.Minute {
		return "just now"
	} else if duration < time.Hour {
		minutes := int(duration.Minutes())
		if minutes == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", minutes)
	} else if duration < 24*time.Hour {
		hours := int(duration.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	} else {
		days := int(duration.Hours() / 24)
		if days == 1 {
			return "yesterday"
		}
		return fmt.Sprintf("%d days ago", days)
	}
}

// DeleteConnectionHandler handles removing a connection
func DeleteConnectionHandler(c *gin.Context) {
	// Get current user ID from JWT middleware
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  http.StatusUnauthorized,
			"success": false,
			"data":    gin.H{"error": "User not authenticated"},
		})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Invalid user ID"},
		})
		return
	}

	// Get connection ID from URL parameter
	connectionIDStr := c.Param("id")
	connectionID, err := strconv.ParseUint(connectionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  http.StatusBadRequest,
			"success": false,
			"data":    gin.H{"error": "Invalid connection ID"},
		})
		return
	}

	// Find the connection and verify it belongs to the current user
	var connection models.Connection
	result := db.DB.Where("id = ? AND (requester_id = ? OR receiver_id = ?)",
		uint(connectionID), userID, userID).First(&connection)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  http.StatusNotFound,
			"success": false,
			"data":    gin.H{"error": "Connection not found"},
		})
		return
	}

	// Delete the connection
	if err := db.DB.Delete(&connection).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Failed to delete connection"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  http.StatusOK,
		"success": true,
		"data":    gin.H{"message": "Connection removed successfully"},
	})
}

// UpdateConnectionHandler handles updating connection status (accept/reject)
func UpdateConnectionHandler(c *gin.Context) {
	// Get current user ID from JWT middleware
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  http.StatusUnauthorized,
			"success": false,
			"data":    gin.H{"error": "User not authenticated"},
		})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Invalid user ID"},
		})
		return
	}

	// Get connection ID from URL parameter
	connectionIDStr := c.Param("id")
	connectionID, err := strconv.ParseUint(connectionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  http.StatusBadRequest,
			"success": false,
			"data":    gin.H{"error": "Invalid connection ID"},
		})
		return
	}

	// Parse request body
	var updateData struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  http.StatusBadRequest,
			"success": false,
			"data":    gin.H{"error": "Invalid request data"},
		})
		return
	}

	// Validate status values
	if updateData.Status != "accepted" && updateData.Status != "rejected" {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  http.StatusBadRequest,
			"success": false,
			"data":    gin.H{"error": "Invalid status. Must be 'accepted' or 'rejected'"},
		})
		return
	}

	// Find the connection and verify the current user is the recipient
	var connection models.Connection
	result := db.DB.Where("id = ? AND receiver_id = ?",
		uint(connectionID), userID).First(&connection)

	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"status":  http.StatusNotFound,
			"success": false,
			"data":    gin.H{"error": "Connection request not found"},
		})
		return
	}

	// Update the connection status
	connection.Status = updateData.Status
	if err := db.DB.Save(&connection).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Failed to update connection"},
		})
		return
	}

	// If connection is accepted, create a chat
	if updateData.Status == "accepted" {
		// Check if chat already exists for this connection
		var existingChat models.Chat
		if err := db.DB.Where("connection_id = ?", connection.ID).First(&existingChat).Error; err != nil {
			// Chat doesn't exist, create it
			chat := models.Chat{
				ConnectionID: connection.ID,
			}
			if err := db.DB.Create(&chat).Error; err != nil {
				// Log error but don't fail the connection update
				log.Printf("Failed to create chat for connection %d: %v", connection.ID, err)
			} else {
				log.Printf("Created chat %d for accepted connection %d", chat.ID, connection.ID)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  http.StatusOK,
		"success": true,
		"data": gin.H{
			"message":    "Connection updated successfully",
			"connection": connection,
		},
	})
}

// GetConnectionRequestsHandler returns pending connection requests for the current user
func GetConnectionRequestsHandler(c *gin.Context) {
	// Get current user ID from JWT middleware
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"status":  http.StatusUnauthorized,
			"success": false,
			"data":    gin.H{"error": "User not authenticated"},
		})
		return
	}

	userID, ok := userIDInterface.(uint)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Invalid user ID"},
		})
		return
	}

	// Fetch pending connection requests where current user is the recipient
	var requests []models.Connection
	result := db.DB.Where("receiver_id = ? AND status = ?",
		userID, "pending").Find(&requests)

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"status":  http.StatusInternalServerError,
			"success": false,
			"data":    gin.H{"error": "Failed to fetch connection requests"},
		})
		return
	}

	// Format requests for frontend
	var formattedRequests []gin.H
	for _, req := range requests {
		// Get sender's profile information
		var profile models.Profile
		var user models.User
		var location models.Location

		// Fetch user data
		if err := db.DB.First(&user, req.RequesterID).Error; err != nil {
			continue // Skip if user not found
		}

		// Fetch profile data
		if err := db.DB.Where("user_id = ?", req.RequesterID).First(&profile).Error; err != nil {
			continue // Skip if profile not found
		}

		// Fetch location data (optional)
		db.DB.Where("user_id = ?", req.RequesterID).First(&location)

		// Create formatted request object
		formattedRequest := gin.H{
			"id":             req.ID,
			"userId":         req.RequesterID,
			"firstName":      profile.FirstName,
			"lastName":       profile.LastName,
			"city":           location.City,
			"country":        location.Country,
			"profilePicture": profile.ProfilePictureURL,
			"requestDate":    req.CreatedAt.Format("2006-01-02"),
			"status":         req.Status,
		}

		formattedRequests = append(formattedRequests, formattedRequest)
	}

	c.JSON(http.StatusOK, gin.H{
		"requests": formattedRequests,
	})
}

// GetMatchesHandler returns accepted connections (matches) for the current user
func GetMatchesHandler(c *gin.Context) {
	// This is the same as GetConnectionsHandler but with a different endpoint name
	// Call the existing function
	GetConnectionsHandler(c)
}
