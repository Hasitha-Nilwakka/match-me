package testutil

import (
	"testing"

	"backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// NewTestDB creates an in-memory SQLite database, applies GORM automigrations
// for the application's models, and returns the DB along with a cleanup func.
func NewTestDB(t *testing.T) (*gorm.DB, func()) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}

	// Automigrate only for tests to get a working schema quickly
	if err := db.AutoMigrate(
		&models.User{},
		&models.Profile{},
		&models.Location{},
		&models.SeekingPreference{},
		&models.Connection{},
		&models.Chat{},
		&models.Message{},
		&models.DismissedRecommendation{},
		&models.OnlineStatus{},
		&models.Hobby{}, &models.Interest{}, &models.MusicGenre{}, &models.MovieGenre{},
		&models.FoodPreference{}, &models.TravelType{}, &models.Language{},
		&models.UserHobby{}, &models.UserInterest{}, &models.UserMusic{}, &models.UserMovie{},
		&models.UserFood{}, &models.UserTravel{}, &models.UserLanguage{},
	); err != nil {
		t.Fatalf("failed to automigrate test schema: %v", err)
	}

	cleanup := func() {}
	return db, cleanup
}
