# WebSocket Event Mapping Documentation

## Current Native WebSocket Implementation

### Message Formats (Client → Server)

#### 1. Authentication Message
```json
{
  "type": "auth",
  "token": "JWT_TOKEN_HERE"
}
```
- **When**: Sent immediately after WebSocket connection opens
- **Purpose**: Authenticate the user
- **Response**: None (connection stays open if valid)

#### 2. Typing Indicator
```json
{
  "type": "typing",
  "isTyping": true | false
}
```
- **When**: User starts/stops typing in chat input
- **Purpose**: Show "user is typing..." to other participants
- **Broadcast**: To all other users in the same chat (excluding sender)

---

### Message Formats (Server → Client)

#### 1. New Chat Message
```json
{
  "id": 123,
  "chatId": 45,
  "senderId": 67,
  "content": "Hello!",
  "isRead": false,
  "createdAt": "2025-01-09T12:34:56Z",
  "senderName": "John Doe"
}
```
- **When**: Another user sends a message OR user's own message confirmed
- **Purpose**: Display new message in chat
- **Note**: No "type" field - message objects are identified by structure

#### 2. Typing Indicator (Broadcast)
```json
{
  "type": "typing",
  "isTyping": true | false,
  "userId": 67,
  "chatId": 45
}
```
- **When**: Another user in chat starts/stops typing
- **Purpose**: Show "User is typing..." indicator
- **Duration**: Auto-cleared after 2.5 seconds on frontend

#### 3. Read Receipt
```json
{
  "type": "read",
  "chatId": 45,
  "readerId": 67,
  "lastReadMessageId": 123
}
```
- **When**: Another user marks messages as read
- **Purpose**: Update message checkmarks (✓ → ✓✓)
- **Note**: Also sent with capitalized fields (Type, ChatID, etc.)

---

## Socket.IO Event Mapping

### Client → Server Events

| Native WebSocket | Socket.IO Event | Data Format |
|-----------------|-----------------|-------------|
| `{ type: "auth", token: "..." }` | `authenticate` | `{ token: string }` |
| `{ type: "typing", isTyping: bool }` | `typing` | `{ chatId: number, isTyping: boolean }` |
| *(implicit on connect)* | `join_chat` | `{ chatId: number }` |

### Server → Client Events

| Native WebSocket | Socket.IO Event | Data Format |
|-----------------|-----------------|-------------|
| Message object | `message` | Same structure as current |
| `{ type: "typing", ... }` | `typing` | `{ userId: number, isTyping: boolean }` |
| `{ type: "read", ... }` | `read_receipt` | `{ readerId: number, lastReadMessageId: number }` |
| *(N/A)* | `connect` | Built-in Socket.IO event |
| *(N/A)* | `disconnect` | Built-in Socket.IO event |
| *(N/A)* | `reconnect` | Built-in Socket.IO event |

---

## Connection Flow

### Current Native WebSocket

```
1. Client: Create WebSocket connection to ws://host:8080/chats/:chatId/ws?token=xxx
2. Server: Upgrade HTTP to WebSocket (gorilla/websocket)
3. Client: Send { type: "auth", token: "..." }
4. Server: Validate token, add client to Hub
5. Hub: Broadcast messages to all clients in same chat
6. Client: Listen for messages on ws.onmessage
```

### New Socket.IO Flow

```
1. Client: Create Socket.IO connection to http://host:8080 with auth: { token }
2. Server: Accept connection, validate token in middleware
3. Client: Emit 'join_chat' with { chatId }
4. Server: Add socket to room (chat-{chatId})
5. Server: Broadcast messages to room
6. Client: Listen for events via socket.on('message', ...)
7. Auto-reconnection: Socket.IO handles automatically
```

---

## Key Differences

### Authentication
- **Old**: Token sent after connection via message
- **New**: Token sent during connection handshake

### Room Management
- **Old**: Manual Hub with client map
- **New**: Socket.IO rooms (automatic)

### Message Identification
- **Old**: Messages identified by lack of "type" field
- **New**: Clear event names ('message', 'typing', etc.)

### Reconnection
- **Old**: No automatic reconnection - connection dies
- **New**: Automatic reconnection with exponential backoff

### Transport Fallback
- **Old**: WebSocket only - fails if blocked
- **New**: WebSocket → HTTP long polling fallback

---

## Testing Checklist

### Events to Test
- [ ] User joins chat (connection + authentication)
- [ ] User sends message
- [ ] User receives message from another user
- [ ] User starts typing (indicator sent)
- [ ] User stops typing (indicator cleared)
- [ ] User marks messages as read
- [ ] User receives read receipt from another user
- [ ] Connection drops (network loss)
- [ ] Auto-reconnection succeeds
- [ ] User leaves chat (disconnection)

### Edge Cases
- [ ] Invalid token (authentication failure)
- [ ] User in multiple chats simultaneously
- [ ] Rapid typing (throttling)
- [ ] Rapid message sending
- [ ] Large messages (1000 chars)
- [ ] Network switch (WiFi → cellular)
- [ ] App backgrounding (mobile)
- [ ] Multiple devices for same user

---

## Implementation Notes

### Backend Changes Required
1. Replace `gorilla/websocket` with Socket.IO server
2. Remove Hub/Client structs
3. Create Socket.IO event handlers
4. Update message broadcasting (Hub → Room)
5. Update typing indicator logic
6. Update read receipt logic
7. Add Socket.IO authentication middleware

### Frontend Changes Required
1. Install `socket.io-client`
2. Replace WebSocket API with Socket.IO API
3. Update event listeners (ws.onmessage → socket.on)
4. Update event emitters (ws.send → socket.emit)
5. Add reconnection UI indicators
6. Remove manual WebSocket connection code
7. Update typing indicator sending
8. Update chat list typing listeners

---

## Compatibility Matrix

### Browser Support
| Browser | Native WS | Socket.IO |
|---------|-----------|-----------|
| Chrome (Desktop) | ✅ | ✅ |
| Safari (Desktop) | ✅ | ✅ |
| Firefox (Desktop) | ✅ | ✅ |
| Safari (iOS) | ⚠️ | ✅ |
| Chrome (Android) | ⚠️ | ✅ |

⚠️ = Works but no auto-reconnection on network changes

### Network Environments
| Environment | Native WS | Socket.IO |
|-------------|-----------|-----------|
| Home WiFi | ✅ | ✅ |
| Mobile 4G/5G | ⚠️ | ✅ |
| Corporate Network | ❌ | ✅ (polling) |
| Public WiFi | ⚠️ | ✅ |

❌ = May be blocked by firewall
⚠️ = Unreliable due to network switching

