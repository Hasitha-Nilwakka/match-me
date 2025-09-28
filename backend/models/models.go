// Package models defines the database models and data structures for the Match-Me dating application.
// It uses GORM for object-relational mapping and includes models for users, profiles,
// connections, chats, messages, and recommendation data.
package models

import (
	"time"

	"gorm.io/gorm"
)

// User model for authentication
type User struct {
	gorm.Model
	Email        string `gorm:"uniqueIndex;not null"`
	PasswordHash string `gorm:"not null"`
	LastLogin    *time.Time
	IsActive     bool `gorm:"default:true"`

	// Relations
	Profile           *Profile
	Location          *Location
	SeekingPreference *SeekingPreference
	ConnectionsFrom   []Connection              `gorm:"foreignKey:RequesterID"`
	ConnectionsTo     []Connection              `gorm:"foreignKey:ReceiverID"`
	Messages          []Message                 `gorm:"foreignKey:SenderID"`
	DismissedFrom     []DismissedRecommendation `gorm:"foreignKey:UserID"`
	DismissedTo       []DismissedRecommendation `gorm:"foreignKey:DismissedUserID"`
	OnlineStatus      *OnlineStatus
	UserHobbies       []UserHobby
	UserInterests     []UserInterest
	UserMusic         []UserMusic
	UserMovies        []UserMovie
	UserFood          []UserFood
	UserTravel        []UserTravel
	UserLanguages     []UserLanguage
}

// Profile model for user information
type Profile struct {
	gorm.Model
	UserID             uint   `gorm:"uniqueIndex;not null"`
	ProfilePictureURL  string `gorm:"default:'👤'"`
	FirstName          string
	LastName           string
	Gender             *string
	Status             *string
	RelationshipStatus *string
	AboutMe            *string
	Ethnicity          *string
	Religion           *string
}

// Location model for user location data
type Location struct {
	gorm.Model
	UserID             uint `gorm:"uniqueIndex;not null"`
	City               *string
	Country            *string
	Latitude           *float64
	Longitude          *float64
	LocationPreference string `gorm:"default:'within_city'"`
	RadiusKm           int    `gorm:"default:50"`
}

// Reference tables with predefined options
type Hobby struct {
	gorm.Model
	Name     string `gorm:"uniqueIndex;not null"`
	Category *string
}

type Interest struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
}

type MusicGenre struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
}

type MovieGenre struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
}

type FoodPreference struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
}

type TravelType struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
}

type Language struct {
	gorm.Model
	Name string `gorm:"uniqueIndex;not null"`
	Code string `gorm:"uniqueIndex;not null"`
}

// Junction tables for many-to-many relationships
type UserHobby struct {
	UserID  uint  `gorm:"primaryKey"`
	HobbyID uint  `gorm:"primaryKey"`
	Hobby   Hobby `gorm:"foreignKey:HobbyID"`
}

type UserInterest struct {
	UserID     uint     `gorm:"primaryKey"`
	InterestID uint     `gorm:"primaryKey"`
	Interest   Interest `gorm:"foreignKey:InterestID"`
}

type UserMusic struct {
	UserID       uint       `gorm:"primaryKey"`
	MusicGenreID uint       `gorm:"primaryKey"`
	MusicGenre   MusicGenre `gorm:"foreignKey:MusicGenreID"`
}

func (UserMusic) TableName() string {
	return "user_music"
}

type UserMovie struct {
	UserID       uint       `gorm:"primaryKey"`
	MovieGenreID uint       `gorm:"primaryKey"`
	MovieGenre   MovieGenre `gorm:"foreignKey:MovieGenreID"`
}

type UserFood struct {
	UserID           uint           `gorm:"primaryKey"`
	FoodPreferenceID uint           `gorm:"primaryKey"`
	FoodPreference   FoodPreference `gorm:"foreignKey:FoodPreferenceID"`
}

func (UserFood) TableName() string {
	return "user_food"
}

type UserTravel struct {
	UserID       uint       `gorm:"primaryKey"`
	TravelTypeID uint       `gorm:"primaryKey"`
	TravelType   TravelType `gorm:"foreignKey:TravelTypeID"`
}

func (UserTravel) TableName() string {
	return "user_travel"
}

type UserLanguage struct {
	UserID     uint     `gorm:"primaryKey"`
	LanguageID uint     `gorm:"primaryKey"`
	Language   Language `gorm:"foreignKey:LanguageID"`
}

// SeekingPreference model for user matching preferences
type SeekingPreference struct {
	gorm.Model
	UserID                 uint    `gorm:"uniqueIndex;not null;column:user_id"`
	MinAge                 int     `gorm:"default:18;column:min_age"`
	MaxAge                 int     `gorm:"default:99;column:max_age"`
	GenderPreference       *string `gorm:"column:gender_preference"`
	StatusPreference       *string `gorm:"column:status_preference"`
	RelationshipPreference *string `gorm:"column:relationship_preference"`
	LocationPreference     string  `gorm:"default:'within_city';column:location_preference"`
	MaxDistanceKm          int     `gorm:"default:50;column:max_distance_km"`

	// Preference values (what they're looking for)
	HobbyPreference     *string `gorm:"column:hobby_preference"`
	InterestPreference  *string `gorm:"column:interest_preference"`
	MusicPreference     *string `gorm:"column:music_preference"`
	MoviePreference     *string `gorm:"column:movie_preference"`
	FoodPreference      *string `gorm:"column:food_preference"`
	TravelPreference    *string `gorm:"column:travel_preference"`
	LanguagePreference  *string `gorm:"column:language_preference"`
	EthnicityPreference *string `gorm:"column:ethnicity_preference"`
	ReligionPreference  *string `gorm:"column:religion_preference"`

	// Weight values (priority levels)
	GenderWeight       int `gorm:"default:2;column:gender_weight"`
	StatusWeight       int `gorm:"default:2;column:status_weight"`
	RelationshipWeight int `gorm:"default:2;column:relationship_weight"`
	LocationWeight     int `gorm:"default:2;column:location_weight"`
	HobbiesWeight      int `gorm:"default:5;column:hobbies_weight"`
	InterestsWeight    int `gorm:"default:5;column:interests_weight"`
	MusicWeight        int `gorm:"default:3;column:music_weight"`
	MoviesWeight       int `gorm:"default:3;column:movies_weight"`
	FoodWeight         int `gorm:"default:2;column:food_weight"`
	TravelWeight       int `gorm:"default:4;column:travel_weight"`
	LanguagesWeight    int `gorm:"default:7;column:languages_weight"`
	EthnicityWeight    int `gorm:"default:6;column:ethnicity_weight"`
	ReligionWeight     int `gorm:"default:6;column:religion_weight"`
}

// Connection model for user connections
type Connection struct {
	gorm.Model
	RequesterID uint   `gorm:"not null"`
	ReceiverID  uint   `gorm:"not null"`
	Status      string `gorm:"default:'pending'"`

	Requester User `gorm:"foreignKey:RequesterID"`
	Receiver  User `gorm:"foreignKey:ReceiverID"`
	Chat      *Chat
}

// Chat model for messaging
type Chat struct {
	gorm.Model
	ConnectionID uint `gorm:"uniqueIndex;not null"`

	Connection Connection `gorm:"foreignKey:ConnectionID"`
	Messages   []Message  `gorm:"foreignKey:ChatID"`
}

// Message model for chat messages
type Message struct {
	gorm.Model
	ChatID   uint   `gorm:"not null"`
	SenderID uint   `gorm:"not null"`
	Content  string `gorm:"not null"`
	IsRead   bool   `gorm:"default:false"`

	Chat   Chat `gorm:"foreignKey:ChatID"`
	Sender User `gorm:"foreignKey:SenderID"`
}

// DismissedRecommendation model for tracking dismissed profiles
type DismissedRecommendation struct {
	gorm.Model
	UserID          uint `gorm:"not null"`
	DismissedUserID uint `gorm:"not null"`

	User          User `gorm:"foreignKey:UserID"`
	DismissedUser User `gorm:"foreignKey:DismissedUserID"`
}

// OnlineStatus model for user online presence
type OnlineStatus struct {
	gorm.Model
	UserID   uint `gorm:"uniqueIndex;not null"`
	IsOnline bool `gorm:"default:false"`
	LastSeen time.Time
}
