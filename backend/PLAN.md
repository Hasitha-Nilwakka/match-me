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

- [x] Create PostgreSQL database
- [x] Implement Prisma schema
- [x] Generate Prisma client
- [x] Populate reference tables with sample data

### Phase 2: Backend Development (Go)

- [x] Set up Go project structure
- [x] Implement user authentication
- [x] Create API endpoints
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

## Go models example

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
