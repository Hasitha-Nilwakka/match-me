package main

import (
	"backend/db"
	"backend/seeders"
	"flag"
	"log"
	"math/rand"
	"time"
)

func main() {
	// Set up random seed
	rand.Seed(time.Now().UnixNano())

	// Command line flag for number of users
	userCount := flag.Int("count", 10, "Number of users to seed")
	flag.Parse()

	// Initialize database
	db.InitDB()

	log.Printf("Seeding database with %d users...", *userCount)

	// Seed users
	if err := seeders.SeedUsers(*userCount); err != nil {
		log.Fatalf("Failed to seed users: %v", err)
	}

	log.Println("Database seeding completed successfully!")
}
