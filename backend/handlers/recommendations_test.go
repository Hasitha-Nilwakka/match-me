package handlers

import (
	"testing"

	"backend/models"
)

func TestCalculateMatchScore_UsesMultipleSignals(t *testing.T) {
	// Create seeking preference with weights
	seekingPref := &models.SeekingPreference{
		HobbiesWeight:   10,
		InterestsWeight: 10,
		MusicWeight:     10,
		MoviesWeight:    10,
		FoodWeight:      10,
		TravelWeight:    10,
		LanguagesWeight: 10,
		EthnicityWeight: 10,
		ReligionWeight:  10,
		MaxDistanceKm:   100,
	}

	a := models.User{
		Profile:           &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:       []models.UserHobby{{HobbyID: 1}},
		UserInterests:     []models.UserInterest{{InterestID: 2}},
		UserMusic:         []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:        []models.UserMovie{{MovieGenreID: 4}},
		UserFood:          []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:        []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages:     []models.UserLanguage{{LanguageID: 7}},
		SeekingPreference: seekingPref,
	}
	b := models.User{
		Profile:       &models.Profile{Ethnicity: strptr("A"), Religion: strptr("R1")},
		UserHobbies:   []models.UserHobby{{HobbyID: 1}},
		UserInterests: []models.UserInterest{{InterestID: 2}},
		UserMusic:     []models.UserMusic{{MusicGenreID: 3}},
		UserMovies:    []models.UserMovie{{MovieGenreID: 4}},
		UserFood:      []models.UserFood{{FoodPreferenceID: 5}},
		UserTravel:    []models.UserTravel{{TravelTypeID: 6}},
		UserLanguages: []models.UserLanguage{{LanguageID: 7}},
	}

	score := calculateMatchScore(a, b)
	if score <= 0 {
		t.Fatalf("expected positive score, got %v", score)
	}

	// With all matching signals, should get a high score (close to 100)
	if score < 80 {
		t.Fatalf("expected high score (>=80) for perfect match, got %v", score)
	}
}

func strptr(s string) *string { return &s }
