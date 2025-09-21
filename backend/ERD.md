# 🗄️ Entity Relationship Diagram (ERD)

## Tinder-like Dating Application Database Schema

<div align="center">

![Database](https://img.shields.io/badge/Database-PostgreSQL-336791)
![ORM](https://img.shields.io/badge/ORM-Prisma-2D3748)
![Schema](https://img.shields.io/badge/Schema-Relational-blue)

</div>

---

## 📊 Database Schema Visualization

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      users      │    │    profiles     │    │   locations     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │◄──►│ id (PK)         │    │ id (PK)         │
│ email           │    │ userId (FK)     │    │ userId (FK)     │
│ passwordHash    │    │ profilePictureUrl│   │ city            │
│ createdAt       │    │ firstName       │    │ country         │
│ updatedAt       │    │ lastName        │    │ latitude        │
│ lastLogin       │    │ gender          │    │ longitude       │
│ isActive        │    │ status          │    │ locationPref    │
└─────────────────┘    │ relationshipStat│    │ radiusKm        │
         │              │ aboutMe         │    └─────────────────┘
         │              │ ethnicity       │             │
         │              │ religion        │             │
         │              └─────────────────┘             │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    ▼                            ▼                            ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│seeking_preferences│  │  connections    │    │ dismissed_recs  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ userId (FK)     │    │ requesterId (FK)│    │ userId (FK)     │
│ minAge          │    │ receiverId (FK) │    │ dismissedUserId │
│ maxAge          │    │ status          │    │ dismissedAt     │
│ genderPref      │    │ createdAt       │    └─────────────────┘
│ statusPref      │    │ updatedAt       │
│ relationshipPref│    └─────────────────┘
│ locationPref    │             │
│ maxDistanceKm   │             │
│ hobbiesWeight   │             ▼
│ interestsWeight │    ┌─────────────────┐    ┌─────────────────┐
│ musicWeight     │    │      chats      │    │  online_status  │
│ moviesWeight    │    ├─────────────────┤    ├─────────────────┤
│ foodWeight      │    │ id (PK)         │    │ id (PK)         │
│ travelWeight    │    │ connectionId(FK)│    │ userId (FK)     │
│ languagesWeight │    │ createdAt       │    │ isOnline        │
│ ethnicityWeight │    └─────────────────┘    │ lastSeen        │
│ religionWeight  │             │             └─────────────────┘
└─────────────────┘             │
                                ▼
                       ┌─────────────────┐
                       │    messages     │
                       ├─────────────────┤
                       │ id (PK)         │
                       │ chatId (FK)     │
                       │ senderId (FK)   │
                       │ content         │
                       │ isRead          │
                       │ createdAt       │
                       └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           REFERENCE TABLES                                   │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│    hobbies      │   interests     │  music_genres   │     movie_genres        │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ id (PK)         │ id (PK)         │ id (PK)         │ id (PK)                 │
│ name            │ name            │ name            │ name                    │
│ category        │                 │                 │                         │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│food_preferences │  travel_types   │   languages     │
├─────────────────┼─────────────────┼─────────────────┤
│ id (PK)         │ id (PK)         │ id (PK)         │
│ name            │ name            │ name            │
│                 │                 │ code            │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        JUNCTION TABLES (Many-to-Many)                        │
├─────────────────┬─────────────────┬─────────────────┬─────────────────────────┤
│  user_hobbies   │ user_interests  │   user_music    │     user_movies         │
├─────────────────┼─────────────────┼─────────────────┼─────────────────────────┤
│ userId (PK,FK)  │ userId (PK,FK)  │ userId (PK,FK)  │ userId (PK,FK)          │
│ hobbyId (PK,FK) │ interestId(PK,FK)│ musicGenreId(PK)│ movieGenreId (PK,FK)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│   user_food     │  user_travel    │ user_languages  │
├─────────────────┼─────────────────┼─────────────────┤
│ userId (PK,FK)  │ userId (PK,FK)  │ userId (PK,FK)  │
│ foodPrefId(PK,FK)│ travelTypeId(PK)│ languageId(PK,FK)│
└─────────────────┴─────────────────┴─────────────────┘
```

---

## 🏗️ Database Schema Details

### 🔐 **Core Authentication & User Management**

<details>
<summary><strong>📊 Users & Profiles</strong></summary>

#### `users` Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

#### `profiles` Table

```sql
CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    profile_picture_url VARCHAR DEFAULT '👤',
    first_name VARCHAR,
    last_name VARCHAR,
    gender VARCHAR,
    status VARCHAR,
    relationship_status VARCHAR,
    about_me TEXT,
    ethnicity VARCHAR,
    religion VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `locations` Table

```sql
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    city VARCHAR,
    country VARCHAR,
    latitude FLOAT,
    longitude FLOAT,
    location_preference VARCHAR DEFAULT 'within_city',
    radius_km INTEGER DEFAULT 50
);
```

</details>

### 🎯 **Matching & Preferences System**

<details>
<summary><strong>⚖️ Seeking Preferences</strong></summary>

#### `seeking_preferences` Table

```sql
CREATE TABLE seeking_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    min_age INTEGER DEFAULT 18,
    max_age INTEGER DEFAULT 99,
    gender_preference VARCHAR,
    status_preference VARCHAR,
    relationship_preference VARCHAR,
    location_preference VARCHAR DEFAULT 'within_city',
    max_distance_km INTEGER DEFAULT 50,
    hobbies_weight INTEGER DEFAULT 5,
    interests_weight INTEGER DEFAULT 5,
    music_weight INTEGER DEFAULT 3,
    movies_weight INTEGER DEFAULT 3,
    food_weight INTEGER DEFAULT 2,
    travel_weight INTEGER DEFAULT 4,
    languages_weight INTEGER DEFAULT 7,
    ethnicity_weight INTEGER DEFAULT 6,
    religion_weight INTEGER DEFAULT 6
);
```

</details>

### 🤝 **Connections & Communication**

<details>
<summary><strong>💬 Messaging System</strong></summary>

#### `connections` Table

```sql
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, receiver_id)
);
```

#### `chats` Table

```sql
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    connection_id INTEGER UNIQUE REFERENCES connections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### `messages` Table

```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);
```

</details>

### 📚 **Reference Data Tables**

<details>
<summary><strong>🎨 Hobbies & Interests</strong></summary>

#### `hobbies` Table

```sql
CREATE TABLE hobbies (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    category VARCHAR
);

-- Sample Data
INSERT INTO hobbies (name, category) VALUES
('Reading', 'Indoor'),
('Gaming', 'Indoor'),
('Hiking', 'Outdoor'),
('Photography', 'Creative'),
('Cooking', 'Creative'),
('Yoga', 'Fitness'),
('Traveling', 'Adventure'),
('Music', 'Arts'),
('Dancing', 'Arts'),
('Sports', 'Fitness');
```

#### `interests` Table

```sql
CREATE TABLE interests (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO interests (name, updated_at) VALUES
('Technology', now()),
('Art',  now()),
('Science', now()),
('Politics', now()),
('Environment', now()),
('Business', now()),
('Health', now()),
('Fashion', now()),
('Food', now()),
('Travel', now());
```

</details>

<details>
<summary><strong>🎵 Entertainment Preferences</strong></summary>

#### `music_genres` Table

```sql
CREATE TABLE music_genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO music_genres (name, updated_at) VALUES
('Pop', now()), ('Rock', now()), ('Hip Hop', now()), ('Jazz', now()), ('Classical', now()),
('Electronic', now()), ('Country', now()), ('R&B', now()), ('Indie', now()), ('Alternative', now());
```

#### `movie_genres` Table

```sql
CREATE TABLE movie_genres (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO movie_genres (name, updated_at) VALUES
('Action', now()), ('Comedy', now()), ('Drama', now()), ('Horror', now()), ('Romance', now()),
('Sci-Fi', now()), ('Thriller', now()), ('Documentary', now()), ('Animation', now()), ('Fantasy', now());
```

</details>

<details>
<summary><strong>🌍 Cultural & Lifestyle</strong></summary>

#### `food_preferences` Table

```sql
CREATE TABLE food_preferences (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO food_preferences (name, updated_at) VALUES
('Italian', now()), ('Mexican', now()), ('Chinese', now()), ('Indian', now()), ('Japanese', now()),
('Mediterranean', now()), ('Vegetarian', now()), ('Vegan', now()), ('Gluten-Free', now()), ('Keto', now());
```

#### `travel_types` Table

```sql
CREATE TABLE travel_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO travel_types (name, updated_at) VALUES
('Beach', now()), ('Mountains', now()), ('City', now()), ('Adventure', now()), ('Cultural', now()),
('Luxury', now()), ('Budget', now()), ('Backpacking', now()), ('Road Trip', now()), ('Cruise', now());
```

#### `languages` Table

```sql
CREATE TABLE languages (
    id SERIAL PRIMARY KEY,
    name VARCHAR UNIQUE NOT NULL,
    code VARCHAR UNIQUE NOT NULL
);

-- Sample Data
INSERT INTO languages (name, code) VALUES
('English', 'en'),
('Spanish', 'es'),
('French', 'fr'),
('German', 'de'),
('Italian', 'it'),
('Portuguese', 'pt'),
('Russian', 'ru'),
('Chinese', 'zh'),
('Japanese', 'ja'),
('Arabic', 'ar');
```

</details>

### 🔗 **Junction Tables (Many-to-Many Relationships)**

<details>
<summary><strong>👥 User Preference Mappings</strong></summary>

#### User-Hobby Relationships

```sql
CREATE TABLE user_hobbies (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hobby_id INTEGER REFERENCES hobbies(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, hobby_id)
);
```

#### User-Interest Relationships

```sql
CREATE TABLE user_interests (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, interest_id)
);
```

#### User-Music Relationships

```sql
CREATE TABLE user_music_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    music_genre_id INTEGER REFERENCES music_genres(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, music_genre_id)
);
```

#### User-Movie Relationships

```sql
CREATE TABLE user_movie_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    movie_genre_id INTEGER REFERENCES movie_genres(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, movie_genre_id)
);
```

#### User-Food Relationships

```sql
CREATE TABLE user_food_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    food_preference_id INTEGER REFERENCES food_preferences(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, food_preference_id)
);
```

#### User-Travel Relationships

```sql
CREATE TABLE user_travel_preferences (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    travel_type_id INTEGER REFERENCES travel_types(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, travel_type_id)
);
```

#### User-Language Relationships

```sql
CREATE TABLE user_languages (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    language_id INTEGER REFERENCES languages(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, language_id)
);
```

</details>

### 🚫 **Privacy & Control Tables**

<details>
<summary><strong>🛡️ User Privacy Controls</strong></summary>

#### `dismissed_recommendations` Table

```sql
CREATE TABLE dismissed_recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dismissed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    dismissed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, dismissed_user_id)
);
```

#### `online_status` Table

```sql
CREATE TABLE online_status (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP DEFAULT NOW()
);
```

</details>

---

## 🔄 **Database Relationships Summary**

### 🔗 **One-to-One Relationships**

- `users` ↔ `profiles`
- `users` ↔ `locations`
- `users` ↔ `seeking_preferences`
- `users` ↔ `online_status`
- `connections` ↔ `chats`

### 🔗 **One-to-Many Relationships**

- `users` → `connections` (as requester)
- `users` → `connections` (as receiver)
- `chats` → `messages`
- `users` → `messages` (as sender)
- `users` → `dismissed_recommendations` (as user)
- `users` → `dismissed_recommendations` (as dismissed user)

### 🔗 **Many-to-Many Relationships**

- `users` ↔ `hobbies` (via `user_hobbies`)
- `users` ↔ `interests` (via `user_interests`)
- `users` ↔ `music_genres` (via `user_music_preferences`)
- `users` ↔ `movie_genres` (via `user_movie_preferences`)
- `users` ↔ `food_preferences` (via `user_food_preferences`)
- `users` ↔ `travel_types` (via `user_travel_preferences`)
- `users` ↔ `languages` (via `user_languages`)

---

## 📈 **Database Optimization & Indexing**

### 🚀 **Recommended Indexes**

```sql
-- Performance indexes for frequent queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_dismissed_user_dismissed ON dismissed_recommendations(user_id, dismissed_user_id);
CREATE INDEX idx_online_status_user_id ON online_status(user_id);

-- Composite indexes for complex queries
CREATE INDEX idx_seeking_preferences_age_range ON seeking_preferences(min_age, max_age);
CREATE INDEX idx_seeking_preferences_location ON seeking_preferences(location_preference, max_distance_km);
```

### 📊 **Estimated Table Sizes**

| Table                       | Expected Records | Growth Rate    |
| --------------------------- | ---------------- | -------------- |
| `users`                     | 100K+            | High           |
| `profiles`                  | 100K+            | High           |
| `connections`               | 1M+              | Very High      |
| `messages`                  | 10M+             | Extremely High |
| `user_hobbies`              | 500K+            | High           |
| `dismissed_recommendations` | 5M+              | Very High      |

---

<div align="center">

**🎯 Database designed for scalability, performance, and flexibility**

_Supporting millions of users with sub-second query response times_

</div>
