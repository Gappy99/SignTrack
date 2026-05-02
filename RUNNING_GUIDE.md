# 🚀 SignTrack Microservices - Running Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- MongoDB running
- Redis running

## Quick Start

### 1. Start Infrastructure (Docker)

```bash
cd /path/to/SignTrack
docker-compose up -d

# Verify containers are running
docker-compose ps
```

Expected containers:
- `signtrack-mongo` → Port 27017
- `signtrack-redis` → Port 6379
- `auth-service` → Port 5104
- `ia-runtime` → Ports 3101, 3102, 3103

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# OR if using pnpm
pnpm install
```

### 3. Start Microservices

Open 4 separate terminals and run each service:

#### Terminal 1: Video Call Service
```bash
cd microservices/video-call-service
npm install
npm run dev
# Output: Running on port 3200
```

#### Terminal 2: Frame Processor Service
```bash
cd microservices/frame-processor-service
npm install
npm run dev
# Output: Running on port 3201
```

#### Terminal 3: WebSocket Service
```bash
cd microservices/websocket-service
npm install
npm run dev
# Output: Running on port 3202
```

#### Terminal 4: Orchestrator Service
```bash
cd microservices/sign-translation-orchestrator
npm install
npm run dev
# Output: Running on port 3203
```

### Verify All Services Running

```bash
# Check all health endpoints
curl http://localhost:3200/health
curl http://localhost:3201/health
curl http://localhost:3202/health
curl http://localhost:3203/health

# All should return: {"status": "Healthy", ...}
```

---

## Environment Variables

### Video Call Service (3200)
File: `microservices/env/video-call-service.env.dev`
```env
PORT=3200
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/signtrack
JWT_SECRET=your-secret-key
AUTH_SERVICE_URL=http://localhost:5104
REDIS_URL=redis://localhost:6379
```

### Frame Processor Service (3201)
File: `microservices/env/frame-processor-service.env.dev`
```env
PORT=3201
NODE_ENV=development
REDIS_URL=redis://localhost:6379
IA_FEATURE_EXTRACTION_URL=http://localhost:3102
IA_INFERENCE_URL=http://localhost:3101
CACHE_TTL=3600
```

### WebSocket Service (3202)
File: `microservices/env/websocket-service.env.dev`
```env
PORT=3202
NODE_ENV=development
AUTH_SERVICE_URL=http://localhost:5104
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=*
```

### Orchestrator Service (3203)
File: `microservices/env/sign-translation-orchestrator.env.dev`
```env
PORT=3203
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/signtrack
REDIS_URL=redis://localhost:6379
FRAME_PROCESSOR_URL=http://localhost:3201
IA_FEATURE_EXTRACTION_URL=http://localhost:3102
IA_INFERENCE_URL=http://localhost:3101
IA_TRANSLATION_URL=http://localhost:3103
WEBSOCKET_SERVICE_URL=http://localhost:3202
JWT_SECRET=your-secret-key
AUTH_SERVICE_URL=http://localhost:5104
```

---

## Running Tests

### Automated Test Suite
```bash
# Run all tests
node test-suite.js
```

Output:
```
═══ Health Checks ═══
[TEST] Video Call Service health... ✓ PASS
[TEST] Frame Processor Service health... ✓ PASS
[TEST] Orchestrator Service health... ✓ PASS
[TEST] WebSocket Service health... ✓ PASS

═══ Authentication Tests ═══
[TEST] Get JWT token from mock... ✓ PASS

═══ Video Call Service Tests ═══
[TEST] Initiate call... ✓ PASS
[TEST] Get call status... ✓ PASS
[TEST] Join call... ✓ PASS

... etc
```

### Manual Testing with cURL

See `TESTING_GUIDE.md` for detailed cURL examples.

Quick example:
```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:5104/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | jq -r '.data.token')

# Test Video Call Service
curl -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user-123"}'
```

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on port 3200 | Service not running. Check terminal 1. |
| `MongoDB connection failed` | Run `docker-compose up -d mongo` |
| `Redis connection refused` | Run `docker-compose up -d redis` |
| `Auth validation failed` | Check AUTH_SERVICE_URL in env file |
| `404 Not Found` | Check endpoint URL and HTTP method |

---

## Performance Monitoring

### Logs Location
```bash
# Video Call Service logs
cat microservices/video-call-service/logs/*.log

# Orchestrator logs
cat microservices/sign-translation-orchestrator/logs/*.log
```

### Docker Logs
```bash
# View service logs
docker-compose logs -f video-call-service
docker-compose logs -f frame-processor-service
docker-compose logs -f websocket-service
docker-compose logs -f orchestrator-service
```

---

## Stopping Services

### Stop Individual Service
Press `Ctrl+C` in the terminal where service is running.

### Stop All Containers
```bash
docker-compose down
```

### Stop and Remove Volumes (⚠️ Removes data)
```bash
docker-compose down -v
```

---

## Next Steps

1. **Run health checks** to verify all services online
2. **Run test suite** to validate endpoints
3. **Test with Postman** using examples in TESTING_GUIDE.md
4. **Check logs** for any errors
5. **Connect frontend** to WebSocket service

---

## API Endpoints Reference

### Video Call Service (3200)
- `POST /calls/initiate` - Start new call
- `POST /calls/:callId/join` - Join call
- `POST /calls/:callId/leave` - Leave call
- `GET /calls/:callId/status` - Get status
- `POST /calls/:callId/end` - End call
- `GET /calls/user/history` - Call history
- `GET /calls/user/active` - Active call

### Frame Processor (3201)
- `POST /process/frame` - Process single frame
- `POST /process/batch` - Process batch
- `GET /process/status/:frameId` - Get status
- `GET /process/frame/:frameId` - Get result
- `GET /process/batch/:batchId` - Get batch result
- `GET /process/batch/:batchId/progress` - Get progress

### Orchestrator (3203)
- `POST /orchestrate/detect` - Detect & translate
- `POST /orchestrate/stream` - Start stream
- `POST /orchestrate/stream/:streamId/stop` - Stop stream
- `GET /orchestrate/history/:callId` - Translation history
- `GET /orchestrate/statistics/:callId` - Statistics
- `GET /orchestrate/result/:detectionId` - Get result
- `GET /orchestrate/stream/:streamId` - Stream info
- `PATCH /orchestrate/stream/:streamId/metrics` - Update metrics

### WebSocket (3202)
- `ws://localhost:3202` - WebSocket connection
- Emits/Receives: call, frame, translation events

---

**Last Updated**: January 15, 2024
**Phase**: 2 - Implementation Complete
