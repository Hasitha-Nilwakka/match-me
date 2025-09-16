package main

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
)

func main() {
	// Initialize database
	db.InitDB()

	fmt.Println("Are you sure you want to clear all user data? This action cannot be undone. (y/n)")
	var response string
	fmt.Scanln(&response)
	if response != "y" && response != "Y" {
		log.Println("Aborting. No changes made.")
		return
	} 

	log.Println("Clearing all user data...")

	// First, let's check what sequences exist
	var sequences []string
	rows, err := db.DB.Raw("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'").Rows()
	if err != nil {
		log.Printf("Error querying sequences: %v", err)
	} else {
		defer rows.Close()
		for rows.Next() {
			var seqName string
			rows.Scan(&seqName)
			sequences = append(sequences, seqName)
		}
		log.Printf("Found sequences: %v", sequences)
	}

	// Delete in correct order to avoid foreign key constraints
	tables := []interface{}{
		&models.UserLanguage{},
		&models.UserTravel{},
		&models.UserFood{},
		&models.UserMovie{},
		&models.UserMusic{},
		&models.UserInterest{},
		&models.UserHobby{},
		&models.Message{},
		&models.Chat{},
		&models.Connection{},
		&models.DismissedRecommendation{},
		&models.OnlineStatus{},
		&models.SeekingPreference{},
		&models.Location{},
		&models.Profile{},
		&models.User{},
	}

	for _, table := range tables {
		if err := db.DB.Unscoped().Delete(table, "1 = 1").Error; err != nil {
			log.Printf("Error clearing table %T: %v", table, err)
		} else {
			log.Printf("Cleared table %T", table)
		}
	}

	// Reset sequences to start from 1 (using actual sequence names from database)
	resetSequences := []string{
		"ALTER SEQUENCE users_id_seq RESTART WITH 1",
		"ALTER SEQUENCE profiles_id_seq RESTART WITH 1",
		"ALTER SEQUENCE locations_id_seq RESTART WITH 1",
		"ALTER SEQUENCE chats_id_seq RESTART WITH 1",
		"ALTER SEQUENCE messages_id_seq RESTART WITH 1",
		"ALTER SEQUENCE connections_id_seq RESTART WITH 1",
		"ALTER SEQUENCE dismissed_recommendations_id_seq RESTART WITH 1",
		"ALTER SEQUENCE online_statuses_id_seq RESTART WITH 1",
		"ALTER SEQUENCE seeking_preferences_id_seq RESTART WITH 1",
	}

	log.Println("Resetting sequences...")
	for _, seq := range resetSequences {
		if err := db.DB.Exec(seq).Error; err != nil {
			log.Printf("Error resetting sequence: %v", err)
		}
	}

	log.Println("Database cleared and sequences reset successfully!")
}
