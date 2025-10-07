// Package db provides database connection and initialization for the Match-Me application.
// It handles PostgreSQL connection setup using GORM with proper connection pooling
// and environment variable configuration.
package db

import (
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

	// Lightweight compatibility migrations (safe, additive only)
	// Ensure per-user chat deletion columns exist
	// These are idempotent and safe to run at startup
	if err := DB.Exec(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS requester_deleted_at timestamptz NULL`).Error; err != nil {
		log.Printf("Warning: failed to ensure requester_deleted_at column: %v", err)
	}
	if err := DB.Exec(`ALTER TABLE chats ADD COLUMN IF NOT EXISTS receiver_deleted_at timestamptz NULL`).Error; err != nil {
		log.Printf("Warning: failed to ensure receiver_deleted_at column: %v", err)
	}

	// Ensure profiles.age column exists (added for age-based filtering)
	if err := DB.Exec(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age integer NULL`).Error; err != nil {
		log.Printf("Warning: failed to ensure profiles.age column: %v", err)
	}

	// Note: Database migrations are handled by Prisma in the frontend; the
	// additions above are minimal, backward-compatible safeguards.
	fmt.Println("Database connection established")
}
