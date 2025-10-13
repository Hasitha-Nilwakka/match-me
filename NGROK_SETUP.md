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

## 🚀 Quick Start (Automated)

**One command to start everything:**

```bash
./start-ngrok.sh
```

This script will:

- Start your frontend server (port 3000)
- Start your backend server (port 8080)
- Create ngrok tunnel
- Update environment variables automatically
- Show you the public URL to share

Press `Ctrl+C` to stop all services.

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
