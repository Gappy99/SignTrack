# 🎥 SignTrack - Real-time Sign Language Translation Platform

Video calling platform with **real-time sign language detection and translation** using AI-powered video analysis.

## ✨ Key Features

- ✅ **Real-time Video Calling** - Peer-to-peer video communication
- ✅ **Live Sign Language Detection** - Frame-by-frame analysis
- ✅ **Instant Translation** - Sign language → Text translation
- ✅ **Multi-user Sessions** - Handle multiple concurrent calls
- ✅ **WebSocket Real-time Updates** - Live event streaming
- ✅ **Microservices Architecture** - Scalable, independent services
- ✅ **MongoDB Persistence** - Complete call history and analytics
- ✅ **Redis Caching** - High-performance results caching
- ✅ **AI Integration** - Feature extraction, inference, translation services

## 🏗️ Architecture

### Microservices (Phase 2 - Complete ✅)

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend/Client                        │
└────────────┬──────────────────────┬──────────────────────┬───┘
             │                      │                      │
      ┌──────▼─────┐         ┌──────▼─────┐         ┌──────▼──────┐
      │  Video Call │         │  WebSocket │         │ Orchestrator │
      │  Service    │◄────────│  Service   │◄────────│  Service     │
      │  (3200)     │         │  (3202)    │         │  (3203)      │
      └──────┬─────┘         └────────────┘         └──────┬──────┘
             │                                              │
             │                  ┌──────────────────────────┘
             │                  │
      ┌──────▼─────────────────▼────────┐
      │   Frame Processor Service       │
      │   (3201)                        │
      └──────┬──────────────────────────┘
             │
    ┌────────┴─────────┬────────────────┐
    │                  │                │
 ┌──▼──┐        ┌──────▼────┐    ┌─────▼──┐
 │ 3102│        │   3101    │    │ 3103   │
 │ Feat│        │ Inference │    │  Trans │
 │Extr │        │           │    │lation  │
 └─────┘        └───────────┘    └────────┘
```

### Services Overview

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| Video Call | 3200 | Call lifecycle management | ✅ Complete |
| Frame Processor | 3201 | Image analysis orchestration | ✅ Complete |
| WebSocket | 3202 | Real-time event streaming | ✅ Complete |
| Orchestrator | 3203 | End-to-end translation coordination | ✅ Complete |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB
- Redis

### Quick Start

```bash
# Clone repository
cd SignTrack

# Start infrastructure
docker-compose up -d

# Open 4 terminals and start services

# Terminal 1: Video Call Service
cd microservices/video-call-service && npm install && npm run dev

# Terminal 2: Frame Processor Service
cd microservices/frame-processor-service && npm install && npm run dev

# Terminal 3: WebSocket Service
cd microservices/websocket-service && npm install && npm run dev

# Terminal 4: Orchestrator Service
cd microservices/sign-translation-orchestrator && npm install && npm run dev

# Verify all services
curl http://localhost:3200/health
curl http://localhost:3201/health
curl http://localhost:3202/health
curl http://localhost:3203/health

# Run automated tests
node test-suite.js
```

For detailed instructions, see [RUNNING_GUIDE.md](RUNNING_GUIDE.md).

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [RUNNING_GUIDE.md](RUNNING_GUIDE.md) | How to start services and configure environment |
| [TESTING_GUIDE.md](TESTING_GUIDE.md) | Complete API testing with cURL examples |
| [PHASE_2_PROGRESS.md](PHASE_2_PROGRESS.md) | Phase 2 completion summary and metrics |
| [NEXT_STEPS.md](NEXT_STEPS.md) | Roadmap and future enhancements |

---

## 🔌 API Examples

### Initiate Video Call
```bash
curl -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-123",
    "metadata": {"topic": "Meeting"}
  }'
```

### Detect and Translate Sign Language
```bash
curl -X POST http://localhost:3203/orchestrate/detect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "frame": "base64_encoded_image",
    "callId": "call_123"
  }'
```

### Get Translation History
```bash
curl http://localhost:3203/orchestrate/history/call_123?limit=50
```

For complete API documentation, see [TESTING_GUIDE.md](TESTING_GUIDE.md).

---

## 🏗️ Project Structure

```
SignTrack/
├── microservices/
│   ├── video-call-service/
│   │   ├── src/
│   │   │   ├── controllers/callController.js ✅
│   │   │   ├── models/Call.js
│   │   │   ├── routes/callRoutes.js ✅
│   │   │   └── middleware/
│   │   └── server.js ✅
│   │
│   ├── frame-processor-service/
│   │   ├── src/
│   │   │   ├── controllers/processorController.js ✅
│   │   │   ├── services/frameService.js ✅
│   │   │   ├── routes/processorRoutes.js ✅
│   │   │   └── models/
│   │   └── server.js ✅
│   │
│   ├── sign-translation-orchestrator/
│   │   ├── src/
│   │   │   ├── controllers/orchestratorController.js ✅
│   │   │   ├── services/orchestratorService.js ✅
│   │   │   ├── routes/orchestratorRoutes.js ✅
│   │   │   ├── models/
│   │   │   └── middleware/
│   │   └── server.js ✅
│   │
│   ├── websocket-service/
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   ├── callHandlers.js ✅
│   │   │   │   ├── frameHandlers.js ✅
│   │   │   │   └── translationHandlers.js ✅
│   │   │   ├── middleware/auth.js ✅
│   │   │   └── utils/
│   │   └── server.js ✅
│   │
│   ├── shared/
│   │   ├── auth.js ✅
│   │   ├── errors.js ✅
│   │   ├── redisClient.js ✅
│   │   ├── serviceClient.js ✅
│   │   └── logger.js
│   │
│   └── env/
│       ├── video-call-service.env.dev
│       ├── frame-processor-service.env.dev
│       ├── websocket-service.env.dev
│       └── sign-translation-orchestrator.env.dev
│
├── src/
│   ├── AuthServiceSignTrack.Api/
│   ├── AuthServiceSignTrack.Application/
│   ├── AuthServiceSignTrack.Domain/
│   └── AuthServiceSignTrack.Persistence/
│
├── prisma/
├── docker/
├── config/
├── RUNNING_GUIDE.md
├── TESTING_GUIDE.md
├── PHASE_2_PROGRESS.md
├── test-suite.js
├── docker-compose.yml
├── package.json
└── README.md
```

---

## 🧪 Testing

### Automated Test Suite
```bash
node test-suite.js
```

Runs health checks, authentication, and basic endpoint tests.

### Manual Testing
See [TESTING_GUIDE.md](TESTING_GUIDE.md) for cURL examples and Postman collection.

### WebSocket Testing
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3202', {
  auth: { token: 'JWT_TOKEN' }
});

socket.on('connection:established', () => console.log('Connected'));

socket.emit('call:initiate', { recipientId: 'user-123' });

socket.on('call:incoming', (data) => console.log('Incoming:', data));
```

---

## 🔐 Security

### Authentication
- JWT-based authentication
- Fallback validation for service resilience
- Token validation on all protected endpoints

### Authorization
- Role-based access control (RBAC)
- User-specific resource access

### Data Protection
- HTTPS/TLS in production
- MongoDB encryption at rest
- Redis connection pooling

---

## 📊 Performance

### Latency Targets
| Operation | Target |
|-----------|--------|
| Video Call Initiation | < 500ms |
| Frame Processing | 250-500ms |
| Translation Detection | < 1s |
| WebSocket Message | < 100ms |

### Scalability
- Horizontal scaling with Kubernetes
- Load balancing for microservices
- Redis pub/sub for message distribution
- MongoDB sharding for data distribution

---

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check dependencies
npm install

# Check ports
lsof -i :3200  # Video Call
lsof -i :3201  # Frame Processor
lsof -i :3202  # WebSocket
lsof -i :3203  # Orchestrator

# Check environment variables
cat microservices/env/service-name.env.dev
```

### Database Connection Issues
```bash
# Check MongoDB
docker-compose ps mongo
docker-compose logs mongo

# Check Redis
docker-compose ps redis
docker-compose logs redis
```

### API Returns 500 Error
```bash
# Check service logs
cd microservices/service-name
tail -f logs/*.log

# Check Docker logs
docker-compose logs service-name-container
```

---

## 📈 Roadmap

### Phase 1: ✅ Complete
- Microservices architecture design
- Docker/container setup
- Database schema
- Authentication service

### Phase 2: ✅ Complete
- Controller implementation
- Service layer development
- Route connections
- Error handling

### Phase 3: In Progress
- Input validation (Joi/Yup)
- Rate limiting
- Winston logging
- Comprehensive testing

### Phase 4: Planned
- Performance optimization
- Monitoring & metrics (Prometheus)
- Circuit breaker pattern
- Caching optimization

### Phase 5: Future
- GraphQL layer
- Admin dashboard
- Advanced analytics
- ML model updates

---

## 🤝 Contributing

1. Follow the microservices pattern
2. Add error handling with custom classes
3. Write tests for new features
4. Update documentation
5. Follow project structure conventions

---

## 📄 License

Licensed under the MIT License.

---

## 👥 Support

For issues or questions:
1. Check [RUNNING_GUIDE.md](RUNNING_GUIDE.md) troubleshooting section
2. Review [TESTING_GUIDE.md](TESTING_GUIDE.md) for API examples
3. Check service logs in `microservices/*/logs/`
4. Run `node test-suite.js` to verify setup

---

## 📞 Contact

Email: support@signtrack.dev

---

**Last Updated**: January 15, 2024  
**Current Phase**: Phase 2 - Implementation Complete ✅  
**Status**: Ready for Testing and Integration
