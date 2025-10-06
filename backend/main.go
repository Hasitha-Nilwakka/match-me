// Package main implements the Match-Me dating application backend server.
// It provides a RESTful API with WebSocket support for real-time chat functionality.
// The server handles user authentication, profile management, recommendations,
// connections, and messaging between users.
package main

import (
	"backend/db"
	"backend/handlers"
	"backend/middleware"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {

	db.InitDB()

	// Create WebSocket hub for real-time chat functionality
	// The hub manages client connections and message broadcasting
	hub := handlers.NewHub()
	go hub.Run() // Start the hub in a separate goroutine

	// Set Gin to release mode to reduce development warnings
	// In production, this provides better performance and security
	gin.SetMode(gin.ReleaseMode)

	// Alternative: Set to debug mode for development (uncomment if needed)
	// gin.SetMode(gin.DebugMode)

	// Create Gin HTTP router WITHOUT default logging middleware
	// This removes the verbose HTTP request logs
	r := gin.New()

	// Add only recovery middleware (catches panics)
	r.Use(gin.Recovery())

	// Add CORS middleware to allow frontend requests
	// This enables cross-origin requests from the Next.js frontend and local network devices
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		// Handle preflight OPTIONS requests
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// API endpoint
	r.GET("/", func(c *gin.Context) {
		fmt.Fprint(c.Writer, "Welcome to the Match Me API!")
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// =============================================================================
	// PUBLIC ROUTES (No authentication required)
	// =============================================================================

	// User listing endpoint (for development/testing)
	r.GET("/users", handlers.GetAllUsersHandler)

	// Reference data endpoints (public)
	r.GET("/languages", handlers.GetAllLanguagesHandler)              // Get all available languages
	r.GET("/hobbies", handlers.GetAllHobbiesHandler)                  // Get all available hobbies
	r.GET("/interests", handlers.GetAllInterestsHandler)              // Get all available interests
	r.GET("/food-preferences", handlers.GetAllFoodPreferencesHandler) // Get all available food preferences
	r.GET("/music-genres", handlers.GetAllMusicGenresHandler)         // Get all available music genres
	r.GET("/movie-genres", handlers.GetAllMovieGenresHandler)         // Get all available movie genres
	r.GET("/travel-types", handlers.GetAllTravelTypesHandler)         // Get all available travel types

	// Authentication endpoints
	r.POST("/auth/register", handlers.RegisterHandler) // User registration
	r.POST("/auth/login", handlers.LoginHandler)       // User login

	// =============================================================================
	// PROTECTED ROUTES (JWT authentication required)
	// =============================================================================

	// Create protected route group with JWT authentication middleware
	protected := r.Group("/")
	protected.Use(middleware.AuthMiddleware())
	{
		// User profile management endpoints
		protected.GET("/me", handlers.GetMeHandler)                                 // Get current user info
		protected.GET("/me/profile", handlers.GetMeProfileHandler)                  // Get current user profile
		protected.PUT("/me/profile", handlers.UpdateMeProfileHandler)               // Update current user profile
		protected.POST("/me/profile-picture", handlers.UploadProfilePictureHandler) // Upload profile picture
		protected.POST("/me/change-password", handlers.ChangePasswordHandler)       // Change password
		protected.DELETE("/me/delete-profile", handlers.DeleteProfileHandler)       // Delete profile
		protected.GET("/me/bio", handlers.GetMeBioHandler)                          // Get current user bio data
		protected.PUT("/me/bio", handlers.UpdateMeBioHandler)                       // Update current user bio data
		protected.GET("/me/preferences", handlers.GetMePreferencesHandler)          // Get seeking preferences
		protected.PUT("/me/preferences", handlers.UpdateMePreferencesHandler)       // Update seeking preferences
		protected.GET("/me/location", handlers.GetMeLocationHandler)                // Get current user location
		protected.PUT("/me/location", handlers.UpdateMeLocationHandler)             // Update current user location
		protected.GET("/me/biographical", handlers.GetMeBiographicalDataHandler)    // Get biographical data
		protected.PUT("/me/biographical", handlers.UpdateMeBiographicalDataHandler) // Update biographical data
		protected.PUT("/me/online-status", handlers.UpdateOnlineStatusHandler)      // Update online status
		protected.GET("/users/:id/online-status", handlers.GetOnlineStatusHandler)  // Get user online status

		// Other user information endpoints
		protected.GET("/users/:id", handlers.GetUserHandler)                // Get other user basic info (with access control)
		protected.GET("/users/:id/profile", handlers.GetUserProfileHandler) // Get other user profile
		protected.GET("/users/:id/bio", handlers.GetUserBioHandler)         // Get other user bio data

		// Recommendation system endpoints
		protected.GET("/recommendations", handlers.GetRecommendationsHandler)                 // Get match recommendations
		protected.POST("/recommendations/:id/like", handlers.LikeRecommendationHandler)       // Like a recommendation
		protected.POST("/recommendations/:id/dismiss", handlers.DismissRecommendationHandler) // Dismiss a recommendation

		// Connection management endpoints
		protected.GET("/connections", handlers.GetConnectionsHandler)                 // Get all user connections
		protected.GET("/connections/requests", handlers.GetConnectionRequestsHandler) // Get pending connection requests
		protected.GET("/matches", handlers.GetMatchesHandler)                         // Get accepted connections (matches)
		protected.PUT("/connections/:id", handlers.UpdateConnectionHandler)           // Accept/reject/disconnect
		protected.DELETE("/connections/:id", handlers.DeleteConnectionHandler)        // Delete connection

		// Real-time chat system endpoints
		protected.POST("/chats", handlers.CreateChatHandler)                        // Create a new chat
		protected.GET("/chats", handlers.GetChatsHandler(hub))                      // Get user's chats
		protected.GET("/chats/:chatId/messages", handlers.GetChatMessagesHandler)   // Get chat messages
		protected.POST("/chats/:chatId/messages", handlers.SendMessageHandler(hub)) // Send new message
		protected.PUT("/chats/:chatId/read", handlers.MarkMessagesAsReadHandler)    // Mark messages as read
		protected.DELETE("/chats/:chatId", handlers.DeleteChatHandler)              // Delete chat and messages
	}

	// WebSocket endpoint (outside protected group - handles auth internally)
	r.GET("/chats/:chatId/ws", handlers.WebSocketHandler(hub)) // WebSocket connection

	// Server test.html file
	r.StaticFile("/test", "./test.html")

	// Serve uploaded profile pictures
	r.Static("/uploads", "./uploads")

	// Admin endpoints (no authentication required)
	r.DELETE("/users/:id", handlers.DeleteUserHandler) // Delete user (temporary endpoint)

	// Start the HTTP server on port 8080 (accessible from local network)
	log.Println("Starting Match-Me server on:")
	log.Println("  Local:   http://localhost:8080")
	log.Println("  Network: http://192.168.101.115:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
