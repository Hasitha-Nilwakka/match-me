#!/bin/bash

# Complete Match-Me + Ngrok startup

echo "🚀 Starting Match-Me with Ngrok..."

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Start Backend first
echo "Starting backend server..."
cd "$SCRIPT_DIR/backend" && go run . > ../backend.log 2>&1 &
BACKEND_PID=$!

# 2. Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# 3. Start ngrok tunnel
echo "Starting ngrok tunnel..."
cd "$SCRIPT_DIR"
ngrok http 8080 --log=stdout > ngrok.log 2>&1 &
NGROK_PID=$!

# 4. Wait for ngrok to establish tunnel
echo "Waiting for ngrok tunnel to establish..."
sleep 5

# 5. Extract ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL"
    kill $NGROK_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Ngrok URL: $NGROK_URL"

# 6. Set environment variables BEFORE starting frontend
export NEXT_PUBLIC_API_URL=$NGROK_URL
echo "✅ Set API URL to: $NGROK_URL"

# 7. NOW start frontend with correct environment
echo "Starting frontend server with ngrok URL..."
cd "$SCRIPT_DIR/frontend" && npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Cleanup function for proper shutdown
cleanup() {
    echo ""
    echo "Shutting down all services..."
    kill $NGROK_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}
trap cleanup EXIT

echo ""
echo "✅ All services running! Your app is accessible at: $NGROK_URL"
echo ""
echo "📍 Service URLs:"
echo "  Public Access: $NGROK_URL"
echo "  Frontend (local): http://localhost:3000"
echo "  Backend (local): http://localhost:8080"
echo ""
echo "� Service PIDs:"
echo "  Frontend: $FRONTEND_PID"
echo "  Backend: $BACKEND_PID"
echo "  Ngrok: $NGROK_PID"
echo ""
echo "📊 View Logs:"
echo "  Frontend: tail -f frontend.log"
echo "  Backend: tail -f backend.log"
echo "  Ngrok: tail -f ngrok.log"
echo ""
echo "Press Ctrl+C to stop all services"

# Keep script running
wait