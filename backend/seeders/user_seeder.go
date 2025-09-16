package seeders

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"math/rand"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// SampleData contains arrays of sample data for generating users
var (
	firstNames = []string{
		"Alex", "Jordan", "Taylor", "Casey", "Morgan", "Riley", "Avery", "Quinn",
		"Blake", "Cameron", "Drew", "Jamie", "Kendall", "Logan", "Parker", "Reese",
		"Sage", "Skyler", "Rowan", "Emery", "Finley", "Hayden", "Peyton", "River",
		"Dakota", "Phoenix", "Justice", "Marlowe", "Remy", "Charlie", "Frankie", "Jules",
	}

	lastNames = []string{
		"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
		"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
		"Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
		"Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
	}

	genders = []string{"male", "female", "non-binary", "other"}

	statuses = []string{"single", "divorced", "separated", "widowed"}

	relationshipStatuses = []string{"looking for relationship", "looking for friends", "casual dating", "serious relationship"}

	cities = []string{
		"New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
		"San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
		"Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle",
		"Denver", "Washington", "Boston", "Nashville", "Baltimore", "Oklahoma City",
	}

	countries = []string{"United States", "Canada", "United Kingdom", "Australia", "Germany", "France"}

	ethnicities = []string{"Caucasian", "Hispanic", "African American", "Asian", "Native American", "Mixed", "Other", "Prefer not to say"}

	religions = []string{"Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Atheist", "Agnostic", "Other", "Prefer not to say"}

	bioTemplates = []string{
		"Love to travel and explore new places. Always up for an adventure!",
		"Passionate about fitness and healthy living. Looking for someone who shares similar values.",
		"Book lover and coffee enthusiast. Let's discuss our favorite novels over a latte.",
		"Outdoor enthusiast who enjoys hiking, camping, and nature photography.",
		"Foodie who loves trying new restaurants and cooking at home.",
		"Music lover with a passion for live concerts and discovering new artists.",
		"Tech professional who enjoys solving problems and building cool things.",
		"Artist at heart with a love for creativity and self-expression.",
		"Sports fan who never misses a game. Looking for a teammate in life.",
		"Dog lover seeking someone who appreciates furry companions.",
	}
)

// GenerateRandomUser creates a single random user with profile and location
func GenerateRandomUser(index int) (*models.User, *models.Profile, *models.Location) {
	// Random data generation
	firstName := firstNames[rand.Intn(len(firstNames))]
	lastName := lastNames[rand.Intn(len(lastNames))]
	email := fmt.Sprintf("%s.%s%d@example.com",
		firstName, lastName, rand.Intn(1000))

	// Hash a default password
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)

	// Create user
	user := &models.User{
		Email:        email,
		PasswordHash: string(hashedPassword),
		IsActive:     true,
	}

	// Add random last login (some users, not all)
	if rand.Float32() < 0.7 { // 70% chance of having logged in before
		lastLogin := time.Now().AddDate(0, 0, -rand.Intn(30)) // Within last 30 days
		user.LastLogin = &lastLogin
	}

	// Create profile
	gender := genders[rand.Intn(len(genders))]
	status := statuses[rand.Intn(len(statuses))]
	relationshipStatus := relationshipStatuses[rand.Intn(len(relationshipStatuses))]
	ethnicity := ethnicities[rand.Intn(len(ethnicities))]
	religion := religions[rand.Intn(len(religions))]
	bio := bioTemplates[rand.Intn(len(bioTemplates))]

	profile := &models.Profile{
		FirstName:          firstName,
		LastName:           lastName,
		Gender:             &gender,
		Status:             &status,
		RelationshipStatus: &relationshipStatus,
		AboutMe:            &bio,
		Ethnicity:          &ethnicity,
		Religion:           &religion,
	}

	// Create location
	city := cities[rand.Intn(len(cities))]
	country := countries[rand.Intn(len(countries))]

	// Generate random coordinates (rough US bounds)
	latitude := 25.0 + rand.Float64()*(49.0-25.0) // Between 25-49 latitude
	longitude := -125.0 + rand.Float64()*(66.0)   // Between -125 to -66 longitude
	radiusKm := 25 + rand.Intn(75)                // Between 25-100 km

	location := &models.Location{
		City:               &city,
		Country:            &country,
		Latitude:           &latitude,
		Longitude:          &longitude,
		LocationPreference: "within_city",
		RadiusKm:           radiusKm,
	}

	return user, profile, location
}

// SeedUsers creates the specified number of sample users
func SeedUsers(count int) error {
	log.Printf("Starting to seed %d users...", count)

	// Note: Reference data should be seeded via Prisma (npm run db:seed)
	// This function assumes reference tables are already populated

	for i := 0; i < count; i++ {
		user, profile, location := GenerateRandomUser(i)

		// Create user first
		if err := db.DB.Create(user).Error; err != nil {
			log.Printf("Error creating user %d: %v", i+1, err)
			continue
		}

		// Set foreign keys
		profile.UserID = user.ID
		location.UserID = user.ID

		// Create profile
		if err := db.DB.Create(profile).Error; err != nil {
			log.Printf("Error creating profile for user %d: %v", i+1, err)
		}

		// Create location
		if err := db.DB.Create(location).Error; err != nil {
			log.Printf("Error creating location for user %d: %v", i+1, err)
		}

		// Create user preferences and relationships
		if err := SeedUserRelationships(user.ID); err != nil {
			log.Printf("Error creating relationships for user %d: %v", i+1, err)
		}

		if (i+1)%10 == 0 {
			log.Printf("Created %d/%d users", i+1, count)
		}
	}

	log.Printf("Successfully seeded %d users!", count)
	return nil
}

// SeedUserRelationships creates realistic relationships for a user
func SeedUserRelationships(userID uint) error {
	// Seed user hobbies (2-5 hobbies per user)
	var hobbies []models.Hobby
	db.DB.Find(&hobbies)

	numHobbies := 2 + rand.Intn(4) // 2-5 hobbies
	selectedHobbies := make(map[uint]bool)

	for i := 0; i < numHobbies && i < len(hobbies); i++ {
		hobbyIndex := rand.Intn(len(hobbies))
		hobbyID := hobbies[hobbyIndex].ID

		if !selectedHobbies[hobbyID] {
			userHobby := models.UserHobby{
				UserID:  userID,
				HobbyID: hobbyID,
			}
			db.DB.FirstOrCreate(&userHobby, userHobby)
			selectedHobbies[hobbyID] = true
		}
	}

	// Seed user interests (1-4 interests per user)
	var interests []models.Interest
	db.DB.Find(&interests)

	numInterests := 1 + rand.Intn(4) // 1-4 interests
	selectedInterests := make(map[uint]bool)

	for i := 0; i < numInterests && i < len(interests); i++ {
		interestIndex := rand.Intn(len(interests))
		interestID := interests[interestIndex].ID

		if !selectedInterests[interestID] {
			userInterest := models.UserInterest{
				UserID:     userID,
				InterestID: interestID,
			}
			db.DB.FirstOrCreate(&userInterest, userInterest)
			selectedInterests[interestID] = true
		}
	}

	// Seed user music preferences (1-3 genres per user)
	var musicGenres []models.MusicGenre
	db.DB.Find(&musicGenres)

	numMusic := 1 + rand.Intn(3) // 1-3 music genres
	selectedMusic := make(map[uint]bool)

	for i := 0; i < numMusic && i < len(musicGenres); i++ {
		musicIndex := rand.Intn(len(musicGenres))
		musicID := musicGenres[musicIndex].ID

		if !selectedMusic[musicID] {
			userMusic := models.UserMusic{
				UserID:       userID,
				MusicGenreID: musicID,
			}
			db.DB.FirstOrCreate(&userMusic, userMusic)
			selectedMusic[musicID] = true
		}
	}

	// Seed user movie preferences (1-3 genres per user)
	var movieGenres []models.MovieGenre
	db.DB.Find(&movieGenres)

	numMovies := 1 + rand.Intn(3) // 1-3 movie genres
	selectedMovies := make(map[uint]bool)

	for i := 0; i < numMovies && i < len(movieGenres); i++ {
		movieIndex := rand.Intn(len(movieGenres))
		movieID := movieGenres[movieIndex].ID

		if !selectedMovies[movieID] {
			userMovie := models.UserMovie{
				UserID:       userID,
				MovieGenreID: movieID,
			}
			db.DB.FirstOrCreate(&userMovie, userMovie)
			selectedMovies[movieID] = true
		}
	}

	// Seed user food preferences (0-2 preferences per user)
	var foodPreferences []models.FoodPreference
	db.DB.Find(&foodPreferences)

	numFood := rand.Intn(3) // 0-2 food preferences
	selectedFood := make(map[uint]bool)

	for i := 0; i < numFood && i < len(foodPreferences); i++ {
		foodIndex := rand.Intn(len(foodPreferences))
		foodID := foodPreferences[foodIndex].ID

		if !selectedFood[foodID] {
			userFood := models.UserFood{
				UserID:           userID,
				FoodPreferenceID: foodID,
			}
			db.DB.FirstOrCreate(&userFood, userFood)
			selectedFood[foodID] = true
		}
	}

	// Seed user travel preferences (1-3 types per user)
	var travelTypes []models.TravelType
	db.DB.Find(&travelTypes)

	numTravel := 1 + rand.Intn(3) // 1-3 travel types
	selectedTravel := make(map[uint]bool)

	for i := 0; i < numTravel && i < len(travelTypes); i++ {
		travelIndex := rand.Intn(len(travelTypes))
		travelID := travelTypes[travelIndex].ID

		if !selectedTravel[travelID] {
			userTravel := models.UserTravel{
				UserID:       userID,
				TravelTypeID: travelID,
			}
			db.DB.FirstOrCreate(&userTravel, userTravel)
			selectedTravel[travelID] = true
		}
	}

	// Seed user languages (1-3 languages per user)
	var languages []models.Language
	db.DB.Find(&languages)

	numLanguages := 1 + rand.Intn(3) // 1-3 languages
	selectedLanguages := make(map[uint]bool)

	for i := 0; i < numLanguages && i < len(languages); i++ {
		languageIndex := rand.Intn(len(languages))
		languageID := languages[languageIndex].ID

		if !selectedLanguages[languageID] {
			userLanguage := models.UserLanguage{
				UserID:     userID,
				LanguageID: languageID,
			}
			db.DB.FirstOrCreate(&userLanguage, userLanguage)
			selectedLanguages[languageID] = true
		}
	}

	return nil
}
