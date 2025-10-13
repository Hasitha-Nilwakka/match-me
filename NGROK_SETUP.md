# 🚀 Match-Me Ngrok Setup Guide

## 📦 Install Ngrok (One-time setup)

### Linux/WSL:

```bash
# Download and install ngrok
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Windows:

1. Download from: https://ngrok.com/download
2. Extract to a folder (e.g., `C:\ngrok`)
3. Add to PATH or run from that folder

### Mac:

```bash
# Using Homebrew
brew install ngrok
```

### 🔑 Setup Auth Token:

1. Sign up at: https://dashboard.ngrok.com/signup
2. Get your auth token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Configure ngrok:

```bash
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

## Quick Setup (5 steps)

### 1. Start Frontend Server

```bash
cd frontend
npm run dev
```

_Keep this terminal open - frontend runs on port 3000_

### 2. Start Backend Server

```bash
cd backend
go run .
```

_Keep this terminal open - backend runs on port 8080_

### 3. Start Ngrok Tunnel

```bash
ngrok http 8080
```

_Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)_

### 4. Update Environment File

Edit `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://abc123.ngrok-free.app
```

_Replace with your actual ngrok URL_

### 5. Access Your App

- **PC**: Use the ngrok URL
- **Mobile**: Same ngrok URL
- **Both work with full functionality!**

---

## 📱 Testing

1. Open ngrok URL in browser
2. Login should work on both PC and mobile
3. Navigation between pages should work
4. API calls should work

---

## 🔧 Troubleshooting

**❌ "Failed to fetch" errors:**

- Check `frontend/.env.local` has correct ngrok URL
- Restart frontend after changing env file

**❌ "Frontend server unavailable":**

- Make sure `npm run dev` is running on port 3000
- Check both servers are running

**❌ Mobile not working:**

- Clear mobile browser cache
- Try incognito/private mode
- Make sure mobile is on WiFi (not mobile data)

---

## 💡 How it Works

```
Mobile/PC → ngrok tunnel → Backend (port 8080) → {
  API calls: Backend handles directly
  Pages: Proxy to Frontend (port 3000)
}
```

Only **one ngrok tunnel** needed for everything! 🎉
