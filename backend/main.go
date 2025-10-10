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
	"net"
	"os"

	"github.com/gin-gonic/gin"
)

// getLocalIP returns the non-loopback local IP of the machine
func getLocalIP() string {
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return "localhost"
	}
	for _, address := range addrs {
		// check the address type and if it is not a loopback the display it
		if ipnet, ok := address.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				return ipnet.IP.String()
			}
		}
	}
	return "localhost"
}

func main() {

	db.InitDB()

	// Auto-seed database
	// This will only seed if the database is empty
	fmt.Println("Checking database setup...")
	// Note: Reference data (hobbies, interests, etc.) should be seeded via Prisma
	// or a separate seeding script. The SeedReferenceData function is not implemented.
	// if err := seeders.SeedReferenceData(); err != nil {
	// 	log.Printf("Warning: Failed to seed reference data: %v", err)
	// }

	// Create Socket.IO server for real-time chat functionality
	// Socket.IO provides automatic reconnection, fallback transports, and better mobile support
	socketIOServer := handlers.SetupSocketIO()
	defer socketIOServer.Close(nil)

	// Set Gin to release mode to reduce development warnings
	// In production, this provides better performance and security
	gin.SetMode(gin.ReleaseMode)

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
		protected.POST("/chats", handlers.CreateChatHandler)                       // Create a new chat
		protected.GET("/chats", handlers.GetChatsHandler())                        // Get user's chats
		protected.GET("/chats/:chatId/messages", handlers.GetChatMessagesHandler)  // Get chat messages
		protected.POST("/chats/:chatId/messages", handlers.SendMessageHandler())   // Send new message
		protected.PUT("/chats/:chatId/read", handlers.MarkMessagesAsReadHandler()) // Mark messages as read
		protected.DELETE("/chats/:chatId", handlers.DeleteChatHandler)             // Delete chat and messages
	}

	// Socket.IO endpoint for real-time chat
	// Handles both GET (upgrade to WebSocket) and POST (polling fallback)
	r.GET("/socket.io/*any", gin.WrapH(socketIOServer.ServeHandler(nil)))
	r.POST("/socket.io/*any", gin.WrapH(socketIOServer.ServeHandler(nil)))

	// Server test.html file
	r.StaticFile("/test", "./test.html")

	// Serve uploaded profile pictures
	r.Static("/uploads", "./uploads")

	// Admin endpoints (no authentication required)
	r.DELETE("/users/:id", handlers.DeleteUserHandler) // Delete user (temporary endpoint)

	// Start the HTTP server on configurable port (accessible from local network)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // Default to 8080 if not specified
	}

	localIP := getLocalIP()
	log.Println("Starting Match-Me server on:")
	log.Printf("  Local:   http://localhost:%s", port)
	log.Printf("  Network: http://%s:%s", localIP, port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
