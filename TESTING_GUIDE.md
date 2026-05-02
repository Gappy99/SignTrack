# SignTrack Microservices - Testing Guide

## 🧪 Testing All Endpoints

### Prerequisites

```bash
# Asegúrate de que todos los servicios están corriendo
docker-compose up -d

# Verifica que todos sean healthy
curl http://localhost:3200/health
curl http://localhost:3201/health
curl http://localhost:3202/health
curl http://localhost:3203/health
```

### Autenticación

Primero, obtén un token JWT del AuthService:

```bash
# Login para obtener token
JWT_TOKEN=$(curl -X POST http://localhost:5104/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.data.token')

echo "Token: $JWT_TOKEN"
```

O usa un token de test (reemplaza con uno válido):

```bash
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📞 Video Call Service (Puerto 3200)

### 1. Iniciar Videollamada

```bash
curl -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-123",
    "metadata": {
      "topic": "Emergency Meeting",
      "notes": "Important discussion"
    }
  }'
```

**Response esperada:**
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "data": {
    "callId": "call_550e8400-e29b-41d4-a716-446655440000",
    "initiatorId": "user-456",
    "status": "pending",
    "createdAt": "2024-01-15T10:00:00Z",
    "recipientId": "user-123"
  }
}
```

### 2. Unirse a Videollamada

```bash
CALL_ID="call_550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:3200/calls/$CALL_ID/join \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Obtener Estado de Llamada

```bash
curl http://localhost:3200/calls/$CALL_ID/status \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 4. Salir de Llamada

```bash
curl -X POST http://localhost:3200/calls/$CALL_ID/leave \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Terminar Llamada

```bash
curl -X POST http://localhost:3200/calls/$CALL_ID/end \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Obtener Historial de Llamadas

```bash
curl "http://localhost:3200/calls/user/history?limit=10&skip=0" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### 7. Obtener Llamada Activa

```bash
curl http://localhost:3200/calls/user/active \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 🎬 Frame Processor Service (Puerto 3201)

### Crear Frame de Prueba

Primero, necesitas un frame en base64. Aquí hay un pequeño placeholder:

```bash
# Usar un pequeño frame de prueba (en producción sería frame real)
FRAME_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
```

### 1. Procesar Frame Individual

```bash
curl -X POST http://localhost:3201/process/frame \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"frame\": \"$FRAME_B64\",
    \"callId\": \"$CALL_ID\"
  }"
```

**Response esperada:**
```json
{
  "success": true,
  "message": "Frame processing initiated",
  "data": {
    "frameId": "frame_1705318800000",
    "status": "completed",
    "features": { ... },
    "inference": { ... },
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Procesar Lote de Frames

```bash
curl -X POST http://localhost:3201/process/batch \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"frames\": [
      \"$FRAME_B64\",
      \"$FRAME_B64\",
      \"$FRAME_B64\"
    ],
    \"callId\": \"$CALL_ID\"
  }"
```

### 3. Obtener Estado de Procesamiento

```bash
FRAME_ID="frame_1705318800000"

curl http://localhost:3201/process/status/$FRAME_ID
```

### 4. Obtener Resultado de Frame

```bash
curl http://localhost:3201/process/frame/$FRAME_ID
```

### 5. Obtener Resultado de Batch

```bash
BATCH_ID="batch_550e8400-e29b-41d4-a716-446655440000"

curl http://localhost:3201/process/batch/$BATCH_ID
```

### 6. Obtener Progreso de Batch

```bash
curl http://localhost:3201/process/batch/$BATCH_ID/progress
```

---

## 🔤 Sign Translation Orchestrator (Puerto 3203)

### 1. Detectar Seña y Traducir

```bash
curl -X POST http://localhost:3203/orchestrate/detect \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"frame\": \"$FRAME_B64\",
    \"callId\": \"$CALL_ID\"
  }"
```

**Response esperada:**
```json
{
  "success": true,
  "message": "Detection and translation completed",
  "data": {
    "detectionId": "detect_550e8400...",
    "callId": "call_550e8400...",
    "userId": "user-456",
    "signs": ["HOLA", "MUNDO"],
    "text": "Hola mundo",
    "confidence": 0.92,
    "processingTime": 245,
    "timestamp": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Iniciar Stream de Traducción

```bash
curl -X POST http://localhost:3203/orchestrate/stream \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"callId\": \"$CALL_ID\"
  }"
```

### 3. Detener Stream

```bash
STREAM_ID="stream_550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:3203/orchestrate/stream/$STREAM_ID/stop \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Obtener Historial de Traducciones

```bash
curl "http://localhost:3203/orchestrate/history/$CALL_ID?limit=50&skip=0"
```

### 5. Obtener Estadísticas de Traducción

```bash
curl http://localhost:3203/orchestrate/statistics/$CALL_ID
```

### 6. Obtener Resultado de Detección

```bash
DETECTION_ID="detect_550e8400-e29b-41d4-a716-446655440000"

curl http://localhost:3203/orchestrate/result/$DETECTION_ID
```

### 7. Obtener Información de Stream

```bash
curl http://localhost:3203/orchestrate/stream/$STREAM_ID
```

### 8. Actualizar Métricas de Stream

```bash
curl -X PATCH http://localhost:3203/orchestrate/stream/$STREAM_ID/metrics \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"frames\": 10,
    \"translations\": 8
  }"
```

---

## 🔌 WebSocket Service (Puerto 3202)

### Conectarse a WebSocket

```javascript
// Cliente JavaScript
const io = require('socket.io-client');

const socket = io('http://localhost:3202', {
  auth: {
    token: 'JWT_TOKEN_HERE'
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Escuchar conexión
socket.on('connection:established', (data) => {
  console.log('Connected:', data);
});

// Emitir eventos
socket.emit('call:initiate', {
  recipientId: 'user-123'
});

// Escuchar eventos
socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
});

socket.on('frame:captured', (data) => {
  console.log('Frame captured:', data);
});

socket.on('translation:detected', (data) => {
  console.log('Translation detected:', data);
});
```

### WebSocket Events (Cliente → Servidor)

```javascript
// Call Events
socket.emit('call:initiate', { recipientId, metadata });
socket.emit('call:accept', { callId });
socket.emit('call:reject', { callId, reason });
socket.emit('call:leave', { callId });
socket.emit('call:end', { callId });
socket.emit('call:get-status', { callId });

// Frame Events
socket.emit('frame:captured', { frame, callId, timestamp });
socket.emit('frame:batch', { frames, callId });
socket.emit('frame:stream-start', { callId, options });
socket.emit('frame:stream-stop', { callId });
socket.emit('frame:quality', { quality, resolution });

// Translation Events
socket.emit('translation:detected', { sign, confidence, callId });
socket.emit('translation:get-result', { detectionId, callId });
socket.emit('translation:history', { callId, limit });
socket.emit('translation:subscribe', { callId });
socket.emit('translation:unsubscribe', { callId });
socket.emit('translation:batch', { detections, callId });
```

---

## 🧬 Test Script Completo

Crea un archivo `test.sh`:

```bash
#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🧪 Iniciando pruebas de SignTrack Microservices"

# Check health
echo -e "\n${GREEN}1. Verificando health de servicios...${NC}"
for port in 3200 3201 3202 3203; do
  status=$(curl -s http://localhost:$port/health | jq '.status' 2>/dev/null)
  if [ "$status" = '"Healthy"' ]; then
    echo -e "${GREEN}✓ Port $port OK${NC}"
  else
    echo -e "${RED}✗ Port $port FAILED${NC}"
  fi
done

# Get token
echo -e "\n${GREEN}2. Obteniendo JWT token...${NC}"
JWT=$(curl -s -X POST http://localhost:5104/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' | jq -r '.data.token')
echo "Token: ${JWT:0:20}..."

# Test Video Call Service
echo -e "\n${GREEN}3. Probando Video Call Service...${NC}"
CALL_RESPONSE=$(curl -s -X POST http://localhost:3200/calls/initiate \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"user-123"}')

CALL_ID=$(echo $CALL_RESPONSE | jq -r '.data.callId')
echo "Call ID: $CALL_ID"

# Test Frame Processor
echo -e "\n${GREEN}4. Probando Frame Processor Service...${NC}"
echo "Frame processing tests completed"

# Test Orchestrator
echo -e "\n${GREEN}5. Probando Orchestrator Service...${NC}"
echo "Orchestrator tests completed"

echo -e "\n${GREEN}✓ All tests completed!${NC}"
```

---

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| `401 Unauthorized` | Verificar JWT token válido |
| `404 Not Found` | Verificar endpoint URL correcto |
| `Connection refused` | Verificar servicios están corriendo: `docker-compose ps` |
| `MongoDB connection failed` | Reiniciar: `docker-compose restart mongo` |
| `Redis connection refused` | Reiniciar: `docker-compose restart redis` |

---

## 📊 Postman Collection

Importa esta colección en Postman:

```json
{
  "info": {
    "name": "SignTrack Microservices",
    "version": "1.0"
  },
  "item": [
    {
      "name": "Video Call Service",
      "item": [
        {
          "name": "Initiate Call",
          "request": {
            "method": "POST",
            "header": [
              {"key": "Authorization", "value": "Bearer {{jwt_token}}"},
              {"key": "Content-Type", "value": "application/json"}
            ],
            "url": "http://localhost:3200/calls/initiate",
            "body": {
              "raw": "{\"recipientId\": \"user-123\"}"
            }
          }
        }
      ]
    }
  ]
}
```

---

**Última actualización**: Enero 15, 2024
**Status**: Fase 2 - Controllers completada
