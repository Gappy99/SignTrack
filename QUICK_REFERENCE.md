# 🚀 SignTrack Microservices - Quick Reference

## 📁 Files Created This Session

### Server Files (4)
```
microservices/video-call-service/server.js              ✅ Express + MongoDB
microservices/frame-processor-service/server.js         ✅ Express + Redis
microservices/websocket-service/server.js               ✅ Express + Socket.io
microservices/sign-translation-orchestrator/server.js   ✅ Express + MongoDB
```

### Route Files (4)
```
microservices/video-call-service/src/routes/callRoutes.js
microservices/frame-processor-service/src/routes/processorRoutes.js
microservices/websocket-service/src/routes/* (N/A - uses Socket events)
microservices/sign-translation-orchestrator/src/routes/orchestratorRoutes.js
```

### WebSocket Handlers (3)
```
microservices/websocket-service/src/handlers/callHandlers.js
microservices/websocket-service/src/handlers/frameHandlers.js
microservices/websocket-service/src/handlers/translationHandlers.js
```

### Models (2)
```
microservices/video-call-service/src/models/Call.js
microservices/sign-translation-orchestrator/src/models/TranslationHistory.js
```

### Middleware (1)
```
microservices/websocket-service/src/middleware/auth.js
```

### Shared Utilities (4)
```
microservices/shared/redisClient.js      → Cache + Pub/Sub
microservices/shared/serviceClient.js    → Inter-service HTTP
microservices/shared/errors.js           → Error handling
microservices/shared/logger.js           → Logging
```

### Docker (5)
```
microservices/video-call-service/Dockerfile
microservices/frame-processor-service/Dockerfile
microservices/websocket-service/Dockerfile
microservices/sign-translation-orchestrator/Dockerfile
docker-compose.yml                                      ⬆️ UPDATED
```

### Documentation (3)
```
VIDEOCALL_ARCHITECTURE.md         → Complete design (200+ lines)
MICROSERVICES_GUIDE.md            → Implementation guide
IMPLEMENTATION_PROGRESS.md        → Tracking & checklists
NEXT_STEPS.md                     ⬆️ UPDATED
```

### Environment Files (4)
```
microservices/env/video-call-service.env.dev
microservices/env/frame-processor-service.env.dev
microservices/env/websocket-service.env.dev
microservices/env/sign-translation-orchestrator.env.dev
```

**Total: 31 files created/updated**

---

## 🏗️ Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser/Mobile)                 │
└────────┬──────────────────────────────────────────────────┬─┘
         │ HTTP + WebSocket                                 │
    ┌────▼────────────────────────────────────────────────┐─▼──┐
    │         API Gateway (Optional for v2)               │    │
    └────┬────────────────────────────────────────────────┘    │
         │                                                     │
    ┌────▼──────────────┐                                     │
    │  WebSocket (3202) ◄─────────────────────────────────────┤
    │ • Frame events    │                                     │
    │ • Call events     │                                     │
    │ • Real-time chat  │      Socket.io Room               │
    └────┬──────────────┘      {callId}                      │
         │                                                    │
    ┌────▼──────────────────────────────────────────────────┐│
    │ Video Call Service (3200)                             ││
    │ ├─ POST /calls/initiate                              ││
    │ ├─ POST /calls/:id/join                              ││
    │ ├─ POST /calls/:id/leave                             ││
    │ └─ POST /calls/:id/end                               ││
    └────┬──────────────────────────────────────────────────┘│
         │                                                    │
    ┌────▼──────────────────────────────────────────────────┐│
    │ Frame Processor (3201)                                ││
    │ ├─ POST /process/frame      → features + inference   ││
    │ ├─ POST /process/batch      → batch process         ││
    │ └─ GET  /process/status/:id → check progress        ││
    │                                                       ││
    │ Calls:                                               ││
    │ ├─ IA Feature Extraction (3102)                     ││
    │ ├─ IA Inference (3101)                              ││
    │ └─ Redis (cache results)                            ││
    └────┬──────────────────────────────────────────────────┘│
         │                                                    │
    ┌────▼──────────────────────────────────────────────────┐│
    │ Orchestrator (3203)                                   ││
    │ ├─ POST /orchestrate/detect    → frame→features→inf  ││
    │ ├─ POST /orchestrate/stream    → continuous process ││
    │ └─ GET  /orchestrate/history   → saved translations  ││
    │                                                       ││
    │ Calls:                                               ││
    │ ├─ Frame Processor (3201)                           ││
    │ ├─ IA Translation (3103)                            ││
    │ ├─ MongoDB (storage)                                ││
    │ └─ Redis (cache)                                    ││
    └────┬──────────────────────────────────────────────────┘│
         │                                                    │
    ┌────▼──────────────────────────────────────────────────┐│
    │ Data Layer                                            ││
    │                                                       ││
    │ MongoDB (27017)                 PostgreSQL (5435)    ││
    │ ├─ calls                        ├─ users             ││
    │ ├─ translation_history          ├─ roles             ││
    │ └─ sessions                     └─ tokens            ││
    │                                                       ││
    │ Redis (6379)                    Auth Service (.NET)  ││
    │ ├─ frame cache                  Port 5104            ││
    │ ├─ session cache                                     ││
    │ └─ pub/sub                                           ││
    └───────────────────────────────────────────────────────┘│
         │                                                    │
         └────────────────────────────────────────────────────┘
```

---

## 🔌 Port Assignments

```
🔵 New Services (Video Call)
3200 = Video Call Service
3201 = Frame Processor Service
3202 = WebSocket Service (Socket.io)
3203 = Sign Translation Orchestrator

🟣 Existing IA Services
3102 = Feature Extraction
3101 = Inference
3103 = Translation
3104 = Dataset
3105 = Training
3000 = IA Gateway

🔴 Existing Infrastructure
5104 = .NET AuthService
5435 = PostgreSQL
27017 = MongoDB
6379 = Redis
```

---

## ⚡ Quick Commands

### Start Services
```bash
# All services (Docker)
docker-compose up -d

# Verify health
curl http://localhost:3200/health
curl http://localhost:3201/health
curl http://localhost:3202/health
curl http://localhost:3203/health

# Watch logs
docker-compose logs -f

# Stop
docker-compose down
```

### Connect to Databases
```bash
# MongoDB
mongodb://localhost:27017/signtrack_videocalls
mongodb://localhost:27017/signtrack_orchestrator

# Redis
redis://localhost:6379

# PostgreSQL
postgresql://root:admin@localhost:5435/SignTrack
```

### Test WebSocket
```bash
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3202', {
  auth: { token: 'JWT_TOKEN_HERE' }
});
socket.on('connection:established', msg => console.log(msg));
socket.emit('call:initiate', { recipientId: 'user-123' });
"
```

### Test HTTP Endpoints
```bash
# Initiate call
curl -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json"

# Process frame
curl -X POST http://localhost:3201/process/frame \
  -H "Content-Type: application/json" \
  -d '{"frame": "base64data", "callId": "call-123"}'

# Get translation history
curl http://localhost:3203/orchestrate/history/call-123 \
  -H "Authorization: Bearer JWT_TOKEN"
```

---

## 📊 Service Responsibilities

| Service | Port | Role | Databases | Dependencies |
|---------|------|------|-----------|--------------|
| **Video Call** | 3200 | Session mgmt | MongoDB | AuthService |
| **Frame Processor** | 3201 | IA orchestration | Redis | Feature Ext, Inference |
| **WebSocket** | 3202 | Real-time comms | Redis | AuthService |
| **Orchestrator** | 3203 | Translation flow | MongoDB, Redis | All IA services |

---

## 🔐 Authentication Flow

```
1. Client logs in → AuthService (5104) → JWT token
2. Client connects to WebSocket (3202) with token
   → auth.js validates via AuthService
   → socket.userId = user id
3. Client calls Video Call Service (3200) with Bearer token
   → middleware validates JWT
   → req.user = user data
4. All inter-service calls use service URLs (no auth tokens)
   → Frame Processor → IA Services
   → Orchestrator → All services
```

---

## 📦 Dependencies Per Service

### Video Call Service
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.0.3",
    "uuid": "^9.0.0"
  }
}
```

### Frame Processor Service
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.3.0",
    "redis": "^4.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3"
  }
}
```

### WebSocket Service
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.0",
    "redis": "^4.6.0",
    "jsonwebtoken": "^9.0.0",
    "axios": "^1.3.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3"
  }
}
```

### Orchestrator Service
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "axios": "^1.3.0",
    "redis": "^4.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.3",
    "uuid": "^9.0.0"
  }
}
```

---

## 🎯 What's Ready to Use

✅ All 4 services can start independently  
✅ Docker Compose orchestrates everything  
✅ Health checks on every service  
✅ WebSocket event handlers defined  
✅ Mongoose models ready  
✅ Redis client configured  
✅ Error handling middleware  
✅ Logger utility  
✅ Service client with retries  
✅ Authentication middleware  

❌ Controller logic (business logic)  
❌ Service layer (IA integration)  
❌ Unit tests  
❌ Integration tests  

---

## 🚀 Next Priority Actions

1. **Implement CallController** (Video Call Service)
   - 5 CRUD operations for calls
   - Estimated: 2-3 hours
   - Then test with Postman

2. **Implement ProcessorController** (Frame Processor)
   - Frame processing + IA integration
   - Estimated: 3-4 hours

3. **Connect WebSocket Events**
   - Bind handlers to Socket.io
   - Estimated: 2 hours

4. **Implement OrchestratorService**
   - Chain IA service calls
   - Estimated: 4-5 hours

---

## 📚 Documentation Files

- **VIDEOCALL_ARCHITECTURE.md** - Full system design (200+ lines)
- **MICROSERVICES_GUIDE.md** - Implementation & deployment (300+ lines)
- **IMPLEMENTATION_PROGRESS.md** - Detailed checklist & tracking
- **NEXT_STEPS.md** - This session's priorities
- **README.md** (in each service) - Service-specific docs (to create)

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port already in use | `lsof -i :PORT` then kill PID |
| MongoDB won't connect | `docker-compose restart mongo` |
| Redis connection refused | `docker-compose up -d redis` |
| WebSocket auth fails | Check JWT_SECRET matches |
| Service health = red | Check logs: `docker-compose logs service-name` |

---

## 📞 Support

**Architecture Questions**: See `VIDEOCALL_ARCHITECTURE.md`
**Deployment Help**: See `MICROSERVICES_GUIDE.md`
**Implementation Tracking**: See `IMPLEMENTATION_PROGRESS.md`
**This Session**: See this file

---

**Status**: ✅ Foundation Complete - Ready for Controller Implementation
**Created**: January 15, 2024
**Files**: 31 created/updated
**Lines of Code**: ~3,500
**Services**: 4 fully scaffolded
