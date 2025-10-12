# WSL Setup Guide for Match-Me

This guide helps developers running Match-Me on Windows Subsystem for Linux (WSL) configure the application for proper network access.

## The WSL Networking Challenge

WSL2 uses a virtualized network architecture that creates two different IP addresses:

- **172.x.x.x** - WSL's internal virtual IP (NAT network)
- **192.168.x.x** - Your Windows host's actual LAN IP (what other devices see)

For other devices (phones, tablets, other computers) to access your development server, you need to use the **192.168.x.x** address.

## Automatic Detection

Our startup scripts (`start.sh`, `start-mobile.sh`, `start-production.sh`) automatically detect WSL and configure the correct IP address. When you run these scripts on WSL, you'll see:

```bash
🪟 WSL detected - using Windows host IP
   Note: On WSL, use this IP to access from other devices
📡 Your local network IP: 192.168.x.x
```

### How It Works

The scripts detect WSL and automatically:
1. Check `/etc/resolv.conf` for the Windows host IP
2. Fall back to checking the default route
3. Look for actual LAN IPs (192.168.x.x) on network interfaces
4. Configure the frontend to use the correct IP

## Manual Configuration

If automatic detection doesn't work, you can manually set the IP:

### 1. Find Your Windows IP Address

In PowerShell (on Windows, not WSL):
```powershell
ipconfig
```

Look for "Wireless LAN adapter" or "Ethernet adapter" and note the **IPv4 Address** (e.g., 192.168.1.100).

### 2. Set Environment Variable

In your WSL terminal, create or edit `frontend/.env.local`:

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://192.168.1.100:8080" > .env.local
```

Replace `192.168.1.100` with your actual Windows IP.

### 3. Verify Backend Binding

The backend automatically binds to `0.0.0.0:8080` (all interfaces), so it should be accessible from the network without changes.

## Firewall Configuration

Windows Firewall may block incoming connections. To allow access:

### Allow Backend Port (8080)

In PowerShell (as Administrator):
```powershell
New-NetFirewallRule -DisplayName "Match-Me Backend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

### Allow Frontend Port (3000)

```powershell
New-NetFirewallRule -DisplayName "Match-Me Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

## Port Forwarding (If Needed)

Windows should automatically forward ports from WSL, but if it doesn't:

```powershell
# Forward backend
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=8080 connectaddress=172.x.x.x

# Forward frontend
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.x.x.x
```

Replace `172.x.x.x` with your WSL IP (run `ip addr show eth0` in WSL to find it).

### View Existing Port Forwards

```powershell
netsh interface portproxy show all
```

### Remove Port Forwards (If Needed)

```powershell
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
```

## Testing Network Access

### 1. Start the Application

```bash
./start.sh
```

### 2. Verify Backend Access

From another device on the same network, open a browser and navigate to:
```
http://192.168.x.x:8080/health
```

You should see: `{"status":"ok"}`

### 3. Verify Frontend Access

Open:
```
http://192.168.x.x:3000
```

You should see the Match-Me login page.

## Common Issues

### Issue: "Connection Refused" from Other Devices

**Solutions:**
1. Check Windows Firewall settings
2. Verify you're using the Windows host IP (192.168.x.x), not the WSL IP (172.x.x.x)
3. Ensure both devices are on the same network

### Issue: Backend Shows 172.x.x.x Instead of 192.168.x.x

**Solutions:**
1. Check the startup script output - it should show "WSL detected"
2. Manually set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
3. Restart your WSL instance: `wsl --shutdown` in PowerShell, then reopen

### Issue: IP Address Changes

**Solution:** Your Windows IP may change when you reconnect to WiFi. In this case:
1. Restart the development server (`./start.sh`)
2. Or update `frontend/.env.local` with the new IP

## Alternative: Access Control Mode

If you have WSL2 with "Mirrored Mode" (Windows 11 22H2+), you can enable it in `.wslconfig`:

Create/edit `C:\Users\YourUsername\.wslconfig`:
```ini
[wsl2]
networkingMode=mirrored
```

Then restart WSL:
```powershell
wsl --shutdown
```

With mirrored mode, WSL uses the same IP as Windows, eliminating the IP mismatch issue.

## Tips for Development

1. **Use Mobile Mode**: Run `./start-mobile.sh` for cleaner UI when testing on mobile devices
2. **Bookmark the IP**: Save `http://192.168.x.x:3000` on your test devices for quick access
3. **Check Logs**: If something doesn't work, check the console output for connection errors

## Need Help?

If you're still having issues:

1. Check that both backend and frontend are running
2. Verify your Windows IP hasn't changed: `ipconfig` in PowerShell
3. Ensure Windows Firewall allows the connections
4. Try accessing from the WSL terminal: `curl http://localhost:8080/health`

For more details, see the main [README.md](./README.md).

