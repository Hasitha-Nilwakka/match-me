#!/bin/bash

# Match-Me Mobile Testing Startup Script
# This script starts servers with clean UI (no dev indicators) for mobile testing

echo "📱 Starting Match-Me for Mobile Testing"
echo "========================================"

# Get local IP address - prefer WSL IP over Docker IPs
# Try to get the actual WSL interface IP (usually eth0)
LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d'/' -f1)

# If eth0 not found, try to avoid Docker IPs (172.17.x.x, 172.18.x.x, etc.)
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | grep -v "172\.1[7-9]\." | head -1)
fi

# If still no IP, fall back to any non-localhost IP
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
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

