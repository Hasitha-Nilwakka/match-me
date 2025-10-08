// Package db provides database connection and initialization for the Match-Me application.
// It handles PostgreSQL connection setup using GORM with proper connection pooling
// and environment variable configuration.
package db

import (
	"backend/models"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: Could not load .env file, using system environment variables")
	}

	// Force UTC for all timestamps used by the app
	time.Local = time.UTC

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable is not set")
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Run GORM AutoMigrate for all models
	fmt.Println("Running database migrations...")
	if err := runMigrations(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	fmt.Println("Database connection established and migrations completed")
}

// runMigrations handles all GORM AutoMigrate operations
func runMigrations() error {
	// Migrate all models in dependency order
	modelsToMigrate := []interface{}{
		// Core entities first
		&models.User{},
		&models.Profile{},
		&models.Location{},

		// Reference data tables
		&models.Hobby{},
		&models.Interest{},
		&models.MusicGenre{},
		&models.MovieGenre{},
		&models.FoodPreference{},
		&models.TravelType{},
		&models.Language{},

		// Junction tables (many-to-many relationships)
		&models.UserHobby{},
		&models.UserInterest{},
		&models.UserMusic{},
		&models.UserMovie{},
		&models.UserFood{},
		&models.UserTravel{},
		&models.UserLanguage{},

		// User preferences and matching
		&models.SeekingPreference{},
		&models.DismissedRecommendation{},

		// Connections and messaging
		&models.Connection{},
		&models.Chat{},
		&models.Message{},

		// Online status tracking
		&models.OnlineStatus{},
	}

	// Run AutoMigrate for all models
	if err := DB.AutoMigrate(modelsToMigrate...); err != nil {
		return fmt.Errorf("failed to auto-migrate models: %w", err)
	}

	// Add any custom indexes or constraints that GORM might not handle
	if err := addCustomIndexes(); err != nil {
		return fmt.Errorf("failed to add custom indexes: %w", err)
	}

	return nil
}

// addCustomIndexes adds any custom database indexes for performance
func addCustomIndexes() error {
	// Spatial indexes for location-based queries (if PostGIS is available)
	// These are optional and will fail silently if PostGIS is not installed

	// Index for location-based searches
	if err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_locations_lat_lng ON locations USING btree (latitude, longitude)`).Error; err != nil {
		log.Printf("Warning: Could not create location index (PostGIS may not be available): %v", err)
	}

	// Composite indexes for common query patterns
	if err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_connections_status_requester ON connections (status, requester_id)`).Error; err != nil {
		log.Printf("Warning: Could not create connection status index: %v", err)
	}

	if err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_connections_status_receiver ON connections (status, receiver_id)`).Error; err != nil {
		log.Printf("Warning: Could not create connection receiver index: %v", err)
	}

	// Index for message queries
	if err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages (chat_id, created_at DESC)`).Error; err != nil {
		log.Printf("Warning: Could not create message index: %v", err)
	}

	// Index for online status queries
	if err := DB.Exec(`CREATE INDEX IF NOT EXISTS idx_online_status_last_seen ON online_statuses (is_online, last_seen DESC)`).Error; err != nil {
		log.Printf("Warning: Could not create online status index: %v", err)
	}

	return nil
}
