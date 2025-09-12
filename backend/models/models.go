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
	UserID  uint `gorm:"primaryKey"`
	HobbyID uint `gorm:"primaryKey"`
}

type UserInterest struct {
	UserID     uint `gorm:"primaryKey"`
	InterestID uint `gorm:"primaryKey"`
}

type UserMusic struct {
	UserID       uint `gorm:"primaryKey"`
	MusicGenreID uint `gorm:"primaryKey"`
}

type UserMovie struct {
	UserID       uint `gorm:"primaryKey"`
	MovieGenreID uint `gorm:"primaryKey"`
}

type UserFood struct {
	UserID           uint `gorm:"primaryKey"`
	FoodPreferenceID uint `gorm:"primaryKey"`
}

type UserTravel struct {
	UserID       uint `gorm:"primaryKey"`
	TravelTypeID uint `gorm:"primaryKey"`
}

type UserLanguage struct {
	UserID     uint `gorm:"primaryKey"`
	LanguageID uint `gorm:"primaryKey"`
}

// SeekingPreference model for user matching preferences
type SeekingPreference struct {
	gorm.Model
	UserID                 uint `gorm:"uniqueIndex;not null"`
	MinAge                 int  `gorm:"default:18"`
	MaxAge                 int  `gorm:"default:99"`
	GenderPreference       *string
	StatusPreference       *string
	RelationshipPreference *string
	LocationPreference     string `gorm:"default:'within_city'"`
	MaxDistanceKm          int    `gorm:"default:50"`
	HobbiesWeight          int    `gorm:"default:5"`
	InterestsWeight        int    `gorm:"default:5"`
	MusicWeight            int    `gorm:"default:3"`
	MoviesWeight           int    `gorm:"default:3"`
	FoodWeight             int    `gorm:"default:2"`
	TravelWeight           int    `gorm:"default:4"`
	LanguagesWeight        int    `gorm:"default:7"`
	EthnicityWeight        int    `gorm:"default:6"`
	ReligionWeight         int    `gorm:"default:6"`
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
