package handlers

import (
	"backend/db"
	"backend/middleware"
	"backend/models"
	"strconv"

	"github.com/gin-gonic/gin"
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
	RequesterName string `json:"requesterName,omitempty"`
	ReceiverName  string `json:"receiverName,omitempty"`
	RequesterProfilePicture string `json:"requesterProfilePicture,omitempty"`
	ReceiverProfilePicture  string `json:"receiverProfilePicture,omitempty"`
}

// ConnectionsResponse represents the connections list response
type ConnectionsResponse struct {
	Connections []ConnectionResponse `json:"connections"`
	Total       int                  `json:"total"`
}

// GetConnectionsHandler returns all connections for the current user
func GetConnectionsHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get all connections where user is either requester or receiver
	var connections []models.Connection
	if err := db.DB.Where("requester_id = ? OR receiver_id = ?", userID, userID).
		Preload("Requester.Profile").Preload("Receiver.Profile").
		Find(&connections).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch connections"})
		return
	}

	// Build response with user details
	var connectionResponses []ConnectionResponse
	for _, conn := range connections {
		response := ConnectionResponse{
			ID:          conn.ID,
			RequesterID: conn.RequesterID,
			ReceiverID:  conn.ReceiverID,
			Status:      conn.Status,
			CreatedAt:   conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:   conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}

		// Add user names and profile pictures
		if conn.Requester.Profile != nil {
			response.RequesterName = conn.Requester.Profile.FirstName + " " + conn.Requester.Profile.LastName
			response.RequesterProfilePicture = conn.Requester.Profile.ProfilePictureURL
		}
		if conn.Receiver.Profile != nil {
			response.ReceiverName = conn.Receiver.Profile.FirstName + " " + conn.Receiver.Profile.LastName
			response.ReceiverProfilePicture = conn.Receiver.Profile.ProfilePictureURL
		}

		connectionResponses = append(connectionResponses, response)
	}

	c.JSON(200, ConnectionsResponse{
		Connections: connectionResponses,
		Total:       len(connectionResponses),
	})
}

// GetConnectionRequestsHandler returns pending connection requests for the current user
func GetConnectionRequestsHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get pending connection requests where user is the receiver
	var connections []models.Connection
	if err := db.DB.Where("receiver_id = ? AND status = ?", userID, "pending").
		Preload("Requester.Profile").
		Find(&connections).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch connection requests"})
		return
	}

	// Build response with requester details
	var connectionResponses []ConnectionResponse
	for _, conn := range connections {
		response := ConnectionResponse{
			ID:          conn.ID,
			RequesterID: conn.RequesterID,
			ReceiverID:  conn.ReceiverID,
			Status:      conn.Status,
			CreatedAt:   conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:   conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}

		// Add requester details
		if conn.Requester.Profile != nil {
			response.RequesterName = conn.Requester.Profile.FirstName + " " + conn.Requester.Profile.LastName
			response.RequesterProfilePicture = conn.Requester.Profile.ProfilePictureURL
		}

		connectionResponses = append(connectionResponses, response)
	}

	c.JSON(200, ConnectionsResponse{
		Connections: connectionResponses,
		Total:       len(connectionResponses),
	})
}

// UpdateConnectionHandler handles accepting, rejecting, or disconnecting
func UpdateConnectionHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get connection ID from URL parameter
	connectionIDStr := c.Param("id")
	connectionID, err := strconv.ParseUint(connectionIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid connection ID"})
		return
	}

	// Parse request body
	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate status
	validStatuses := []string{"accepted", "rejected", "disconnected"}
	if !contains(validStatuses, req.Status) {
		c.JSON(400, gin.H{"error": "Invalid status. Must be: accepted, rejected, or disconnected"})
		return
	}

	// Find the connection
	var connection models.Connection
	if err := db.DB.Where("id = ?", uint(connectionID)).First(&connection).Error; err != nil {
		c.JSON(404, gin.H{"error": "Connection not found"})
		return
	}

	// Check if user has permission to update this connection
	if connection.ReceiverID != userID && connection.RequesterID != userID {
		c.JSON(403, gin.H{"error": "You don't have permission to update this connection"})
		return
	}

	// Check if connection is already in a final state
	if connection.Status == "accepted" || connection.Status == "rejected" {
		c.JSON(409, gin.H{"error": "Connection is already in a final state"})
		return
	}

	// Update connection status
	connection.Status = req.Status
	if err := db.DB.Save(&connection).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to update connection"})
		return
	}

	// If connection is accepted, create a chat
	if req.Status == "accepted" {
		chat := models.Chat{
			ConnectionID: connection.ID,
		}
		if err := db.DB.Create(&chat).Error; err != nil {
			// Log error but don't fail the request
			// The chat can be created later if needed
		}
	}

	c.JSON(200, gin.H{
		"message": "Connection updated successfully",
		"connection": ConnectionResponse{
			ID:          connection.ID,
			RequesterID: connection.RequesterID,
			ReceiverID:  connection.ReceiverID,
			Status:      connection.Status,
			CreatedAt:   connection.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:   connection.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		},
	})
}

// GetMatchesHandler returns accepted connections (matches)
func GetMatchesHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get accepted connections where user is either requester or receiver
	var connections []models.Connection
	if err := db.DB.Where("(requester_id = ? OR receiver_id = ?) AND status = ?", userID, userID, "accepted").
		Preload("Requester.Profile").Preload("Receiver.Profile").
		Find(&connections).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch matches"})
		return
	}

	// Build response with user details
	var connectionResponses []ConnectionResponse
	for _, conn := range connections {
		response := ConnectionResponse{
			ID:          conn.ID,
			RequesterID: conn.RequesterID,
			ReceiverID:  conn.ReceiverID,
			Status:      conn.Status,
			CreatedAt:   conn.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:   conn.UpdatedAt.Format("2006-01-02T15:04:05Z"),
		}

		// Add user names and profile pictures
		if conn.Requester.Profile != nil {
			response.RequesterName = conn.Requester.Profile.FirstName + " " + conn.Requester.Profile.LastName
			response.RequesterProfilePicture = conn.Requester.Profile.ProfilePictureURL
		}
		if conn.Receiver.Profile != nil {
			response.ReceiverName = conn.Receiver.Profile.FirstName + " " + conn.Receiver.Profile.LastName
			response.ReceiverProfilePicture = conn.Receiver.Profile.ProfilePictureURL
		}

		connectionResponses = append(connectionResponses, response)
	}

	c.JSON(200, ConnectionsResponse{
		Connections: connectionResponses,
		Total:       len(connectionResponses),
	})
}

// DeleteConnectionHandler handles disconnecting from a user
func DeleteConnectionHandler(c *gin.Context) {
	userID, exists := middleware.GetUserIDFromContext(c)
	if !exists {
		c.JSON(401, gin.H{"error": "Unauthorized"})
		return
	}

	// Get connection ID from URL parameter
	connectionIDStr := c.Param("id")
	connectionID, err := strconv.ParseUint(connectionIDStr, 10, 32)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid connection ID"})
		return
	}

	// Find the connection
	var connection models.Connection
	if err := db.DB.Where("id = ?", uint(connectionID)).First(&connection).Error; err != nil {
		c.JSON(404, gin.H{"error": "Connection not found"})
		return
	}

	// Check if user has permission to delete this connection
	if connection.ReceiverID != userID && connection.RequesterID != userID {
		c.JSON(403, gin.H{"error": "You don't have permission to delete this connection"})
		return
	}

	// Delete the connection (this will cascade delete the chat and messages)
	if err := db.DB.Delete(&connection).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to delete connection"})
		return
	}

	c.JSON(200, gin.H{
		"message": "Connection deleted successfully",
	})
}

// Helper function to check if a slice contains a string
func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
