#!/bin/bash

# Match-Me Mobile Testing Startup Script
# This script starts servers with clean UI (no dev indicators) for mobile testing

echo "📱 Starting Match-Me for Mobile Testing"
echo "========================================"

# Detect if running on WSL
if grep -qi microsoft /proc/version 2>/dev/null; then
    echo "🪟 WSL detected - using Windows host IP"
    # Get Windows host IP from WSL
    # Method 1: From /etc/resolv.conf (most reliable)
    LOCAL_IP=$(grep nameserver /etc/resolv.conf | awk '{print $2}' | head -1)
    
    # Method 2: If that fails, try from default route
    if [ -z "$LOCAL_IP" ] || [ "$LOCAL_IP" = "127.0.0.1" ]; then
        LOCAL_IP=$(ip route show | grep -i default | awk '{print $3}')
    fi
    
    # Method 3: Check for eth0 with 192.168.x.x range (real LAN IP)
    if [ -z "$LOCAL_IP" ] || [[ "$LOCAL_IP" == 172.* ]]; then
        WSL_ETH=$(ip addr show eth0 2>/dev/null | grep "inet " | grep "192.168" | awk '{print $2}' | cut -d'/' -f1)
        if [ -n "$WSL_ETH" ]; then
            LOCAL_IP=$WSL_ETH
        fi
    fi
    
    echo "   Note: On WSL, use this IP to access from other devices"
else
    echo "🐧 Linux/macOS detected"
    # Get local IP address - prefer actual LAN IP over Docker/virtual IPs
    # Try to get the actual interface IP (usually eth0, en0, or wlan0)
    LOCAL_IP=$(ip addr show 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | grep "192.168\|10.\|172.1[6-9]\|172.2[0-9]\|172.3[0-1]" | awk '{print $2}' | cut -d'/' -f1 | head -1)
    
    # Fallback to ifconfig if ip command not available (macOS)
    if [ -z "$LOCAL_IP" ]; then
        LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | grep -v "172\.1[7-9]\." | head -1)
    fi
fi

# Final fallback
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="localhost"
    echo "⚠️  Could not detect network IP, using localhost"
fi

echo "📡 Your local network IP: $LOCAL_IP"
echo ""

# Export environment variables for network access
export NEXT_PUBLIC_API_URL="http://$LOCAL_IP:8080"

echo "🔧 Starting Backend Server..."
echo "   Backend will be available at:"
echo "   - Local:   http://localhost:8080"
echo "   - Network: http://$LOCAL_IP:8080"
echo ""

# Start backend in background
(cd backend && go run .) &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

echo "🎨 Starting Frontend Server (Mobile/Clean Mode)..."
echo "   Frontend will be available at:"
echo "   - Local:   http://localhost:3000"
echo "   - Network: http://$LOCAL_IP:3000"
echo ""
echo "📱 MOBILE MODE: No build indicators (clean UI for testing)"
echo ""
echo "🔗 Open on your mobile device:"
echo "   http://$LOCAL_IP:3000"
echo ""

# Start frontend in mobile mode (no dev overlay)
cd frontend && npm run dev:mobile

# Cleanup on exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM

wait

