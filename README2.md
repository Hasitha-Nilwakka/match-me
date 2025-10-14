# Match Me - Quick Start Guide

A modern dating app with Go backend and Next.js frontend. This guide helps you get started quickly, focusing only on the essential steps.

---

## 1. Prerequisites

- **Go** (v1.24+)
- **Node.js** (v18+)
- **npm**
- **PostgreSQL**
- **ngrok** ([ngrok setup guide](./NGROK_SETUP.md))

---

## 2. Clone the Repository

```bash
git clone https://gitea.kood.tech/joelmakela/match-me.git
cd match-me
```

---

## 3. Install Dependencies

### Backend

```bash
cd backend
go mod tidy
```

### Frontend

```bash
cd frontend
npm install
```

---

## 4. Install & Setup PostgreSQL

- **Ubuntu/Debian:**
  ```bash
  sudo apt update
  sudo apt install postgresql postgresql-contrib
  ```
- **macOS:**
  ```bash
  brew install postgresql
  ```
- **Windows:**
  Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### Create Database & User

```bash
sudo -u postgres psql
```

In the PostgreSQL shell, run:

```sql
CREATE USER matchme_user WITH PASSWORD 'your_secure_password';
ALTER USER matchme_user CREATEDB;
CREATE DATABASE match_me_db OWNER matchme_user;
GRANT ALL PRIVILEGES ON DATABASE match_me_db TO matchme_user;
\q
```

---

## 5. Environment Variables

### Backend (`backend/.env`)

Copy and edit:

```bash
cp backend/.env.example backend/.env
```

Set your PostgreSQL credentials:

```
DATABASE_URL="postgresql://matchme_user:your_secure_password@localhost:5432/match_me_db?sslmode=disable"
```

### Frontend (`frontend/.env.local`)

Create and edit:

```bash
cd frontend
cat > .env.local << 'EOF'
DATABASE_URL="postgresql://matchme_user:your_secure_password@localhost:5432/match_me_db?schema=public"
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

---

## 6. Prisma Setup (Frontend)

```bash
cd frontend
npx prisma generate           # Generate Prisma client
npm run db:pull               # Pull database schema
npx prisma studio             # Open Prisma Studio (visual DB browser)
```

---

## 7. Ngrok Setup (for mobile/external testing)

- Install ngrok: [ngrok setup guide](./NGROK_SETUP.md)
- Use `./start-ngrok.sh` to expose your backend to the internet.

---

## 8. Start the App

### Development Mode

```bash
./start.sh
```

- Backend: http://localhost:8080
- Frontend: http://localhost:3000

---

## 9. Troubleshooting

- Double-check environment variables if you get connection errors.
- Make sure PostgreSQL is running.
- For Prisma issues, try `npx prisma generate` and `npm run db:pull` again.
- For ngrok/mobile access, see [ngrok setup guide](./NGROK_SETUP.md).

---

## That's it!

You should now be able to run Match Me locally. For more details, see the full documentation files in the repo.
