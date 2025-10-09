# Cloudflare Tunnel Setup Guide

## What is Cloudflare Tunnel?

Cloudflare Tunnel (formerly Argo Tunnel) lets you expose your local development server to the internet securely **without opening ports** or configuring your router.

**Perfect for:**
- 🌍 Testing with friends/colleagues remotely
- 📱 Testing on mobile devices not on your WiFi
- 🎨 Showing demos to clients
- 🧪 Webhook testing

**Benefits:**
- ✅ Free forever
- ✅ HTTPS included (secure)
- ✅ No port forwarding needed
- ✅ Works through firewalls
- ✅ Supports WebSocket & Socket.IO
- ✅ Your computer acts as the server

---

## Installation

### macOS
```bash
brew install cloudflare/cloudflare/cloudflared
```

### Linux
```bash
# Debian/Ubuntu
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Or use package manager
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### Windows
```powershell
# Download from GitHub releases
# https://github.com/cloudflare/cloudflared/releases
# Or use Chocolatey
choco install cloudflared
```

### Verify Installation
```bash
cloudflared --version
```

---

## Quick Start (Temporary Tunnel)

### Option 1: Expose Frontend Only (Recommended for Testing)

**Step 1: Start your app locally**
```bash
# Start with mobile mode for clean UI
./start-mobile.sh

# Or start normally
./start.sh
```

**Step 2: In a new terminal, create tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
```

**Step 3: You'll see output like:**
```
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://random-name-1234.trycloudflare.com
```

**Step 4: Share that URL!**
- Send to testers: `https://random-name-1234.trycloudflare.com`
- Works on any device, anywhere in the world
- Includes HTTPS automatically

**Important:** Backend is still localhost-only. Update frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Then rebuild frontend or use the temporary env var:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev:mobile
```

---

### Option 2: Expose Both Frontend & Backend

You need **two tunnels** (one for each service).

**Terminal 1: Start your app**
```bash
./start-mobile.sh
```

**Terminal 2: Tunnel for Backend**
```bash
cloudflared tunnel --url http://localhost:8080
# Note the URL, e.g., https://backend-xyz.trycloudflare.com
```

**Terminal 3: Tunnel for Frontend**
First, set the backend URL:
```bash
export NEXT_PUBLIC_API_URL=https://backend-xyz.trycloudflare.com
cd frontend
npm run dev:mobile
```

Then in **Terminal 4:**
```bash
cloudflared tunnel --url http://localhost:3000
# Note the URL, e.g., https://frontend-abc.trycloudflare.com
```

**Share:** `https://frontend-abc.trycloudflare.com`

---

## Permanent Tunnel (Named Tunnel)

For consistent URLs that don't change each time.

### Step 1: Authenticate
```bash
cloudflared tunnel login
```
Opens browser to authenticate with Cloudflare account (free).

### Step 2: Create Named Tunnel
```bash
cloudflared tunnel create match-me
```

### Step 3: Create Configuration File
Create `~/.cloudflared/config.yml`:

```yaml
tunnel: match-me
credentials-file: /Users/YOUR_USERNAME/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Frontend
  - hostname: matchme.your-domain.com
    service: http://localhost:3000
  # Backend API
  - hostname: api.matchme.your-domain.com
    service: http://localhost:8080
  # Catch-all
  - service: http_status:404
```

### Step 4: Add DNS Records
```bash
# Point your domain to the tunnel
cloudflared tunnel route dns match-me matchme.your-domain.com
cloudflared tunnel route dns match-me api.matchme.your-domain.com
```

### Step 5: Run the Tunnel
```bash
cloudflared tunnel run match-me
```

### Step 6: Update Frontend Environment
```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=https://api.matchme.your-domain.com
```

**Access:** `https://matchme.your-domain.com`

---

## Using with Match-Me

### Recommended Setup for Testing

**Terminal 1: Start app**
```bash
./start-mobile.sh
```

**Terminal 2: Cloudflare tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
```

**Result:**
- Share the cloudflare URL with testers
- They can access the full app from anywhere
- Backend API calls work (proxied through frontend)

### For Separate Backend Access

If you need to expose backend directly (for API testing, mobile apps, etc.):

**Terminal 1: Backend**
```bash
cd backend && go run .
```

**Terminal 2: Backend Tunnel**
```bash
cloudflared tunnel --url http://localhost:8080
# Copy the URL, e.g., https://backend-xyz.trycloudflare.com
```

**Terminal 3: Frontend with Backend URL**
```bash
cd frontend
NEXT_PUBLIC_API_URL=https://backend-xyz.trycloudflare.com npm run dev:mobile
```

**Terminal 4: Frontend Tunnel**
```bash
cloudflared tunnel --url http://localhost:3000
# Share this URL
```

---

## Socket.IO Considerations

✅ **Socket.IO works perfectly through Cloudflare Tunnel!**

Cloudflare automatically handles:
- WebSocket upgrade
- Socket.IO polling fallback
- Keep-alive connections

**No special configuration needed** - it just works! 🎉

---

## Security & Best Practices

### ⚠️ Important Security Notes

1. **Don't expose dev databases to internet**
   - Use test data only
   - Never expose production data via tunnel

2. **Temporary tunnels are public**
   - Anyone with the URL can access
   - URLs are random but not authenticated

3. **For production, use named tunnels with:**
   - Access policies
   - Authentication (Cloudflare Access)
   - Your own domain

4. **Rate limiting**
   - Free tier has generous limits
   - Monitor for abuse

### Best Practices

1. **Use mobile mode** for cleaner UI:
   ```bash
   ./start-mobile.sh
   ```

2. **Keep tunnel running only when needed**
   - Ctrl+C to stop tunnel
   - Restart when needed for new URL

3. **Share carefully**
   - Temporary URLs expire when tunnel stops
   - Don't share publicly on social media
   - Only share with intended testers

4. **Monitor console**
   - Check for unusual traffic
   - Watch backend logs

---

## Troubleshooting

### "Connection refused" or tunnel won't start
**Solution:**
- Check cloudflared is installed: `cloudflared --version`
- Ensure your app is running locally first
- Try a different port: `cloudflared tunnel --url http://localhost:3001`

### "Cannot connect to Socket.IO"
**Solution:**
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL` matches backend tunnel URL
- Socket.IO should auto-fallback to polling if WebSocket fails

### "Backend API calls failing"
**Solution:**
- If exposing frontend only, backend must be accessible from frontend server (localhost works)
- If exposing both, update `NEXT_PUBLIC_API_URL` to backend tunnel URL
- Check CORS settings in backend (`main.go` allows all origins in dev)

### "Tunnel URL changes every time"
**Solution:**
- Use named tunnel (see Permanent Tunnel section)
- Named tunnels keep same URL
- Requires free Cloudflare account

### "Slow performance"
**Solution:**
- Cloudflare routes through nearest edge server
- Some latency is expected (you're routing through Cloudflare)
- For local network testing, use `./start.sh` with local IP instead

---

## Common Use Cases

### Use Case 1: Quick Demo to a Friend
```bash
# Terminal 1
./start-mobile.sh

# Terminal 2
cloudflared tunnel --url http://localhost:3000

# Share the URL with your friend
# They can test the full app from anywhere!
```

### Use Case 2: Mobile Testing (Not on Your WiFi)
```bash
# Start app
./start-mobile.sh

# Create tunnel
cloudflared tunnel --url http://localhost:3000

# Open the cloudflare URL on your phone's cellular data
# Test real mobile experience without WiFi
```

### Use Case 3: Client Demo
```bash
# Use production mode for best performance
./start-production.sh

# In another terminal
cloudflared tunnel --url http://localhost:3000

# Professional demo with clean UI
```

---

## Alternatives to Cloudflare Tunnel

### ngrok (Similar to Cloudflare)
```bash
# Install
brew install ngrok

# Run
ngrok http 3000

# Get URL like: https://abc123.ngrok.io
```

**Pros:** Popular, well-documented  
**Cons:** Free tier has 40 connections/min limit

### localhost.run (No installation)
```bash
ssh -R 80:localhost:3000 localhost.run
```

**Pros:** Zero installation  
**Cons:** Less reliable, basic features

### Tailscale (VPN-based)
- Share your local server with specific users
- More private than public tunnels
- Requires Tailscale on both ends

---

## Cost Comparison

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Cloudflare Tunnel** | ✅ Forever free | Quick demos, testing |
| **Render** | 750 hrs/mo | Semi-permanent testing |
| **Railway** | $5 credit/mo | Always-on testing |
| **Fly.io** | 3 VMs free | Production-like |
| **Vercel** | Unlimited (frontend) | Best frontend perf |
| **ngrok** | Limited connections | Alternative tunnel |

---

## Production Deployment (When Ready)

When you're ready to deploy for real:

1. **Frontend:** Vercel (free, optimized for Next.js)
2. **Backend:** Render or Railway ($7-10/month for always-on)
3. **Database:** Render PostgreSQL or Neon ($7-10/month)
4. **Domain:** Cloudflare (free DNS + CDN)

**Total cost:** ~$15-20/month for production-ready hosting

---

## Next Steps

**To get started right now:**

1. Install cloudflared (5 minutes)
2. Start your app: `./start-mobile.sh`
3. Run tunnel: `cloudflared tunnel --url http://localhost:3000`
4. Share the URL!

**For permanent deployment:**
- Set up named tunnel with custom domain
- Or deploy to Render/Railway for always-on hosting

Want me to create deployment configs for Render or Railway? Or help with the named tunnel setup?

