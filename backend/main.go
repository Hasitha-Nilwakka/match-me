package main

import (
	"backend/db"
	"backend/handlers"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	db.InitDB()

	// Set Gin mode to release to reduce warnings
	gin.SetMode(gin.ReleaseMode)

	//Set Gin mode to debug for development
	// gin.SetMode(gin.DebugMode)

	// Create Gin router
	r := gin.Default()

	// Add CORS middleware for frontend
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	r.GET("/", func(c *gin.Context) {
		fmt.Fprint(c.Writer, "Welcome to the Match Me API!")
	})

	// API routes
	r.GET("/users", handlers.GetUsersHandler)
	
	r.POST("/users", handlers.RegisterHandler)

	log.Println("Starting server on http://localhost:8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
