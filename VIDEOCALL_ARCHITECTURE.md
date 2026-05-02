# 🎥 Arquitectura Backend - Video Llamadas con Traducción de Lenguaje de Signos

## 📊 Microservicios Requeridos

### 1. **Video Call Service** (Puerto: 3200)
**Responsabilidad:** Gestionar sesiones de videollamadas
- Crear/terminar llamadas
- Gestionar conexiones de usuarios
- Almacenar metadatos de llamadas
- Estado de sesión

**Tecnología:** Node.js + Express

**Endpoints:**
```
POST   /calls/initiate          - Iniciar llamada
POST   /calls/{callId}/join     - Unirse a llamada
POST   /calls/{callId}/leave    - Salir de llamada
GET    /calls/{callId}/status   - Estado de llamada
POST   /calls/{callId}/end      - Terminar llamada
```

---

### 2. **Frame Processor Service** (Puerto: 3201)
**Responsabilidad:** Procesar frames de video en tiempo real
- Recibir frames (base64/buffer)
- Enviar a IA para detección
- Cachear resultados
- Manejo de errores/reintentos

**Tecnología:** Node.js + Express

**Endpoints:**
```
POST   /process/frame           - Procesar un frame
POST   /process/batch           - Procesar múltiples frames
GET    /process/status/{frameId} - Estado de procesamiento
```

---

### 3. **WebSocket Service** (Puerto: 3202)
**Responsabilidad:** Comunicación en tiempo real
- Streaming de frames
- Transmisión de resultados IA
- Sincronización entre usuarios
- Notificaciones

**Tecnología:** Node.js + Socket.io

**Eventos:**
```
socket.on('frame:captured', (frame) => ...)
socket.on('translation:detected', (data) => ...)
socket.on('call:status-change', (status) => ...)
socket.on('user:joined', (userData) => ...)
socket.on('user:left', (userData) => ...)
```

---

### 4. **Sign Translation Orchestrator** (Puerto: 3203)
**Responsabilidad:** Orquestar todo el flujo de traducción
- Coordinar con Frame Processor
- Llamar a IA (inference + translation)
- Mantener historial de traducción
- Generar reportes

**Tecnología:** Node.js + Express

**Endpoints:**
```
POST   /orchestrate/stream      - Iniciar stream de traducción
POST   /orchestrate/detect      - Detectar seña
GET    /orchestrate/history/{callId} - Historial de traducción
```

---

### 5. **Call Storage Service** (Opcional pero recomendado - Puerto: 3204)
**Responsabilidad:** Almacenar/recuperar datos de llamadas
- Guardar frames capturados
- Almacenar resultados de IA
- Historial de llamadas
- Reportes

**Tecnología:** Node.js + Express + MongoDB

---

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (WebRTC)                          │
│                    Captura Video + Audio                        │
└────────────────────┬────────────────────────────────────────────┘
                     │ WebSocket (Socket.io)
                     ▼
        ┌────────────────────────┐
        │   WebSocket Service    │ (3202)
        │   - Recibe frames      │
        │   - Sincroniza datos   │
        └────────────┬───────────┘
                     │
         ┌───────────┴──────────┐
         ▼                      ▼
┌─────────────────────┐  ┌──────────────────────────┐
│ Frame Processor     │  │ Video Call Service       │
│ Service (3201)      │  │ (3200)                   │
│ - Extrae frames     │  │ - Gestiona sesiones      │
│ - Env a IA          │  │ - Metadata de llamada    │
└────────┬────────────┘  └──────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│   Sign Translation Orchestrator (3203)       │
│   - Coordina flujo IA                        │
│   - Detección → Traducción                   │
│   - Caching de resultados                    │
└───────────┬──────────────────────────────────┘
            │
    ┌───────┴────────┬──────────┬──────────┐
    ▼                ▼          ▼          ▼
┌─────────┐   ┌────────────┐ ┌────────┐ ┌──────────┐
│ Feature │   │ Inference  │ │Transla-│ │ Storage  │
│Extract  │   │ (3101)     │ │tion    │ │ Service  │
│(3102)   │   │            │ │(3103)  │ │ (3204)   │
└─────────┘   └────────────┘ └────────┘ └──────────┘
                    ↓
            ┌────────────────┐
            │ RESULTADO FINAL│
            │ - Seña Detectada
            │ - Traducción   │
            │ - Confianza    │
            └────────────────┘
                    │
                    ▼
        ┌──────────────────────┐
        │  WebSocket Service   │
        │  Broadcast a usuarios │
        └──────────────────────┘
```

---

## 🔗 Integración con Servicios Existentes

### AuthService (.NET - 5104)
- Validar tokens JWT
- Obtener datos de usuario
- Control de acceso

### IA Services (Node.js - 3100+)
- **Feature Extraction (3102):** Extrae puntos clave de manos
- **Inference (3101):** Clasifica las señas
- **Translation (3103):** Genera texto coherente

---

## 📦 Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Framework | Express.js / Node.js |
| Comunicación RT | Socket.io |
| Base de Datos | MongoDB (historiales) |
| Caché | Redis (opcional, para performance) |
| Message Queue | RabbitMQ (opcional, para escalar) |
| Contenedores | Docker + Docker Compose |
| Orquestación | Kubernetes (producción) |

---

## 🚀 Inicio de Desarrollo

### Fase 1: Servicios Base
1. ✅ Video Call Service
2. ✅ Frame Processor Service
3. ✅ WebSocket Service
4. ✅ Sign Translation Orchestrator

### Fase 2: Integración
5. Conectar con AuthService
6. Conectar con IA Services
7. Pruebas de flujo completo

### Fase 3: Optimización
8. Caché Redis
9. Message Queue (RabbitMQ)
10. Kubernetes

---

## 📋 Variables de Entorno

```env
# Puertos
VIDEO_CALL_SERVICE_PORT=3200
FRAME_PROCESSOR_PORT=3201
WEBSOCKET_SERVICE_PORT=3202
ORCHESTRATOR_PORT=3203
STORAGE_SERVICE_PORT=3204

# URLs de servicios IA
IA_FEATURE_EXTRACTION_URL=http://localhost:3102
IA_INFERENCE_URL=http://localhost:3101
IA_TRANSLATION_URL=http://localhost:3103

# Auth
AUTH_SERVICE_URL=http://localhost:5104
JWT_SECRET=your-secret-key

# MongoDB
MONGO_URI=mongodb://localhost:27017/signtrack

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

---

## ⏰ Timeline Estimado

- **Semana 1:** Servicios base + estructura
- **Semana 2:** Integración IA + WebSocket
- **Semana 3:** Testing + optimización
- **Semana 4:** Deploy + documentación
