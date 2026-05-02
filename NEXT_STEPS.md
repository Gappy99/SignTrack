# SignTrack Backend - Implementation Roadmap

## 🎯 Current Status

✅ **Phase 1: Foundation** (COMPLETED)
- Architecture designed (VIDEOCALL_ARCHITECTURE.md)
- 4 microservices scaffolded (video-call, frame-processor, websocket, orchestrator)
- Docker Compose configured with 4 new services
- Shared utilities created (Redis, HTTP client, logging, errors)
- Database models defined (Call, TranslationHistory)
- WebSocket event handlers implemented
- Dockerfiles created for all services

⏳ **Phase 2: Controllers** (IN PROGRESS)
- Route stubs created
- Middleware implemented
- Ready for business logic

❌ **Phase 3+: Advanced Features** (TODO)
- Full controller implementation
- Service-to-service communication
- Error handling and resilience
- Testing and deployment

---

## 🚀 Immediate Next Steps

### Priority 1: Implement Video Call Service Controller ⚡

**File**: `microservices/video-call-service/src/controllers/callController.js`

```javascript
// Export these 5 functions:
export async function initiateCall(req, res, next)
export async function joinCall(req, res, next)
export async function leaveCall(req, res, next)
export async function getCallStatus(req, res, next)
export async function endCall(req, res, next)

// Each function:
1. Validate JWT token (middleware should handle)
2. Extract user from req.user
3. Validate request body/params
4. Perform MongoDB operations using Call model
5. Return proper HTTP response
```

**Test Endpoints**:
```bash
# After implementation:
curl -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"metadata": {"topic": "Test"}}'
```

### Priority 2: Implement Frame Processor Controller ⚡⚡

**File**: `microservices/frame-processor-service/src/controllers/processorController.js`

Key logic:
1. **processFrame()**: Extract frame → call feature-extraction → call inference → cache
2. **processBatch()**: Queue frames → process sequentially → return results
3. **getProcessingStatus()**: Check Redis/cache → return progress

### Priority 3: Connect WebSocket Events 🔌

Verify Socket.io handlers:
```bash
# Test WebSocket connection:
node -e "
const io = require('socket.io-client');
const socket = io('http://localhost:3202', {
  auth: { token: '<JWT_TOKEN>' }
});
socket.emit('call:initiate', { recipientId: 'user-2' });
"
```

### Priority 4: Implement Orchestrator Service 🎼

Chain all IA services:
```javascript
// Feature → Inference → Translation pipeline
const features = await featureExtractionService.call(frame);
const inference = await inferenceService.call(features);
const translation = await translationService.call(inference.signs);
```

---

## 📦 Quick Setup Commands

```bash
# 1. Start all services with Docker
docker-compose up -d

# 2. Verify services are healthy
for port in 3200 3201 3202 3203; do
  echo "Port $port:"
  curl http://localhost:$port/health 2>/dev/null | jq .
done

# 3. Watch logs
docker-compose logs -f

# 4. Stop all
docker-compose down
```

---

## 🔗 Service Connections

```
AuthService (5104)
├─ validates JWT for all services
└─ provides user info

Video Call Service (3200)
├─ manages call sessions
├─ stores in MongoDB
└─ notifies via WebSocket

Frame Processor (3201)
├─ calls IA services
├─ extracts features + inference
├─ caches in Redis
└─ used by Orchestrator

WebSocket Service (3202)
├─ real-time communication
├─ pub/sub via Redis
├─ room management by callId
└─ broadcasts events

Orchestrator (3203)
├─ chains Frame → IA → Translation
├─ stores translation history
├─ manages result caching
└─ publishes to WebSocket

IA Services (3100+)
├─ Feature Extraction (3102)
├─ Inference (3101)
└─ Translation (3103)
```

---

## 📋 Database Setup

**MongoDB Collections**:
```bash
# Video Call Service
db.createCollection("calls", {
  validator: { /* Call schema */ }
})

# Orchestrator Service  
db.createCollection("translation_history", {
  validator: { /* TranslationHistory schema */ }
})
```

**Redis Keys**:
```
frame:{frameId}         → Cached frame processing result (TTL: 3600s)
call:{callId}:metadata  → Call metadata (TTL: 86400s)
translation:{txnId}     → Translation result (TTL: 3600s)
```

---

## 🧪 Testing Workflow

### 1. Unit Test Controllers
```bash
cd microservices/video-call-service
npm test
```

### 2. Integration Test Services
```bash
# Test service-to-service calls
npm run test:integration
```

### 3. End-to-End Test
```bash
# Test complete call flow
npm run test:e2e
```

---

## 📝 Implementation Checklist

### Video Call Service
- [ ] `CallController.js` with 5 methods
- [ ] Integrate with `Call.js` model
- [ ] Add validation middleware
- [ ] Connect routes in `callRoutes.js`
- [ ] Test with Postman/curl

### Frame Processor Service  
- [ ] `ProcessorController.js` with 3 methods
- [ ] `IAService.js` for service calls
- [ ] Redis caching logic
- [ ] Error handling & retries
- [ ] Connect routes in `processorRoutes.js`

### WebSocket Service
- [ ] Connect Socket.io to handlers
- [ ] Test room joining/leaving
- [ ] Verify event emission
- [ ] Test with WebSocket client

### Orchestrator Service
- [ ] `OrchestratorController.js`
- [ ] `OrchestratorService.js` with pipeline
- [ ] MongoDB history storage
- [ ] Redis caching
- [ ] Connect routes

---

## 🐛 Debugging Tips

**Check service health**:
```bash
curl http://localhost:PORT/health
```

**View logs**:
```bash
docker-compose logs SERVICE_NAME
```

**Test MongoDB connection**:
```bash
mongodb://localhost:27017
# Collections: calls, translation_history
```

**Test Redis connection**:
```bash
redis-cli ping
redis-cli KEYS "*"
```

**Test IA services**:
```bash
curl http://localhost:3102/health  # feature-extraction
curl http://localhost:3101/health  # inference
curl http://localhost:3103/health  # translation
```

---

## ✨ Architecture Overview

See `VIDEOCALL_ARCHITECTURE.md` for complete design.

See `MICROSERVICES_GUIDE.md` for deployment & testing.

See `IMPLEMENTATION_PROGRESS.md` for detailed tracking.

Export landmarks from Neon to CSV:
```bash
node src/IA/db/exportLetterDatasetFromNeon.js
```

Creates: `src/IA/dataset/letter_training.csv`

### Step 4: Train Model

Train a RandomForest classifier:
```bash
c:/2024505/SignTrack/.venv/Scripts/python.exe src/IA/model/train_model.py
```

Creates: `src/IA/model/model.pkl`

### Step 5: Start API

Start the prediction server:
```bash
node src/IA/api/server.js
```

Server runs on `http://localhost:3000`

### Step 6: Test Prediction

Make a prediction request:

**Option A: With image path**
```bash
curl -X POST http://localhost:3000/predict-letter \
  -H "Content-Type: application/json" \
  -d '{"imagePath":"./test_a.jpg"}'
```

**Option B: With extracted features**
```bash
curl -X POST http://localhost:3000/predict-letter \
  -H "Content-Type: application/json" \
  -d '{"features":[0.12, 0.08, 0.11, 1.45, 1.39, 0.92, 1.23, 0.78, 0.95]}'
```

## Troubleshooting

**"relation 'signs' does not exist"**
→ Run `node src/IA/db/initSchema.js` first

**"No landmarks extracted"**
→ Check image format (JPG/PNG), hand visibility, file permissions

**"ModuleNotFoundError: joblib"**
→ Install: `./.venv/Scripts/pip install joblib scikit-learn pandas numpy opencv-python mediapipe`

**"Dataset not found at sign_dataset.csv"**
→ Need to run Step 2 (backfill) and Step 3 (export) first

## Architecture Files

- **Data**: R2 (S3-compatible)
- **Metadata**: Neon PostgreSQL
- **Processing**: Python MediaPipe + scikit-learn
- **API**: Node.js Express (port 3007)

### Key Python Scripts

| File | Purpose |
|------|---------|
| `src/IA/recognition/extract_from_image.py` | Extract 21 landmarks + 9 features |
| `src/IA/db/backfillFromR2.js` | Download R2 images → extract → save Neon |
| `src/IA/db/exportLetterDatasetFromNeon.js` | Export features → CSV for training |
| `src/IA/model/train_model.py` | Train RandomForest on CSV |
| `src/IA/api/server.js` | Prediction API endpoint |

## Timeline

With ~20 images per letter (26 letters = 520 total):

- Step 2 (backfill): ~10-15 mins (depends on R2 bandwidth)
- Step 3 (export): ~1 min
- Step 4 (training): ~2-5 mins
- **Total**: ~20 mins to working model

## Future Enhancements

- [ ] Word recognition (sequence-based detection)
- [ ] Gemini integration for text refinement
- [ ] Prisma ORM (optional, for type safety)
- [ ] React UI for live prediction
