# Tinder-like Dating Application

## 🚀 Full-Stack Development Plan

<div align="center">

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![Backend](https://img.shields.io/badge/Backend-Go-00ADD8)
![Frontend](https://img.shields.io/badge/Frontend-React%20TypeScript-61DAFB)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)

</div>

---

## 📋 Project Overview

> Building a modern, scalable dating application with intelligent matching algorithms and real-time communication features.

### 🎯 **Core Features**

<table>
<tr>
<td width="50%">

**🔐 Authentication & Security**

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Data privacy protection

</td>
<td width="50%">

**👤 User Experience**

- Rich user profiles
- Advanced preference settings
- Real-time messaging
- Smart recommendations

</td>
</tr>
<tr>
<td>

**🤝 Matching System**

- Weighted scoring algorithm
- Multi-criteria scoring
- Location-based filtering
- Compatibility analysis

</td>
<td>

**💬 Communication**

- Real-time chat
- Connection management
- Online status tracking
- Message notifications

</td>
</tr>
</table>

---

## 🗄️ Database Architecture (PostgreSQL + Prisma)

### Core Tables

| Table Name    | Description         | Key Fields                                            |
| ------------- | ------------------- | ----------------------------------------------------- |
| `users`       | User authentication | `id`, `email`, `password_hash`                        |
| `profiles`    | User profile data   | `user_id`, `first_name`, `last_name`, `bio`           |
| `locations`   | User location data  | `user_id`, `city`, `country`, `latitude`, `longitude` |
| `connections` | Connection requests | `requester_id`, `receiver_id`, `status`               |
| `chats`       | Chat sessions       | `connection_id`                                       |
| `messages`    | Chat messages       | `chat_id`, `sender_id`, `content`                     |

### Reference Tables (Predefined Options)

| Table Name         | Description        | Example Values           |
| ------------------ | ------------------ | ------------------------ |
| `hobbies`          | Predefined hobbies | Reading, Gaming, Hiking  |
| `interests`        | User interests     | Technology, Art, Sports  |
| `music_genres`     | Music preferences  | Pop, Rock, Jazz          |
| `movie_genres`     | Movie preferences  | Action, Comedy, Drama    |
| `food_preferences` | Food choices       | Italian, Mexican, Vegan  |
| `travel_types`     | Travel preferences | Beach, Mountains, City   |
| `languages`        | Spoken languages   | English, Spanish, French |

### Junction Tables (Many-to-Many)

| Table Name                | Purpose                         |
| ------------------------- | ------------------------------- |
| `user_hobbies`            | Links users to hobbies          |
| `user_interests`          | Links users to interests        |
| `user_music_preferences`  | Links users to music genres     |
| `user_movie_preferences`  | Links users to movie genres     |
| `user_food_preferences`   | Links users to food preferences |
| `user_travel_preferences` | Links users to travel types     |
| `user_languages`          | Links users to languages        |

---

## 🎯 Matching Algorithm Design

### Scoring Mechanism

The matching algorithm uses weighted scoring based on user preferences:

```go
func calculateMatchScore(userA, userB User) float64 {
    score := 0.0
    totalWeight := 0.0

    // Compare hobbies (weight: 5)
    commonHobbies := findCommonItems(userA.Hobbies, userB.Hobbies)
    score += float64(len(commonHobbies)) * 5
    totalWeight += 5

    // Compare interests (weight: 5)
    commonInterests := findCommonItems(userA.Interests, userB.Interests)
    score += float64(len(commonInterests)) * 5
    totalWeight += 5

    // Compare music preferences (weight: 3)
    commonMusic := findCommonItems(userA.MusicGenres, userB.MusicGenres)
    score += float64(len(commonMusic)) * 3
    totalWeight += 3

    // Add other categories...

    // Location distance penalty
    distance := calculateDistance(userA.Location, userB.Location)
    if distance > userA.Preferences.MaxDistance {
        score *= 0.3 // 70% penalty for distant matches
    }

    return (score / totalWeight) * 100
}
```

### Priority Weights

Users can set importance levels for different criteria:

| Category  | Priority | Weight |
| --------- | -------- | ------ |
| Hobbies   | ★★★★★    | 5      |
| Interests | ★★★★★    | 5      |
| Languages | ★★★★★★★  | 7      |
| Ethnicity | ★★★★★★   | 6      |
| Religion  | ★★★★★★   | 6      |
| Travel    | ★★★★☆    | 4      |
| Music     | ★★★☆☆    | 3      |
| Movies    | ★★★☆☆    | 3      |
| Food      | ★★☆☆☆    | 2      |

---

## 🔐 Security & Privacy

### 🛡️ **Data Protection Standards**

<table>
<tr>
<td width="50%">

**🔒 Authentication Security**

- 🔐 Bcrypt password hashing (12 salt rounds)
- 🎫 JWT tokens with expiration
- 🔄 Refresh token rotation
- 🚫 Account lockout after failed attempts

</td>
<td width="50%">

**🛡️ Data Privacy**

- 📧 Email addresses never exposed
- 🔒 Profile data access control
- 🗑️ Right to be forgotten (GDPR)
- 📊 Anonymous analytics only

</td>
</tr>
</table>

### 🎯 **Access Control Matrix**

| 👤 **User Type** | 📝 **Profile Access**  | 💬 **Messaging**    | 📍 **Location**   | 🔍 **Discovery**    |
| ---------------- | ---------------------- | ------------------- | ----------------- | ------------------- |
| **Unmatched**    | Basic info only        | ❌ No access        | City level only   | In recommendations  |
| **Requested**    | Full profile           | ❌ Pending approval | City level only   | Visible in requests |
| **Connected**    | Full profile + updates | ✅ Full access      | Precise if shared | Private             |
| **Blocked**      | ❌ No access           | ❌ No access        | ❌ Hidden         | ❌ Excluded         |

---

## 📱 API Architecture

### 🌐 **RESTful Endpoint Structure**

<details>
<summary><strong>🔍 Authentication Endpoints</strong></summary>

| Method | Endpoint                | Description            | Auth Required |
| ------ | ----------------------- | ---------------------- | ------------- |
| `POST` | `/auth/register`        | Create new account     | ❌            |
| `POST` | `/auth/login`           | User authentication    | ❌            |
| `POST` | `/auth/refresh`         | Refresh JWT token      | ✅            |
| `POST` | `/auth/logout`          | Invalidate session     | ✅            |
| `POST` | `/auth/forgot-password` | Password reset request | ❌            |
| `POST` | `/auth/reset-password`  | Confirm password reset | ❌            |

</details>

<details>
<summary><strong>👤 User & Profile Endpoints</strong></summary>

| Method   | Endpoint                | Description          | Auth Required |
| -------- | ----------------------- | -------------------- | ------------- |
| `GET`    | `/users/me`             | Current user info    | ✅            |
| `PUT`    | `/users/me`             | Update user settings | ✅            |
| `DELETE` | `/users/me`             | Delete account       | ✅            |
| `GET`    | `/users/{id}/profile`   | Get user profile     | ✅            |
| `PUT`    | `/profiles/me`          | Update profile       | ✅            |
| `POST`   | `/profiles/photos`      | Upload photos        | ✅            |
| `PUT`    | `/profiles/preferences` | Update preferences   | ✅            |

</details>

<details>
<summary><strong>🎯 Matching & Discovery</strong></summary>

| Method | Endpoint                        | Description              | Auth Required |
| ------ | ------------------------------- | ------------------------ | ------------- |
| `GET`  | `/recommendations`              | Get match suggestions    | ✅            |
| `POST` | `/recommendations/{id}/like`    | Like a profile           | ✅            |
| `POST` | `/recommendations/{id}/dismiss` | Dismiss a profile        | ✅            |
| `GET`  | `/matches`                      | Get current matches      | ✅            |
| `GET`  | `/connections`                  | Get all connections      | ✅            |
| `PUT`  | `/connections/{id}`             | Update connection status | ✅            |

</details>

<details>
<summary><strong>💬 Messaging System</strong></summary>

| Method   | Endpoint               | Description       | Auth Required |
| -------- | ---------------------- | ----------------- | ------------- |
| `GET`    | `/chats`               | Get user's chats  | ✅            |
| `GET`    | `/chats/{id}/messages` | Get chat messages | ✅            |
| `POST`   | `/chats/{id}/messages` | Send message      | ✅            |
| `PUT`    | `/messages/{id}/read`  | Mark as read      | ✅            |
| `DELETE` | `/messages/{id}`       | Delete message    | ✅            |

</details>

---

## 🚀 Implementation Roadmap

### Phase 1: Database Setup (Current)

- [ ] Create PostgreSQL database
- [ ] Implement Prisma schema
- [ ] Generate Prisma client
- [ ] Populate reference tables with sample data

### Phase 2: Backend Development (Go)

- [ ] Set up Go project structure
- [ ] Implement user authentication
- [ ] Create API endpoints
- [ ] Implement matching algorithm
- [ ] Add real-time chat with WebSockets

### Phase 3: Frontend Development (TypeScript)

- [ ] Set up React/TypeScript project
- [ ] Implement responsive UI components
- [ ] Add swipe functionality
- [ ] Implement chat interface
- [ ] Add push notifications

### Phase 4: Testing & Deployment

- [ ] Write unit and integration tests
- [ ] Performance testing
- [ ] Deploy to production
- [ ] Monitor and optimize

---

<details>
<summary><strong>🔍 Click to view Go Models (GORM)</strong></summary>

## Go models

```go
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
    ConnectionsFrom   []Connection `gorm:"foreignKey:RequesterID"`
    ConnectionsTo     []Connection `gorm:"foreignKey:ReceiverID"`
    Messages          []Message
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
    UserID            uint   `gorm:"uniqueIndex;not null"`
    ProfilePictureURL string `gorm:"default:'👤'"`
    FirstName         string
    LastName          string
    Gender            *string
    Status            *string
    RelationshipStatus *string
    AboutMe           *string
    Ethnicity         *string
    Religion          *string
}

// Location model for user location data
type Location struct {
    gorm.Model
    UserID            uint    `gorm:"uniqueIndex;not null"`
    City              *string
    Country           *string
    Latitude          *float64
    Longitude         *float64
    LocationPreference string  `gorm:"default:'within_city'"`
    RadiusKm          int     `gorm:"default:50"`
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
    UserID      uint `gorm:"primaryKey"`
    MovieGenreID uint `gorm:"primaryKey"`
}

type UserFood struct {
    UserID           uint `gorm:"primaryKey"`
    FoodPreferenceID uint `gorm:"primaryKey"`
}

type UserTravel struct {
    UserID      uint `gorm:"primaryKey"`
    TravelTypeID uint `gorm:"primaryKey"`
}

type UserLanguage struct {
    UserID     uint `gorm:"primaryKey"`
    LanguageID uint `gorm:"primaryKey"`
}

// SeekingPreference model for user matching preferences
type SeekingPreference struct {
    gorm.Model
    UserID               uint   `gorm:"uniqueIndex;not null"`
    MinAge               int    `gorm:"default:18"`
    MaxAge               int    `gorm:"default:99"`
    GenderPreference     *string
    StatusPreference     *string
    RelationshipPreference *string
    LocationPreference   string `gorm:"default:'within_city'"`
    MaxDistanceKm        int    `gorm:"default:50"`
    HobbiesWeight        int    `gorm:"default:5"`
    InterestsWeight      int    `gorm:"default:5"`
    MusicWeight          int    `gorm:"default:3"`
    MoviesWeight         int    `gorm:"default:3"`
    FoodWeight           int    `gorm:"default:2"`
    TravelWeight         int    `gorm:"default:4"`
    LanguagesWeight      int    `gorm:"default:7"`
    EthnicityWeight      int    `gorm:"default:6"`
    ReligionWeight       int    `gorm:"default:6"`
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

    Connection Connection
    Messages   []Message
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

```

</details>

<details>
<summary><strong>🔍 Click to view Prisma Schema</strong></summary>

## Prisma schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @default(now())
  lastLogin    DateTime?
  isActive     Boolean   @default(true)

  // Relations
  profile           Profile?
  location          Location?
  seekingPreference SeekingPreference?
  connectionsFrom   Connection[] @relation("ConnectionRequester")
  connectionsTo     Connection[] @relation("ConnectionReceiver")
  messages          Message[]
  dismissedFrom     DismissedRecommendation[] @relation("DismissedByUser")
  dismissedTo       DismissedRecommendation[] @relation("DismissedUser")
  onlineStatus      OnlineStatus?
  userHobbies       UserHobby[]
  userInterests     UserInterest[]
  userMusic         UserMusic[]
  userMovies        UserMovie[]
  userFood          UserFood[]
  userTravel        UserTravel[]
  userLanguages     UserLanguage[]

  @@map("users")
}

model Profile {
  id                Int      @id @default(autoincrement())
  userId            Int      @unique
  profilePictureUrl String   @default("👤")
  firstName         String?
  lastName          String?
  gender            String?
  status            String?
  relationshipStatus String?
  aboutMe           String?
  ethnicity         String?
  religion          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("profiles")
}

model Location {
  id                 Int      @id @default(autoincrement())
  userId             Int      @unique
  city               String?
  country            String?
  latitude           Float?
  longitude          Float?
  locationPreference String   @default("within_city")
  radiusKm           Int      @default(50)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("locations")
}

// Reference Tables with Predefined Options
model Hobby {
  id       Int    @id @default(autoincrement())
  name     String @unique
  category String?

  userHobbies UserHobby[]

  @@map("hobbies")
}

model Interest {
  id   Int    @id @default(autoincrement())
  name String @unique

  userInterests UserInterest[]

  @@map("interests")
}

model MusicGenre {
  id   Int    @id @default(autoincrement())
  name String @unique

  userMusic UserMusic[]

  @@map("music_genres")
}

model MovieGenre {
  id   Int    @id @default(autoincrement())
  name String @unique

  userMovies UserMovie[]

  @@map("movie_genres")
}

model FoodPreference {
  id   Int    @id @default(autoincrement())
  name String @unique

  userFood UserFood[]

  @@map("food_preferences")
}

model TravelType {
  id   Int    @id @default(autoincrement())
  name String @unique

  userTravel UserTravel[]

  @@map("travel_types")
}

model Language {
  id   Int    @id @default(autoincrement())
  name String @unique
  code String @unique

  userLanguages UserLanguage[]

  @@map("languages")
}

// Junction Tables for Many-to-Many Relationships
model UserHobby {
  userId  Int
  hobbyId Int

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  hobby Hobby @relation(fields: [hobbyId], references: [id], onDelete: Cascade)

  @@id([userId, hobbyId])
  @@map("user_hobbies")
}

model UserInterest {
  userId     Int
  interestId Int

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  interest Interest @relation(fields: [interestId], references: [id], onDelete: Cascade)

  @@id([userId, interestId])
  @@map("user_interests")
}

model UserMusic {
  userId        Int
  musicGenreId  Int

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  musicGenre MusicGenre @relation(fields: [musicGenreId], references: [id], onDelete: Cascade)

  @@id([userId, musicGenreId])
  @@map("user_music_preferences")
}

model UserMovie {
  userId       Int
  movieGenreId Int

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  movieGenre MovieGenre @relation(fields: [movieGenreId], references: [id], onDelete: Cascade)

  @@id([userId, movieGenreId])
  @@map("user_movie_preferences")
}

model UserFood {
  userId           Int
  foodPreferenceId Int

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  foodPreference FoodPreference @relation(fields: [foodPreferenceId], references: [id], onDelete: Cascade)

  @@id([userId, foodPreferenceId])
  @@map("user_food_preferences")
}

model UserTravel {
  userId      Int
  travelTypeId Int

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  travelType TravelType @relation(fields: [travelTypeId], references: [id], onDelete: Cascade)

  @@id([userId, travelTypeId])
  @@map("user_travel_preferences")
}

model UserLanguage {
  userId     Int
  languageId Int

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  language Language @relation(fields: [languageId], references: [id], onDelete: Cascade)

  @@id([userId, languageId])
  @@map("user_languages")
}

model SeekingPreference {
  id                     Int    @id @default(autoincrement())
  userId                 Int    @unique
  minAge                 Int    @default(18)
  maxAge                 Int    @default(99)
  genderPreference       String?
  statusPreference       String?
  relationshipPreference String?
  locationPreference     String @default("within_city")
  maxDistanceKm          Int    @default(50)
  hobbiesWeight          Int    @default(5)
  interestsWeight        Int    @default(5)
  musicWeight            Int    @default(3)
  moviesWeight           Int    @default(3)
  foodWeight             Int    @default(2)
  travelWeight           Int    @default(4)
  languagesWeight        Int    @default(7)
  ethnicityWeight        Int    @default(6)
  religionWeight         Int    @default(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("seeking_preferences")
}

model Connection {
  id           Int       @id @default(autoincrement())
  requesterId  Int
  receiverId   Int
  status       String    @default("pending")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @default(now())

  requester User @relation("ConnectionRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  receiver  User @relation("ConnectionReceiver", fields: [receiverId], references: [id], onDelete: Cascade)
  chat      Chat?

  @@unique([requesterId, receiverId])
  @@map("connections")
}

model Chat {
  id           Int       @id @default(autoincrement())
  connectionId Int       @unique
  createdAt    DateTime  @default(now())

  connection Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  messages   Message[]

  @@map("chats")
}

model Message {
  id        Int      @id @default(autoincrement())
  chatId    Int
  senderId  Int
  content   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  chat   Chat @relation(fields: [chatId], references: [id], onDelete: Cascade)
  sender User @relation(fields: [senderId], references: [id], onDelete: Cascade)

  @@map("messages")
}

model DismissedRecommendation {
  id               Int      @id @default(autoincrement())
  userId           Int
  dismissedUserId  Int
  dismissedAt      DateTime @default(now())

  user          User @relation("DismissedByUser", fields: [userId], references: [id], onDelete: Cascade)
  dismissedUser User @relation("DismissedUser", fields: [dismissedUserId], references: [id], onDelete: Cascade)

  @@unique([userId, dismissedUserId])
  @@map("dismissed_recommendations")
}

model OnlineStatus {
  id        Int      @id @default(autoincrement())
  userId    Int      @unique
  isOnline  Boolean  @default(false)
  lastSeen  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("online_status")
}
```

</details>

## 📊 Sample Data for Reference Tables

### Hobbies

````sql
INSERT INTO hobbies (name, category) VALUES
('Reading', 'Indoor'),
('Gaming', 'Indoor'),
('Hiking', 'Outdoor'),
('Photography', 'Creative'),
('Cooking', 'Creative');

### Music Genres

```sql
INSERT INTO music_genres (name) VALUES
('Pop'),
('Rock'),
('Hip Hop'),
('Jazz'),
('Classical');
````

### Food Preferences

```sql
INSERT INTO food_preferences (name) VALUES
('Italian'),
('Mexican'),
('Chinese'),
('Indian'),
('Vegetarian');
```

---

## 🔧 Technical Stack

### Backend

- **Language**: Go
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Real-time**: WebSockets

### Frontend

- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Real-time**: Socket.io

### DevOps

- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: AWS/Digital Ocean
- **Monitoring**: Prometheus + Grafana
