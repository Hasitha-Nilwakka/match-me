# Match Me - Dating App

A modern dating application built with Go backend and Next.js frontend.

## Project Structure

```
match-me/
├── backend/           # Go backend with GORM
│   ├── main.go        # Main application
│   ├── db/            # Database configuration
│   ├── models/        # GORM models
│   ├── .env           # Backend environment variables
│   └── go.mod         # Go dependencies
├── frontend/          # Next.js frontend with Prisma
│   ├── app/           # Next.js app directory
│   ├── prisma/        # Prisma schema and migrations
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── .env           # Frontend environment variables
│   └── package.json   # Node dependencies
```

## Setup Instructions

### Prerequisites

- PostgreSQL database
- Go 1.24+
- Node.js 18+
- npm or pnpm

### Database Setup

#### 1. Install PostgreSQL (if not already installed)

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**

```bash
brew install postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

#### 2. Start PostgreSQL Service

```bash
# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql

# macOS
brew services start postgresql
```

#### 3. Create Database and User

Connect to PostgreSQL as the postgres user:

```bash
sudo -u postgres psql
```

Run these SQL commands in the PostgreSQL shell:

```sql
-- Create a user for your application
CREATE USER matchme_user WITH PASSWORD 'your_secure_password';

-- Grant CREATEDB permission (needed for Prisma migrations)
ALTER USER matchme_user CREATEDB;

-- Create the database
CREATE DATABASE match_me_db OWNER matchme_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE match_me_db TO matchme_user;

-- Exit PostgreSQL shell
\q
```

#### 4. Update Environment Variables

Update the `DATABASE_URL` in both `.env` files with your credentials:

**Backend (.env):**

```env
DATABASE_URL="postgresql://matchme_user:your_secure_password@localhost:5432/match_me_db?sslmode=disable"
```

**Frontend (.env):**

```env
DATABASE_URL="postgresql://matchme_user:your_secure_password@localhost:5432/match_me_db?schema=public"
NEXTAUTH_SECRET="your-nextauth-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### Backend Setup (Go + GORM)

```bash
cd backend
go mod tidy
go run .
```

### Frontend Setup (Next.js + Prisma)

```bash
cd frontend
npm install
npx prisma generate
npx prisma migrate dev --name init  # Create and run initial migration
npm run db:seed                     # Seed initial data
npm run dev                         # Start development server
```

- We could make everything work with one command using a script, but for now, we keep them separate.
- You must first generate the database and run migrations/seed before starting developing the backend or frontend.
- Everytime we need to change the Prisma schema, we must run `npx prisma migrate dev` and `npx prisma generate` again.
- Now the app works so that frontend (Prisma) only modifies and initializes the schema and the backend (GORM) uses CRUD operations to modify or read the actual PostreSQL database.

### Database Management

#### View and Edit Data with Prisma Studio

Prisma Studio provides a visual interface to browse and edit your database:

```bash
cd frontend
npx prisma studio
# OR
npm run db:studio
```

This will open a web interface at `http://localhost:5555` where you can:

- 📊 **Browse all tables** and their data
- ✏️ **Add, edit, and delete records**
- 🔍 **Filter and search** through your data
- 🔗 **Navigate relationships** between tables

#### Other Useful Database Commands

```bash
# Check migration status
npx prisma migrate status

# Create a new migration after schema changes
npx prisma migrate dev --name your_migration_name

# Reset database (⚠️ DESTRUCTIVE - only in development)
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate

# Push schema changes without migration files
npx prisma db push
```

## Database Schema

The Prisma schema mirrors GORM models and includes:

- **User Management**: Users, Profiles, Locations
- **Preferences**: SeekingPreferences with weighted matching criteria
- **Social Features**: Connections, Messages, Chats
- **User Interests**: Hobbies, Interests, Music, Movies, Food, Travel, Languages
- **Matching System**: DismissedRecommendations, OnlineStatus

## Key Features

- **Type-safe database access** with Prisma Client
- **Real-time messaging** support
- **Advanced matching algorithm** with weighted preferences
- **Location-based matching**
- **Rich user profiles** with multiple interest categories
- **Connection management** system

## Available Scripts (Frontend)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (visual database browser)
- `npm run db:seed` - Seed database with initial data

