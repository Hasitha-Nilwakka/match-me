# Socket.IO Migration Plan

## Overview
Migrate from native WebSocket (gorilla/websocket + browser WebSocket API) to Socket.IO for improved mobile reliability, automatic reconnection, and better error handling.

## Timeline Estimate
- **Total Development Time**: 8-16 hours
- **Testing Time**: 2-4 hours
- **Buffer for Issues**: 4 hours
- **Total Project Time**: 14-24 hours (2-3 days of focused work)

---

## Pre-Migration Checklist

- [ ] Create a backup branch: `git checkout -b backup-native-websocket`
- [ ] Create migration branch: `git checkout -b migrate-to-socket-io`
- [ ] Document all current WebSocket events and message formats
- [ ] Ensure all current functionality is working
- [ ] Take screenshots/videos of working chat for comparison

---

## Phase 1: Research & Setup (1-2 hours)

### Backend Dependencies
```bash
cd backend
go get github.com/googollee/go-socket.io
go get github.com/googollee/go-socket.io/engineio
go get github.com/googollee/go-socket.io/engineio/transport
go get github.com/googollee/go-socket.io/engineio/transport/polling
go get github.com/googollee/go-socket.io/engineio/transport/websocket
```

### Frontend Dependencies
```bash
cd frontend
npm install socket.io-client
```

### Documentation
Create a reference document mapping current WebSocket messages to Socket.IO events:

**Current WebSocket Messages:**
- `{ type: "auth", token: "..." }` → Authentication
- `{ type: "typing", isTyping: bool, userId: int, chatId: int }` → Typing indicator
- `{ type: "read", chatId: int, ... }` → Read receipt
- Chat message object (no type field) → New message

**New Socket.IO Events:**
- `authenticate` → Authentication
- `typing` → Typing indicator
- `read_receipt` → Read receipt
- `message` → New message
- `connect` → Connection established
- `disconnect` → Connection closed
- `reconnect` → Reconnection successful

---

## Phase 2: Backend Migration (4-8 hours)

### 2.1 Create Socket.IO Server (1 hour)

**File: `backend/main.go`**

Changes needed:
1. Import Socket.IO packages
2. Create Socket.IO server instance
3. Configure CORS for Socket.IO
4. Set up Socket.IO transport options
5. Register Socket.IO handlers
6. Serve Socket.IO endpoint

**Key considerations:**
- Keep the existing REST API endpoints unchanged
- Socket.IO server should run alongside Gin
- Use `/socket.io/` as the default Socket.IO path
- Enable CORS for cross-origin requests

### 2.2 Refactor Chat Handlers (3-5 hours)

**File: `backend/handlers/chat.go`**

#### Current Architecture:
```
Hub (manages all connections)
├── Clients map[*Client]bool
├── Broadcast channel
├── Register/Unregister channels
└── Run() method
```

#### New Socket.IO Architecture:
```
Socket.IO Server
├── Namespaces (optional)
├── Rooms (chat-specific)
├── Event handlers
└── Automatic connection management
```

#### Changes Required:

**A. Remove the Hub Pattern:**
- Delete `Hub` struct
- Delete `Client` struct  
- Delete `readPump()` and `writePump()` methods
- Delete `serveWS()` function
- Keep the message/response structs (ChatMessage, etc.)

**B. Create Socket.IO Handlers:**

Create new file: `backend/handlers/socketio.go`

```go
// Pseudo-code structure
func SetupSocketIO(server *socketio.Server) {
    // Connection handler
    server.OnConnect("/", func(s socketio.Conn) error {
        // Authenticate user
        // Join chat room
        // Return nil or error
    })
    
    // Message event
    server.OnEvent("/", "message", func(s socketio.Conn, msg string) {
        // Parse message
        // Save to DB
        // Broadcast to room
    })
    
    // Typing indicator
    server.OnEvent("/", "typing", func(s socketio.Conn, data TypingData) {
        // Broadcast to room (except sender)
    })
    
    // Read receipt
    server.OnEvent("/", "read_receipt", func(s socketio.Conn, data ReadData) {
        // Update DB
        // Broadcast to room
    })
    
    // Disconnection handler
    server.OnDisconnect("/", func(s socketio.Conn, reason string) {
        // Clean up user session
        // Leave rooms
    })
}
```

**C. Update Existing REST Handlers:**

Modify these functions in `chat.go`:
- `SendMessageHandler()` - Still saves to DB, but uses Socket.IO to broadcast instead of Hub
- `MarkMessagesAsReadHandler()` - Uses Socket.IO to broadcast read events
- `GetChatsHandler()` - No changes needed (still returns chat list via REST)
- `CreateChatHandler()` - No changes needed

**D. Authentication Strategy:**

Socket.IO authentication options:
1. **Query parameter** (current approach): `?token=xxx`
2. **Handshake auth**: Send token during connection handshake
3. **First message auth**: Authenticate on first event

Recommended: Use handshake auth for better security

### 2.3 Update Main Server (30 min)

**File: `backend/main.go`**

Replace:
```go
hub := handlers.NewHub()
go hub.Run()
```

With:
```go
socketioServer := socketio.NewServer(&engineio.Options{
    Transports: []transport.Transport{
        &polling.Transport{},
        &websocket.Transport{},
    },
})
handlers.SetupSocketIO(socketioServer)
defer socketioServer.Close()

// Serve Socket.IO
r.GET("/socket.io/*any", gin.WrapH(socketioServer))
r.POST("/socket.io/*any", gin.WrapH(socketioServer))
```

---

## Phase 3: Frontend Migration (2-4 hours)

### 3.1 Create Socket.IO Helper (1 hour)

**File: `frontend/lib/api.ts`**

Add new Socket.IO connection function:

```typescript
import { io, Socket } from 'socket.io-client';

export const chatApi = {
  // ... existing methods ...
  
  // New Socket.IO method
  createSocketIOConnection: (
    chatId: string, 
    onMessage: (message: unknown) => void, 
    onTyping?: (data: unknown) => void
  ): Socket => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No authentication token');
    
    const baseUrl = getApiUrl();
    
    // Create Socket.IO connection
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
    
    // Connection events
    socket.on('connect', () => {
      console.log('[SocketIO] Connected to chat', chatId);
      socket.emit('join_chat', { chatId });
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[SocketIO] Disconnected:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketIO] Reconnected after', attemptNumber, 'attempts');
      socket.emit('join_chat', { chatId }); // Rejoin chat room
    });
    
    // Chat events
    socket.on('message', onMessage);
    socket.on('typing', onTyping || (() => {}));
    
    return socket;
  },
  
  // Keep old method temporarily for rollback
  createWebSocketConnection: () => { /* ... */ },
};
```

### 3.2 Update ChatPopup Component (1-2 hours)

**File: `frontend/components/ChatPopup.tsx`**

Changes needed:

**A. Replace WebSocket refs:**
```typescript
// OLD
const wsRef = useRef<WebSocket | null>(null);

// NEW
const socketRef = useRef<Socket | null>(null);
```

**B. Update connection logic:**
```typescript
// OLD
const ws = chatApi.createWebSocketConnection(chatId, onMessage, onTyping);
wsRef.current = ws;

// NEW
const socket = chatApi.createSocketIOConnection(chatId, onMessage, onTyping);
socketRef.current = socket;
```

**C. Update typing indicator:**
```typescript
// OLD
if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
  chatApi.sendTypingIndicator(wsRef.current, true);
}

// NEW
if (socketRef.current && socketRef.current.connected) {
  socketRef.current.emit('typing', { isTyping: true });
}
```

**D. Update cleanup:**
```typescript
// OLD
if (wsRef.current) {
  wsRef.current.close();
}

// NEW
if (socketRef.current) {
  socketRef.current.disconnect();
}
```

**E. Add connection state indicators (optional but recommended):**
```typescript
const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

// In connection setup:
socket.on('connect', () => setConnectionState('connected'));
socket.on('disconnect', () => setConnectionState('disconnected'));
socket.on('reconnecting', () => setConnectionState('reconnecting'));

// In UI:
{connectionState === 'reconnecting' && (
  <div className="text-yellow-600 text-xs">Reconnecting...</div>
)}
```

### 3.3 Update list view WebSocket (30 min)

**File: `frontend/components/ChatPopup.tsx`** (lines 196-267)

Update the lightweight typing listeners for chat list:
- Replace WebSocket with Socket.IO
- Use rooms to subscribe to multiple chats
- Emit typing events to specific chat rooms

---

## Phase 4: Testing (2-4 hours)

### 4.1 Unit Testing

**Backend:**
- [ ] Test Socket.IO connection with valid token
- [ ] Test Socket.IO connection with invalid token
- [ ] Test message broadcasting to room
- [ ] Test typing indicator broadcasting
- [ ] Test read receipt broadcasting
- [ ] Test user leaving chat room

**Frontend:**
- [ ] Test Socket.IO connection creation
- [ ] Test message event handling
- [ ] Test typing event handling
- [ ] Test reconnection logic

### 4.2 Integration Testing

- [ ] Open chat on desktop browser
- [ ] Send message, verify it appears
- [ ] Open same chat on mobile device
- [ ] Verify both users see each other's messages
- [ ] Test typing indicators between users
- [ ] Test read receipts between users
- [ ] Kill network connection, verify reconnection
- [ ] Switch from WiFi to cellular on mobile
- [ ] Lock/unlock mobile device
- [ ] Background/foreground mobile app

### 4.3 Mobile-Specific Testing

**iOS:**
- [ ] Safari browser
- [ ] Chrome browser
- [ ] Background app reconnection
- [ ] Network switching

**Android:**
- [ ] Chrome browser
- [ ] Firefox browser
- [ ] Background app reconnection
- [ ] Network switching

### 4.4 Load Testing (Optional)

- [ ] Connect 10+ users to same chat
- [ ] Send rapid messages
- [ ] Monitor server CPU/memory
- [ ] Check for message loss

---

## Phase 5: Cleanup & Documentation (1 hour)

### 5.1 Code Cleanup

- [ ] Remove old WebSocket code from `chat.go`
- [ ] Remove `gorilla/websocket` from `go.mod`
- [ ] Remove old `createWebSocketConnection` from `api.ts`
- [ ] Clean up commented-out code
- [ ] Update variable names for clarity

### 5.2 Documentation

- [ ] Update README with Socket.IO information
- [ ] Document Socket.IO events in code comments
- [ ] Update API documentation
- [ ] Add troubleshooting guide

---

## Rollback Plan

If migration fails or introduces critical bugs:

1. **Immediate Rollback:**
   ```bash
   git checkout backup-native-websocket
   git branch -D migrate-to-socket-io
   ```

2. **Partial Rollback:**
   - Keep Socket.IO on backend
   - Add feature flag to switch between implementations
   - Frontend can use either connection method

3. **Data Safety:**
   - All messages are still saved via REST API
   - WebSocket is only for real-time updates
   - No data loss risk during migration

---

## Known Risks & Mitigation

### Risk 1: Go Socket.IO Library Compatibility
**Risk**: The `googollee/go-socket.io` library may have compatibility issues with latest Socket.IO client
**Mitigation**: 
- Test with Socket.IO client v4.x (most compatible)
- Consider alternative: `github.com/zishang520/socket.io` (newer fork)
- Fallback: Use Socket.IO v2.x client if needed

### Risk 2: Breaking Changes During Migration
**Risk**: Chat becomes non-functional during development
**Mitigation**:
- Keep REST API unchanged (messages still work)
- Deploy backend first, then frontend
- Use feature flag to enable/disable Socket.IO

### Risk 3: Performance Degradation
**Risk**: Socket.IO adds overhead
**Mitigation**:
- Benchmark before and after
- Monitor server resources
- Use binary protocol if needed (msgpack)

### Risk 4: Mobile Background Connections
**Risk**: Socket.IO may not reconnect when app backgrounds
**Mitigation**:
- Implement visibility change detection
- Disconnect when app backgrounds
- Reconnect when app foregrounds
- Fetch missed messages on reconnect

---

## Success Criteria

Migration is successful when:
- ✅ All messages send and receive correctly
- ✅ Typing indicators work on both devices
- ✅ Read receipts update in real-time
- ✅ Auto-reconnection works after network drop
- ✅ Mobile devices maintain connection during network switch
- ✅ No console errors related to WebSocket/Socket.IO
- ✅ Performance is equal or better than before
- ✅ Chat works on iOS Safari, Android Chrome, Desktop browsers

---

## Alternative Libraries (If Go Socket.IO Fails)

1. **github.com/zishang520/socket.io**
   - Newer fork of go-socket.io
   - Better Socket.IO v4 support
   - More actively maintained

2. **Native WebSocket + Reconnection Wrapper**
   - Keep gorilla/websocket backend
   - Add `reconnecting-websocket` to frontend
   - Simpler migration, less features

3. **Custom Reconnection Logic**
   - Keep current architecture
   - Add exponential backoff reconnection
   - Quickest fix, limited benefits

---

## Post-Migration Monitoring

After deployment, monitor:
- [ ] Error rate in logs (backend)
- [ ] Connection success rate
- [ ] Average reconnection time
- [ ] Message delivery latency
- [ ] Server CPU/memory usage
- [ ] User reports of chat issues

---

## Questions to Answer Before Starting

1. **Do you want to keep the old WebSocket code as a fallback?**
   - Pros: Can switch back easily
   - Cons: More code to maintain

2. **Should we implement both and use a feature flag?**
   - Pros: Can A/B test, gradual rollout
   - Cons: More complex code

3. **What's your testing environment?**
   - Do you have staging server?
   - Can you test on real mobile devices?

4. **Timeline constraints?**
   - Need it done by specific date?
   - Can we do phased rollout?

---

## Next Steps

Ready to proceed? Here's the recommended approach:

1. **Start with Phase 1** (dependencies + documentation)
2. **Build backend Socket.IO** in parallel environment
3. **Test backend** with Socket.IO client test page
4. **Build frontend** once backend works
5. **Test integration** thoroughly
6. **Deploy** to staging first
7. **Monitor** for 24-48 hours
8. **Deploy** to production

Would you like me to start implementing Phase 1?

