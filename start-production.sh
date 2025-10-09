#!/bin/bash

# Match-Me Production Mode Startup Script
# This script builds and runs optimized production builds

echo "🏭 Starting Match-Me in Production Mode"
echo "========================================"

# Get local IP address
LOCAL_IP=$(ip addr show eth0 2>/dev/null | grep "inet " | awk '{print $2}' | cut -d'/' -f1)

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | grep -v "172\.1[7-9]\." | head -1)
fi

if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
fi
echo "📡 Your local network IP: $LOCAL_IP"
echo ""

# Export environment variables for network access
export NEXT_PUBLIC_API_URL="http://$LOCAL_IP:8080"

echo "🔧 Building Backend..."
cd backend
if ! go build -o match-me-server .; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✅ Backend built successfully"
echo ""

echo "🔧 Building Frontend..."
cd ../frontend
if ! npm run build; then
    echo "❌ Frontend build failed"
    exit 1
fi
echo "✅ Frontend built successfully"
echo ""

echo "🚀 Starting Production Servers..."
echo ""
echo "   Backend will be available at:"
echo "   - Local:   http://localhost:8080"
echo "   - Network: http://$LOCAL_IP:8080"
echo ""
echo "   Frontend will be available at:"
echo "   - Local:   http://localhost:3000"
echo "   - Network: http://$LOCAL_IP:3000"
echo ""
echo "📱 PRODUCTION MODE:"
echo "   - Optimized build (faster, smaller)"
echo "   - No dev overlays or indicators"
echo "   - No hot reload (restart to see changes)"
echo ""
echo "🔗 Open on your device:"
echo "   http://$LOCAL_IP:3000"
echo ""

# Start backend in background
cd ../backend
./match-me-server &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend (production)
cd ../frontend
npm start &
FRONTEND_PID=$!

# Cleanup on exit
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

echo "✨ Production servers running!"
echo "Press Ctrl+C to stop both servers"
echo ""

wait

