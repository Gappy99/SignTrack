# SignTrack Microservices Architecture - Implementation Guide

## 🎯 Overview

**SignTrack** es un sistema de videollamadas en tiempo real con traducción de lenguaje de señas integrada. La arquitectura implementa 4 nuevos microservicios para manejar video calling, frame processing, comunicación en tiempo real, y orquestación de traducción.

### Stack Tecnológico

```
Backend:
├── .NET 6+ (Port 5104) - AuthService con JWT
├── Node.js Express (Ports 3200-3203) - 4 nuevos microservicios
├── Socket.io (WebSocket 3202) - Real-time communication
└── IA Services (Ports 3100-3105) - Existing MediaPipe + TensorFlow

Databases:
├── PostgreSQL (5435) - Users, auth
├── MongoDB (27017) - Calls, translations
└── Redis (6379) - Cache, Pub/Sub

Infrastructure:
├── Docker Compose - Orchestración local
└── Environment files - Configuración por servicio
```

---

## 📋 Servicios Implementados

### 1. **Video Call Service** (Puerto 3200)
**Responsabilidad**: Gestión de sesiones de videollamada

```
Endpoints:
POST   /calls/initiate         - Iniciar llamada
POST   /calls/:callId/join     - Unirse a llamada
POST   /calls/:callId/leave    - Salir de llamada
GET    /calls/:callId/status   - Estado de llamada
POST   /calls/:callId/end      - Terminar llamada
GET    /health                 - Health check

Tecnología:
├── Express.js + Mongoose
├── JWT Authentication
├── MongoDB (signtrack_videocalls)
└── CORS + Helmet
```

**Modelo de Datos** (Call):
```javascript
{
  callId: "unique-id",
  initiatorId: "user-1",
  participantIds: ["user-1", "user-2"],
  status: "active|pending|ended",
  startTime: Date,
  endTime: Date,
  duration: seconds,
  metadata: { topic, notes, tags }
}
```

### 2. **Frame Processor Service** (Puerto 3201)
**Responsabilidad**: Procesar frames de video y ejecutar IA

```
Endpoints:
POST   /process/frame          - Procesar frame individual
POST   /process/batch          - Procesar lote de frames
GET    /process/status/:frameId - Estado de procesamiento
GET    /health                 - Health check

Tecnología:
├── Express.js
├── Redis (caching con TTL)
├── Axios (llamadas IA)
├── Base64 frame handling
└── Batch processing queue

Flujo:
1. Recibe frame en base64
2. Extrae características (ia-feature-extraction:3102)
3. Realiza inferencia (ia-inference:3101)
4. Cachea resultado en Redis
5. Retorna detecciones
```

### 3. **WebSocket Service** (Puerto 3202)
**Responsabilidad**: Comunicación en tiempo real

```
Tecnología:
├── Express.js + Socket.io
├── Redis Adapter (multi-instancia)
├── JWT Authentication
└── Room management

WebSocket Events:

Call Events:
├── call:initiate      - Iniciar llamada
├── call:accept        - Aceptar llamada
├── call:reject        - Rechazar llamada
├── call:leave         - Salir de llamada
├── call:end           - Terminar llamada
└── call:get-status    - Obtener estado

Frame Events:
├── frame:captured     - Frame capturado
├── frame:batch        - Lote de frames
├── frame:stream-start - Iniciar streaming
├── frame:stream-stop  - Detener streaming
└── frame:quality      - Ajustar calidad

Translation Events:
├── translation:detected     - Seña detectada
├── translation:get-result   - Obtener resultado
├── translation:history      - Obtener historial
├── translation:subscribe    - Suscribirse
└── translation:batch        - Procesar lote

Rooms:
- callId: Room por videollamada
- multi-instance pub/sub via Redis
```

### 4. **Sign Translation Orchestrator** (Puerto 3203)
**Responsabilidad**: Orquestar flujo de traducción IA

```
Endpoints:
POST   /orchestrate/stream     - Iniciar stream
POST   /orchestrate/detect     - Detectar seña
GET    /orchestrate/history/:callId - Historial
GET    /health                 - Health check

Tecnología:
├── Express.js + Mongoose
├── Redis (caching)
├── Axios (inter-servicio)
├── MongoDB (translation_history)
└── Orchestration logic

Flujo de Traducción:
1. Recibe frame
2. Llama Frame Processor → extrae features + inferencia
3. Llama IA Translation con resultados
4. Guarda historial en MongoDB
5. Cachea en Redis
6. Retorna texto traducido
7. Publica evento via WebSocket

Manejo de Errores:
├── Timeouts configurables
├── Retries automáticos
├── Fallback behavior
└── Logging completo
```

---

## 🚀 Setup e Instalación

### Requisitos Previos

```bash
- Node.js 18+
- Docker & Docker Compose
- .NET 6+ (para AuthService)
- Git
```

### 1. Clonar e Instalar Dependencias

```bash
# Clonar repo
git clone <repo-url>
cd SignTrack

# Instalar dependencias de cada microservicio
cd microservices/video-call-service && npm install
cd ../frame-processor-service && npm install
cd ../websocket-service && npm install
cd ../sign-translation-orchestrator && npm install
cd ../..
```

### 2. Configurar Variables de Entorno

Los archivos `.env.dev` ya están creados en `microservices/env/`:

**video-call-service.env.dev:**
```env
PORT=3200
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/signtrack_videocalls
AUTH_SERVICE_URL=http://localhost:5104
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
```

**frame-processor-service.env.dev:**
```env
PORT=3201
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
IA_FEATURE_EXTRACTION_URL=http://localhost:3102
IA_INFERENCE_URL=http://localhost:3101
FEATURE_EXTRACTION_TIMEOUT=15000
INFERENCE_TIMEOUT=10000
CACHE_TTL=3600
```

**websocket-service.env.dev:**
```env
PORT=3202
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
AUTH_SERVICE_URL=http://localhost:5104
JWT_SECRET=your-secret-key
CORS_ORIGIN=*
```

**sign-translation-orchestrator.env.dev:**
```env
PORT=3203
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/signtrack_orchestrator
REDIS_HOST=localhost
REDIS_PORT=6379
FRAME_PROCESSOR_URL=http://localhost:3201
IA_FEATURE_EXTRACTION_URL=http://localhost:3102
IA_INFERENCE_URL=http://localhost:3101
IA_TRANSLATION_URL=http://localhost:3103
WEBSOCKET_SERVICE_URL=http://localhost:3202
FEATURE_EXTRACTION_TIMEOUT=15000
INFERENCE_TIMEOUT=10000
TRANSLATION_TIMEOUT=5000
CACHE_TTL=3600
```

### 3. Iniciar con Docker Compose

```bash
# Build y start todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar health checks
curl http://localhost:3200/health
curl http://localhost:3201/health
curl http://localhost:3202/health
curl http://localhost:3203/health

# Detener
docker-compose down
```

### 4. Ejecución Local (sin Docker)

```bash
# Terminal 1: Video Call Service
cd microservices/video-call-service
npm start

# Terminal 2: Frame Processor Service
cd microservices/frame-processor-service
npm start

# Terminal 3: WebSocket Service
cd microservices/websocket-service
npm start

# Terminal 4: Sign Translation Orchestrator
cd microservices/sign-translation-orchestrator
npm start
```

---

## 🔗 Flujo de Integración

### Escenario: Videollamada con Traducción en Tiempo Real

```
1. Cliente A inicia llamada
   POST /calls/initiate → Video Call Service
   ├─ Crea registro en MongoDB
   ├─ Retorna callId
   └─ Emite via WebSocket

2. Cliente B se conecta
   WebSocket: call:initiate
   ├─ conecta a room en WebSocket Service
   ├─ notifica Cliente A via Socket.io
   └─ ambos conectan al call

3. Cliente A envía video
   WebSocket: frame:captured
   ├─ Frame Processor extrae features
   ├─ Ejecuta inferencia
   ├─ Cachea en Redis
   └─ retorna signo detectado

4. Orquestador traduce
   POST /orchestrate/detect
   ├─ llama ia-translation
   ├─ obtiene texto coherente
   ├─ guarda en MongoDB
   └─ publica resultado via WebSocket

5. Cliente B recibe traducción
   WebSocket: translation:result
   ├─ texto traducido
   ├─ confianza
   └─ timestamp
```

### Comunicación Inter-Servicio

```
Video Call Service
├─ JWT validation → AuthService
└─ notificaciones → WebSocket Service

Frame Processor Service
├─ features → ia-feature-extraction (3102)
├─ inference → ia-inference (3101)
└─ cachea → Redis

WebSocket Service
├─ auth → AuthService
├─ pub/sub → Redis
└─ eventos → todos los clientes

Sign Translation Orchestrator
├─ features/inference → Frame Processor (3201)
├─ traducción → ia-translation (3103)
├─ historial → MongoDB
├─ eventos → WebSocket Service
└─ cachea → Redis
```

---

## 📊 Monitoreo y Health Checks

Todos los servicios exponen endpoints de health:

```bash
# Video Call Service
curl http://localhost:3200/health

# Frame Processor Service
curl http://localhost:3201/health

# WebSocket Service
curl http://localhost:3202/health
curl http://localhost:3202/stats

# Sign Translation Orchestrator
curl http://localhost:3203/health
```

Respuesta esperada:
```json
{
  "status": "Healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "service": "Service Name",
  "uptime": 125.45
}
```

---

## 🔐 Seguridad

### Autenticación

- **JWT Tokens**: Emitidos por AuthService (validez 30 min)
- **Validación Dual**: 
  - Local (jwt.verify con SECRET)
  - Contra AuthService (fallback)
- **Socket.io Auth**: Token en header o en socket.handshake.auth

### Autorización

- Role-based access control (RBAC)
- Validación de permisos en cada endpoint
- Middleware: `validateTokenHTTP`, `authMiddleware`

### Rate Limiting

```javascript
// Por implementar en producción
- 100 req/min por usuario
- 10 frame/sec por cliente
- WebSocket throttling
```

---

## 📦 Estructura de Directorios

```
microservices/
├── video-call-service/
│   ├── src/
│   │   ├── models/Call.js
│   │   ├── controllers/callController.js
│   │   ├── routes/callRoutes.js
│   │   └── middleware/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── env/video-call-service.env.dev

├── frame-processor-service/
│   ├── src/
│   │   ├── models/Frame.js
│   │   ├── controllers/processorController.js
│   │   ├── routes/processorRoutes.js
│   │   └── services/iaService.js
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── env/frame-processor-service.env.dev

├── websocket-service/
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── callHandlers.js
│   │   │   ├── frameHandlers.js
│   │   │   └── translationHandlers.js
│   │   ├── middleware/auth.js
│   │   ├── utils/
│   │   └── events/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── env/websocket-service.env.dev

├── sign-translation-orchestrator/
│   ├── src/
│   │   ├── models/TranslationHistory.js
│   │   ├── controllers/orchestratorController.js
│   │   ├── routes/orchestratorRoutes.js
│   │   ├── services/orchestrationService.js
│   │   └── middleware/
│   ├── server.js
│   ├── package.json
│   ├── Dockerfile
│   └── env/sign-translation-orchestrator.env.dev

├── shared/
│   ├── redisClient.js      # Redis utilities
│   ├── serviceClient.js    # HTTP client for inter-service
│   ├── errors.js           # Error handling
│   ├── logger.js           # Logging
│   └── validators.js       # Input validation

├── ia-feature-extraction/server.js
├── ia-inference/server.js
├── ia-translation/server.js
├── ia-dataset/server.js
├── ia-training/server.js
├── env/                     # Environment files
│   ├── *.env.dev
│   └── *.env.prod

└── docker-compose.yml
```

---

## 🧪 Testing

### Unit Tests

```bash
# Video Call Service
cd microservices/video-call-service
npm test

# Frame Processor Service
cd microservices/frame-processor-service
npm test
```

### Integration Tests

```bash
# All services health
npm run test:integration

# WebSocket events
npm run test:websocket
```

### Load Testing

```bash
# 100 concurrent calls
npm run test:load -- --concurrent=100

# Frame processing throughput
npm run test:frames -- --fps=30 --duration=60
```

---

## 🐛 Troubleshooting

### Puerto ya en uso

```bash
# Encontrar proceso usando puerto
lsof -i :3200
kill -9 <PID>

# O cambiar puerto en .env
PORT=3200
```

### MongoDB no conecta

```bash
# Verificar MongoDB está corriendo
docker ps | grep mongo

# Reiniciar
docker-compose restart mongo
```

### Redis connection refused

```bash
# Iniciar Redis
docker-compose up -d redis

# Verificar
redis-cli ping
```

### WebSocket auth fails

```
1. Verificar JWT token válido
2. Verificar AuthService está corriendo
3. Verificar JWT_SECRET coincide
4. Ver logs: docker-compose logs websocket-service
```

---

## 📝 Próximos Pasos

- [ ] Implementar controllers y modelos adicionales
- [ ] Agregar logging completo (Winston/Bunyan)
- [ ] Rate limiting y throttling
- [ ] API Gateway service
- [ ] Autoscaling con Kubernetes
- [ ] CI/CD pipeline
- [ ] Performance monitoring (Prometheus)
- [ ] Distributed tracing (Jaeger)

---

## 📞 Soporte

Para reportar issues o sugerencias, crear un issue en GitHub con:
- Descripción del problema
- Logs relevantes
- Pasos para reproducir
- Ambiente (OS, Node version, Docker version)

---

**Last Updated**: 2024-01-15
**Architecture Version**: 1.0
**Status**: Development
