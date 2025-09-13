// Package middleware provides HTTP middleware functions for the Match-Me application.
// It handles authentication, authorization, and request processing middleware.
package middleware

import (
	"backend/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware creates a Gin middleware function that validates JWT tokens
// for protected routes. It extracts the Bearer token from the Authorization header,
// validates it, and sets the user ID in the request context for use by handlers.
//
// The middleware expects the Authorization header in the format: "Bearer <token>"
// If validation fails, it returns a 401 Unauthorized response and aborts the request.
//
// Returns:
//   - gin.HandlerFunc: The middleware function that can be used with Gin routes
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract Authorization header from the request
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Validate that the header follows the "Bearer <token>" format
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Extract the token by removing the "Bearer " prefix
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate the JWT token and extract user ID
		userID, err := utils.ValidateJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Store the authenticated user ID in the request context
		// This allows handlers to access the user ID without re-validating the token
		c.Set("user_id", userID)
		c.Next() // Continue to the next middleware or handler
	}
}

// GetUserIDFromContext extracts the authenticated user ID from the Gin request context.
// This function is used by handlers to get the user ID that was set by the AuthMiddleware.
//
// Parameters:
//   - c: The Gin context containing the request information
//
// Returns:
//   - uint: The user ID if found and valid
//   - bool: True if the user ID was successfully extracted, false otherwise
func GetUserIDFromContext(c *gin.Context) (uint, bool) {
	// Attempt to get the user_id from the context
	userID, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	// Type assert to uint and return the result
	id, ok := userID.(uint)
	return id, ok
}
