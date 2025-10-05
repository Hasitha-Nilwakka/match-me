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

### Network Access & Multi-Device Testing

For testing on multiple devices (mobile phones, tablets, other computers) on your local WiFi network:

#### Quick Start (Recommended)
```bash
./start-network.sh
```

#### Manual Setup
```bash
# Start backend (from project root)
cd backend && go run .

# Start frontend with network access (in new terminal)
cd frontend && NEXT_PUBLIC_API_URL="http://YOUR_LOCAL_IP:8080" npm run dev
```

#### Access Points
- **Local computer**: `http://localhost:3000`
- **Other devices**: `http://YOUR_LOCAL_IP:3000` (replace with your actual IP)

#### Features Available on Network
- ✅ **Full app functionality** across all devices
- ✅ **Real-time chat** with WebSocket support
- ✅ **Mobile-responsive design** optimized for phones/tablets
- ✅ **Synchronized data** across all connected devices
- ✅ **Multi-user testing** - Multiple people can use the app simultaneously  

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
- **Preferences**: SeekingPreferences with detailed preference values and weighted matching criteria
- **Social Features**: Connections, Messages, Chats
- **User Interests**: Hobbies, Interests, Music, Movies, Food, Travel, Languages
- **Matching System**: DismissedRecommendations, OnlineStatus

## Key Features

- **Type-safe database access** with Prisma Client
- **Real-time messaging** support with WebSocket chat system
- **Advanced matching algorithm** with weighted preferences and location-based filtering
- **Location-based matching** with Finnish municipality support
- **Rich user profiles** with multiple interest categories and multi-select bio data
- **Connection management** system (send requests, accept/reject, disconnect)
- **Comprehensive preference system** with both specific values and priority weights
- **Global floating chat (popup)** - All chat functionality (list, messages, typing, unread, delete) lives in a single popup component across all pages
- **Mobile-responsive design** - Works on desktop and mobile devices
- **Network access support** - Multi-device testing on local WiFi
- **Chat deletion** - Delete conversations with confirmation dialogs
- **Enhanced error handling** - Detailed debugging and user-friendly messages
 - **Chat search** - Filter chat list by user or last message; search inside a conversation with highlighting and next/prev navigation (Ctrl+F)

## Recent Updates

### Latest Features (v3.1) - October 2025

**💬 Chat UX Consolidation:**
- Removed separate chat pages; everything is handled in the floating popup (`ChatPopup`).
- Added chat list search and in-conversation search with highlighting and keyboard shortcuts (Ctrl+F, Esc).
- Fixed auto-opening behavior (no sticky chat after closing the popup).

**🧪 Testing:**
- Tests run against an in-memory SQLite DB for speed/isolation; production targets PostgreSQL.
- Two chat tests that exercise Postgres-specific INTERVAL SQL are automatically skipped on SQLite and run on Postgres CI.

### Previous (v3.0) - December 2024

**🎯 Mobile & Network Improvements:**
- **Mobile-responsive recommendations** - Fixed API URL handling for mobile devices
- **Network access support** - App now accessible across local WiFi network
- **Enhanced error handling** - Detailed debugging information and user-friendly messages
- **Global floating chat** - Persistent chat access across all authenticated pages

**💬 Chat System Enhancements:**
- **Real-time WebSocket chat** - Live messaging between connected users
- **Chat deletion functionality** - Delete conversations with confirmation dialogs
- **Chat history pagination** - Efficient loading of message history
- **Unread message indicators** - Visual notifications for new messages
- **Mobile-optimized chat UI** - Responsive design for all screen sizes

**🔧 Technical Improvements:**
- **Dynamic API URL resolution** - Supports both localhost and network access
- **Finnish test data** - 120 realistic Finnish profiles with real municipalities
- **Improved error categorization** - Better debugging for profile completion, auth issues
- **Network startup script** - Easy multi-device testing setup
- **Backend testing suite** - Unit tests for authentication and recommendations

### Enhanced Seeking Preferences System (v2.0)

The seeking preferences system has been significantly enhanced to provide more detailed and flexible matching:

**New Features:**
- **Detailed Preference Values**: Users can now specify exactly what they're looking for in each category (hobbies, interests, music, movies, food, travel, languages, ethnicity, religion)
- **Priority Weighting**: Each preference category can be assigned a priority level (1-3 scale) to indicate importance
- **Dual Data Structure**: The system now stores both what users are looking for AND how important each category is to them

**Technical Improvements:**
- Added 9 new preference value fields to the `seeking_preferences` table
- Added 4 new priority weight fields for basic preferences (gender, status, relationship, location)
- Updated both frontend and backend to handle the complete preference system
- Enhanced API endpoints to support full CRUD operations for all preference data

This enhancement enables more sophisticated matching algorithms that can prioritize certain preferences over others based on user-defined importance levels.

## Available Scripts (Frontend)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (visual database browser)
- `npm run db:seed` - Seed database with initial data

## Troubleshooting

### Common Issues

#### "Failed to fetch recommendations" Error
1. **Check if profile is complete** - Fill in First Name, Last Name, and other required fields
2. **Verify backend is running** - `cd backend && go run .`
3. **Check API URL** - For mobile: `NEXT_PUBLIC_API_URL="http://YOUR_LOCAL_IP:8080"`
4. **Check browser console** - Look for detailed error messages

#### Mobile Device Can't Connect
1. **Same WiFi network** - Ensure all devices are on the same network
2. **Check firewall** - Allow Node.js and Go through firewall
3. **Use IP address** - Replace `localhost` with your computer's local IP
4. **Verify ports** - Backend (8080) and Frontend (3000) should be accessible

#### WebSocket Connection Issues
1. **Check network settings** - WebSocket URLs should match API base URL
2. **Browser compatibility** - Modern browsers support WebSockets
3. **Firewall settings** - Ensure WebSocket traffic is allowed

#### Database Connection Problems
1. **PostgreSQL running** - `brew services start postgresql` (macOS)
2. **Correct credentials** - Check `.env` files for DATABASE_URL
3. **Database exists** - Run the database setup commands
4. **Migrations applied** - `npx prisma migrate dev`

### Getting Help

If you encounter issues:
1. **Check browser console** for detailed error messages
2. **Check backend logs** for server-side errors  
3. **Verify environment variables** are set correctly
4. **Ensure all dependencies** are installed (`npm install`, `go mod tidy`)

### Testing Data

The app includes 120 Finnish test profiles for realistic testing:
- **Seed data**: `npm run db:seed`
- **Reset database**: `npx prisma migrate reset`
- **Location-based matching**: Finnish municipalities with real coordinates

## Testing (Backend)

Run the full handler test suite (uses in-memory SQLite for speed):

```bash
cd backend
./run-tests.sh
```

Notes:
- Production DB is PostgreSQL. Some handler queries use Postgres-specific features (e.g. `INTERVAL`).
- Tests that rely on those features are automatically skipped on SQLite and will run on Postgres-backed CI.

## Chat Usage Quick Tips

- Open the floating chat from any page (bottom-right button).
- Use the search box at the top of the list to filter chats by user or last message.
- Inside a chat, click the magnifier or press `Ctrl+F` to search messages; use arrows to navigate matches; `Esc` to close.

