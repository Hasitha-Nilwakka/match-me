package seeders

import (
	"backend/db"
	"backend/models"
	"fmt"
	"log"
	"math/rand"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/crypto/bcrypt"
)

// convertToASCII converts Finnish characters to ASCII equivalents for email addresses
func convertToASCII(input string) string {
	replacements := map[string]string{
		"ä": "a", "Ä": "A",
		"ö": "o", "Ö": "O",
		"å": "a", "Å": "A",
		"ü": "u", "Ü": "U",
		"é": "e", "É": "E",
		"è": "e", "È": "E",
		"ê": "e", "Ê": "E",
		"ë": "e", "Ë": "E",
		"à": "a", "À": "A",
		"á": "a", "Á": "A",
		"â": "a", "Â": "A",
		"ã": "a", "Ã": "A",
		"ç": "c", "Ç": "C",
		"ñ": "n", "Ñ": "N",
		"ß": "ss",
	}

	result := input
	for finnish, ascii := range replacements {
		result = strings.ReplaceAll(result, finnish, ascii)
	}
	return result
}

// SeedUsersFast uses goroutines for faster seeding
func SeedUsersFast(userCount int) error {
	fmt.Println("Starting optimized user seeding...")
	start := time.Now()

	if err := SeedUsers(userCount); err != nil {
		return err
	}

	elapsed := time.Since(start)
	fmt.Printf("Optimized seeding completed in %v\n", elapsed)
	return nil
}

// SampleData contains arrays of sample data for generating users
var (
	firstNames = []string{
		// Traditional Finnish names
		"Aino", "Eero", "Elina", "Jari", "Kaisa", "Mikael", "Noora", "Oskari",
		"Sanna", "Tuomas", "Veera", "Ville", "Aada", "Aleksi", "Emilia", "Henri",
		"Iida", "Joona", "Liisa", "Matias", "Nea", "Otto", "Pinja", "Roni",
		"Saga", "Timo", "Venla", "Väinö", "Aura", "Eemil", "Helmi", "Ilmari",
		"Kerttu", "Leevi", "Mira", "Niilo", "Oona", "Paavo", "Ronja", "Sampo",
		"Taika", "Urho", "Vilja", "Yrjö", "Aarne", "Elsa", "Hannu", "Iiris",
		"Jenna", "Kalle", "Laura", "Matti", "Nina", "Onni", "Petra", "Raimo",
	}

	lastNames = []string{
		// Common Finnish surnames
		"Virtanen", "Korhonen", "Mäkinen", "Nieminen", "Mäkelä", "Hämäläinen", "Laine", "Heikkinen",
		"Koskinen", "Järvinen", "Lehtonen", "Lehtinen", "Saarinen", "Salminen", "Heinonen", "Niemi",
		"Heikkilä", "Kinnunen", "Salonen", "Turunen", "Salo", "Laitinen", "Tuominen", "Lehto",
		"Rantanen", "Takala", "Virolainen", "Mattila", "Nurminen", "Kallio", "Pitkänen", "Hakkarainen",
		"Laaksonen", "Ahonen", "Aho", "Hiltunen", "Rautiainen", "Miettinen", "Kärkkäinen", "Jokinen",
		"Väisänen", "Toivonen", "Halonen", "Karjalainen", "Manninen", "Lindström", "Savolainen", "Rajala",
	}

	genders = []string{"male", "female", "non-binary", "other"}

	statuses = []string{"single", "divorced", "separated", "widowed"}

	relationshipStatuses = []string{"looking for relationship", "looking for friends", "casual dating", "serious relationship"}

	// Finnish municipalities with coordinates for distance testing
	finnishCities = []struct {
		Name      string
		Latitude  float64
		Longitude float64
	}{
		// Major cities
		{"Helsinki", 60.1699, 24.9384},
		{"Espoo", 60.2055, 24.6559},
		{"Tampere", 61.4991, 23.7871},
		{"Vantaa", 60.2946, 25.0407},
		{"Oulu", 65.0121, 25.4651},
		{"Turku", 60.4518, 22.2666},
		{"Jyväskylä", 62.2426, 25.7473},
		{"Lahti", 60.9827, 25.6612},
		{"Kuopio", 62.8924, 27.6783},
		{"Pori", 61.4851, 21.7974},

		// Medium cities
		{"Kouvola", 60.8681, 26.7042},
		{"Joensuu", 62.6010, 29.7636},
		{"Lappeenranta", 61.0587, 28.1887},
		{"Hämeenlinna", 60.9963, 24.4641},
		{"Vaasa", 63.0951, 21.6165},
		{"Seinäjoki", 62.7903, 22.8404},
		{"Rovaniemi", 66.5039, 25.7294},
		{"Mikkeli", 61.6884, 27.2722},
		{"Kotka", 60.4664, 26.9458},
		{"Salo", 60.3836, 23.1303},

		// Smaller municipalities
		{"Porvoo", 60.3963, 25.6652},
		{"Lohja", 60.2487, 24.0662},
		{"Hyvinkää", 60.6299, 24.8615},
		{"Nurmijärvi", 60.4638, 24.8067},
		{"Järvenpää", 60.4739, 25.0897},
		{"Kirkkonummi", 60.1225, 24.4358},
		{"Kerava", 60.4044, 25.1050},
		{"Tuusula", 60.4033, 25.0265},
		{"Sipoo", 60.3738, 25.2697},
		{"Vihti", 60.4178, 24.3199},

		// Northern municipalities
		{"Tornio", 65.8481, 24.1462},
		{"Kemi", 65.7362, 24.5662},
		{"Kajaani", 64.2278, 27.7285},
		{"Ylivieska", 64.0736, 24.5410},
		{"Raahe", 64.6831, 24.4776},
		{"Iisalmi", 63.5589, 27.1907},
		{"Savonlinna", 61.8671, 28.8814},
		{"Varkaus", 62.3147, 27.8739},
		{"Pieksämäki", 62.3056, 27.1614},
		{"Heinola", 61.2058, 26.0378},

		// Western municipalities
		{"Rauma", 61.1274, 21.5103},
		{"Kankaanpää", 61.8014, 22.3938},
		{"Parkano", 62.0093, 23.0276},
		{"Ähtäri", 62.5503, 24.0603},
		{"Alajärvi", 63.0003, 23.8167},
		{"Lapua", 62.9694, 23.0064},
		{"Kurikka", 62.6167, 22.4167},
		{"Ilmajoki", 62.7333, 22.5833},
		{"Kauhava", 63.1000, 23.0500},
		{"Alavus", 62.5833, 23.6167},
	}

	countries = []string{"Finland"}

	ethnicities = []string{"Caucasian", "Hispanic", "African American", "Asian", "Native American", "Mixed", "Other", "Prefer not to say"}

	religions = []string{"Christian", "Muslim", "Jewish", "Hindu", "Buddhist", "Atheist", "Agnostic", "Other", "Prefer not to say"}

	bioTemplates = []string{
		"Rakastan matkustamista ja uusien paikkojen tutkimista. Aina valmis seikkailuun!",
		"Kahvi-intoilija ja kirjojen ystävä. Etsin merkityksellisiä yhteyksiä.",
		"Liikunta-aktiivinen, joka nauttii vaelluksesta ja ulkoilusta.",
		"Luova sielu, jolla on intohimo taiteeseen ja musiikkiin.",
		"Ruokakulttuurin ystävä, joka rakastaa uusien ravintoloiden kokeilua.",
		"Tekniikan ammattilainen, joka nauttii pelaamisesta ja sci-fi elokuvista.",
		"Luonnon ystävä, joka viettää viikonloput retkeillen ja kalastellen.",
		"Musiikin ystävä, joka soittaa kitaraa ja nauttii live-konserteista.",
		"Koiran ystävä ja vapaaehtoinen paikallisessa eläinsuojassa.",
		"Valokuvaaja, joka ikuistaa elämän kauniita hetkiä.",
		"Sauna-entusiasti ja mökkeilijä, joka arvostaa suomalaisia perinteitä.",
		"Hiihtäjä ja luistelija, joka odottaa talvea innolla.",
		"Marjastaija ja sienestäjä, joka viihtyy metsässä.",
		"Järven rannalla asuva, joka rakastaa uimista ja soutelua.",
		"Festivaalien kävijä, joka nauttii musiikista ja kulttuurista.",
	}
)

// GenerateRandomUser creates a single random user with profile and location
func GenerateRandomUser(index int) (*models.User, *models.Profile, *models.Location) {
	// Random data generation
	firstName := firstNames[rand.Intn(len(firstNames))]
	lastName := lastNames[rand.Intn(len(lastNames))]
	email := fmt.Sprintf("%s.%s%d@example.com",
		convertToASCII(firstName), convertToASCII(lastName), rand.Intn(1000))

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

	// Create location with Finnish municipality
	cityData := finnishCities[rand.Intn(len(finnishCities))]
	country := countries[0] // Always Finland

	// Use actual Finnish coordinates with some random variation
	baseLatitude := cityData.Latitude
	baseLongitude := cityData.Longitude

	// Add small random variation (±0.1 degrees ≈ ±11km) to simulate neighborhoods
	latitude := baseLatitude + (rand.Float64()-0.5)*0.2
	longitude := baseLongitude + (rand.Float64()-0.5)*0.2
	radiusKm := 25 + rand.Intn(75) // Between 25-100 km search radius

	location := &models.Location{
		City:               &cityData.Name,
		Country:            &country,
		Latitude:           &latitude,
		Longitude:          &longitude,
		LocationPreference: "within_city",
		RadiusKm:           radiusKm,
	}

	return user, profile, location
}

// SeedUsers creates the specified number of sample users
func SeedUsers(userCount int) error {
	var count int64
	db.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		fmt.Println("Users already exist, skipping seeding")
		return nil
	}

	fmt.Printf("Seeding %d users...\n", userCount)

	// Use 10 workers or the number of CPUs, whichever is smaller
	workerCount := 10
	if runtime.NumCPU() < workerCount {
		workerCount = runtime.NumCPU()
	}

	// Create channels
	userChan := make(chan int, userCount)
	var wg sync.WaitGroup

	// Start workers
	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for userIndex := range userChan {
				createUserWithData(userIndex, userCount)
			}
		}(w)
	}

	// Send work to workers
	for i := 0; i < userCount; i++ {
		userChan <- i
	}
	close(userChan)

	// Wait for all workers to finish
	wg.Wait()
	fmt.Println("Users seeded successfully!")

	// Seed relationships for all users concurrently
	fmt.Println("Seeding user relationships...")
	seedAllUserRelationships()
	fmt.Println("User relationships seeded successfully!")

	return nil
}

func seedAllUserRelationships() {
	// Get all user IDs
	var userIDs []uint
	db.DB.Model(&models.User{}).Pluck("id", &userIDs)

	// Use workers to process relationships concurrently
	workerCount := 20 // More workers for relationship processing
	if runtime.NumCPU() < workerCount {
		workerCount = runtime.NumCPU()
	}

	userChan := make(chan uint, len(userIDs))
	var wg sync.WaitGroup

	// Start workers
	for w := 0; w < workerCount; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for userID := range userChan {
				if err := SeedUserRelationshipsConcurrent(userID); err != nil {
					log.Printf("Failed to seed relationships for user %d: %v", userID, err)
				}
			}
		}(w)
	}

	// Send work to workers
	for _, userID := range userIDs {
		userChan <- userID
	}
	close(userChan)

	// Wait for all workers to finish
	wg.Wait()
}

func createUserWithData(userIndex, totalCount int) {
	user, profile, location := GenerateRandomUser(userIndex)

	// Create user first
	if err := db.DB.Create(user).Error; err != nil {
		log.Printf("Failed to create user %d: %v", userIndex, err)
		return
	}

	// Update profile and location with the actual user ID from database
	profile.UserID = user.ID
	location.UserID = user.ID

	// Create profile and location concurrently
	var wg sync.WaitGroup
	wg.Add(2)

	// Create profile in goroutine
	go func() {
		defer wg.Done()
		if err := db.DB.Create(profile).Error; err != nil {
			log.Printf("Failed to create profile for user %d: %v", user.ID, err)
		}
	}()

	// Create location in goroutine
	go func() {
		defer wg.Done()
		if err := db.DB.Create(location).Error; err != nil {
			log.Printf("Failed to create location for user %d: %v", user.ID, err)
		}
	}()

	wg.Wait()
	fmt.Printf("Created user %d/%d\n", userIndex+1, totalCount)
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

	// Seed user interests (ensure at least 1)
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

	// Seed user music preferences (ensure at least 1)
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

	// Seed user movie preferences (ensure at least 1)
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

	// Seed user food preferences (ensure at least 1 when available)
	var foodPreferences []models.FoodPreference
	db.DB.Find(&foodPreferences)

	numFood := 1 + rand.Intn(2) // 1-2 food preferences
	selectedFood := make(map[uint]bool)

	if len(foodPreferences) == 0 {
		// nothing to seed
	} else {
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
	}

	// Seed user travel preferences (ensure at least 1)
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

	// Seed user languages (ensure at least 1)
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

// ReferenceData holds cached reference data for efficient seeding
type ReferenceData struct {
	Hobbies         []models.Hobby
	Interests       []models.Interest
	MusicGenres     []models.MusicGenre
	MovieGenres     []models.MovieGenre
	FoodPreferences []models.FoodPreference
	TravelTypes     []models.TravelType
	Languages       []models.Language
}

// Cache reference data once
var refData *ReferenceData
var refDataOnce sync.Once

func getReferenceData() *ReferenceData {
	refDataOnce.Do(func() {
		refData = &ReferenceData{}
		db.DB.Find(&refData.Hobbies)
		db.DB.Find(&refData.Interests)
		db.DB.Find(&refData.MusicGenres)
		db.DB.Find(&refData.MovieGenres)
		db.DB.Find(&refData.FoodPreferences)
		db.DB.Find(&refData.TravelTypes)
		db.DB.Find(&refData.Languages)
	})
	return refData
}

// SeedUserRelationshipsConcurrent optimizes relationship seeding with goroutines
func SeedUserRelationshipsConcurrent(userID uint) error {
	data := getReferenceData()

	// Create all relationships concurrently
	var wg sync.WaitGroup
	wg.Add(7)

	// Seed user hobbies (2-5 hobbies per user)
	go func() {
		defer wg.Done()
		seedUserHobbies(userID, data.Hobbies)
	}()

	// Seed user interests (1-4 interests per user)
	go func() {
		defer wg.Done()
		seedUserInterests(userID, data.Interests)
	}()

	// Seed user music preferences (1-3 genres per user)
	go func() {
		defer wg.Done()
		seedUserMusic(userID, data.MusicGenres)
	}()

	// Seed user movie preferences (1-3 genres per user)
	go func() {
		defer wg.Done()
		seedUserMovies(userID, data.MovieGenres)
	}()

	// Seed user food preferences (0-2 preferences per user)
	go func() {
		defer wg.Done()
		seedUserFood(userID, data.FoodPreferences)
	}()

	// Seed user travel preferences (1-3 types per user)
	go func() {
		defer wg.Done()
		seedUserTravel(userID, data.TravelTypes)
	}()

	// Seed user languages (1-3 languages per user)
	go func() {
		defer wg.Done()
		seedUserLanguages(userID, data.Languages)
	}()

	wg.Wait()
	return nil
}

func seedUserHobbies(userID uint, hobbies []models.Hobby) {
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
}

func seedUserInterests(userID uint, interests []models.Interest) {
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
}

func seedUserMusic(userID uint, musicGenres []models.MusicGenre) {
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
}

func seedUserMovies(userID uint, movieGenres []models.MovieGenre) {
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
}

func seedUserFood(userID uint, foodPreferences []models.FoodPreference) {
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
}

func seedUserTravel(userID uint, travelTypes []models.TravelType) {
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
}

func seedUserLanguages(userID uint, languages []models.Language) {
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
}
