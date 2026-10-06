# Match Me

> **kood/Sisu Group Project**  
> Developed collaboratively by a team of three: Aleksi, Joel Mäkelä, and Hasitha Nilwakka.

A modern full-stack dating application built with a high-performance **Go (1.24+)** backend and a **Next.js (App Router) + Tailwind CSS** frontend, featuring real-time chat with Socket.IO, proximity-based spatial matching (Haversine formula & bounding-box pre-filtering), and PostgreSQL persistence with Prisma and GORM.

---

## 1. Prerequisites

- **Go** (v1.24+)
- **Node.js** (v18+)
- **npm** / **pnpm**
- **PostgreSQL**
- **ngrok** ([ngrok setup guide](./NGROK_SETUP.md))

---

## 2. Clone the Repository

```bash
git clone https://github.com/Hasitha-Nilwakka/match-me.git
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

## 5. Update Environment Variables

Update the `DATABASE_URL` in both `.env` files with your credentials:

**Backend (.env):**

```env
DATABASE_URL="postgresql://matchme_user:your_password@localhost:5432/match_me_db?sslmode=disable"
```

**Frontend (.env):**

```env
DATABASE_URL="postgresql://matchme_user:your_password@localhost:5432/match_me_db?schema=public"
NEXT_PUBLIC_API_URL="http://localhost:8080"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 6. Ngrok Setup (for mobile/external testing)

- Install ngrok: [ngrok setup guide](./NGROK_SETUP.md)
- Use `./start-ngrok.sh` to expose your backend to the internet.

---

## 7. Start the App

### Development Mode

```bash
./start.sh
```
- Backend: http://localhost:8080
- Frontend: http://localhost:3000

### Production Mode

```bash
./start-production.sh
```
- Backend: http://localhost:8080
- Frontend: http://localhost:3000

### Ngrok Mode

```bash
./start-ngrok.sh
```
---

## 8. Prisma Studio Setup

```bash
cd frontend
npx prisma generate           # Generate Prisma client
npm run db:pull               # Pull database schema
npx prisma studio             # Open Prisma Studio (visual DB browser)
```

---

## 9. Troubleshooting

- Double-check environment variables if you get connection errors.
- Make sure PostgreSQL is running.
- For Prisma issues, try `npx prisma generate` and `npm run db:pull` again.
- For ngrok/mobile access, see [ngrok setup guide](./NGROK_SETUP.md).

---

## That's it!

You should now be able to run Match Me locally. For more details, see the full documentation files in the repo.
