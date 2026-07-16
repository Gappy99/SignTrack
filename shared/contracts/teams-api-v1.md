# SignTrack Teams API v1 — Contrato REST

> Versión: `v1` · Base URL (Gateway): `http://localhost:5050`  
> Autenticación: `Authorization: Bearer <JWT>` (emitido por Identity). Ver `jwt-contract.md`.

---

## Convenciones

| Aspecto | Valor |
|---------|-------|
| Prefijo | `/api/v1` |
| Formato | JSON (`application/json`) |
| Errores | `{ "success": false, "message": "...", "errors": [] }` |
| IDs | UUID v4 (salas, mensajes, usuarios) |
| Timestamps | ISO 8601 UTC (`yyyy-MM-ddTHH:mm:ss.fffZ`) |

---

## Identity (existente)

**Servicio:** `SignTrack.Identity` · Puerto directo: `5104`  
**Gateway:** `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/health`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/api/v1/health` | No | Estado del servicio |
| `POST` | `/api/v1/auth/register` | No | Registro de usuario |
| `POST` | `/api/v1/auth/login` | No | Login → emite JWT |
| `GET` | `/api/v1/auth/profile` | Sí | Perfil del usuario autenticado |
| `POST` | `/api/v1/auth/verify-email` | No | Verificar correo |
| `POST` | `/api/v1/auth/resend-verification` | No | Reenviar verificación |
| `POST` | `/api/v1/auth/forgot-password` | No | Solicitar reset de contraseña |
| `POST` | `/api/v1/auth/reset-password` | No | Restablecer contraseña |
| `GET` | `/api/v1/users/me` | Sí | Usuario actual |
| `PUT` | `/api/v1/users/me` | Sí | Actualizar perfil |
| `PUT` | `/api/v1/users/{userId}/role` | Admin | Cambiar rol |
| `GET` | `/api/v1/users/{userId}/roles` | Admin | Roles de usuario |

---

## Calls — Salas de videollamada

**Servicio:** `SignTrack.Calls` · Puerto directo: `5200`  
**Gateway:** `/api/v1/rooms/*`

### `POST /api/v1/rooms`

Crea una sala de videollamada.

**Request**

```json
{
  "title": "Reunión de equipo",
  "maxParticipants": 8
}
```

**Response `201`**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Reunión de equipo",
  "hostUserId": "usr_abc123",
  "status": "waiting",
  "maxParticipants": 8,
  "createdAt": "2026-07-15T20:31:00.000Z"
}
```

### `POST /api/v1/rooms/{id}/join`

El usuario autenticado se une a una sala existente.

**Request**

```json
{
  "displayName": "María López"
}
```

**Response `200`**

```json
{
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "participantId": "part_xyz789",
  "signalingUrl": "ws://localhost:5200/hubs/calls",
  "iceServers": []
}
```

### `GET /api/v1/rooms/{id}`

Obtiene el estado de una sala.

**Response `200`**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Reunión de equipo",
  "hostUserId": "usr_abc123",
  "status": "active",
  "participantCount": 3,
  "participants": [
    { "userId": "usr_abc123", "displayName": "María López", "joinedAt": "2026-07-15T20:32:00.000Z" }
  ]
}
```

---

## Conversations — Chat REST (Grupo A / SA-3)

**Servicio:** `SignTrack.Messaging` · Puerto directo: `5300`  
**Frontend proxy:** `/messaging-api/*` → `5300/api/v1/*`

### `POST /api/v1/conversations`

Crea o reutiliza conversación DM o de grupo.

**Request DM**

```json
{ "targetUserId": "usr_abc123" }
```

**Request grupo**

```json
{ "groupId": "grp_xyz789", "title": "Chat del equipo" }
```

### `GET /api/v1/conversations`

Lista conversaciones del usuario con preview del último mensaje.

### `GET /api/v1/conversations/{id}/messages?cursor=&limit=50`

Historial paginado (REST, sin tiempo real).

### `POST /api/v1/conversations/{id}/messages`

```json
{ "content": "Hola", "type": "text" }
```

---

## Messaging — Chat en sala (legacy / salas Calls)

**Servicio:** `SignTrack.Messaging` · Puerto directo: `5300`  
**Gateway:** `/api/v1/rooms/{id}/messages`

### `POST /api/v1/rooms/{id}/messages`

Envía un mensaje de texto a la sala (chat escrito o traducción de señas).

**Request**

```json
{
  "content": "Hola, ¿me escuchan?",
  "type": "text"
}
```

| `type` | Descripción |
|--------|-------------|
| `text` | Mensaje escrito por el usuario |
| `translation` | Texto generado por Recognition (bot traductor) |
| `system` | Evento de sistema (unión/salida) |

**Response `201`**

```json
{
  "id": "msg_001",
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "senderUserId": "usr_abc123",
  "content": "Hola, ¿me escuchan?",
  "type": "text",
  "sentAt": "2026-07-15T20:33:00.000Z"
}
```

### `GET /api/v1/rooms/{id}/messages`

Lista mensajes de la sala (paginado).

**Query params:** `?cursor=<msg_id>&limit=50`

**Response `200`**

```json
{
  "roomId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "messages": [
    {
      "id": "msg_001",
      "senderUserId": "usr_abc123",
      "content": "Hola, ¿me escuchan?",
      "type": "text",
      "sentAt": "2026-07-15T20:33:00.000Z"
    }
  ],
  "nextCursor": null
}
```

---

## Gateway — Tabla de enrutamiento

**Servicio:** `SignTrack.Gateway` · Puerto: `5000`

| Ruta Gateway | Servicio downstream | Puerto | Notas |
|--------------|---------------------|--------|-------|
| `/api/v1/auth/**` | Identity | 5104 | Auth y tokens |
| `/api/v1/users/**` | Identity | 5104 | Gestión de usuarios |
| `/api/v1/rooms` | Calls | 5200 | Crear sala (`POST`) |
| `/api/v1/rooms/{id}` | Calls | 5200 | Detalle sala (`GET`) |
| `/api/v1/rooms/{id}/join` | Calls | 5200 | Unirse (`POST`) |
| `/api/v1/rooms/{id}/messages` | Messaging | 5300 | Chat (`GET`, `POST`) |
| `/api/v1/predict-letter` | Recognition | 3000 | Proxy a predictor de letras |
| `/api/v1/predict-word` | Recognition | 3000 | Proxy a predictor de palabras |
| `/api/v1/health` | Gateway | 5000 | Health del gateway |
| `/api/v1/services` | Gateway | 5000 | Catálogo de servicios + health URLs |

**Implementación prevista:** YARP o Ocelot (Sprint 2). El gateway valida JWT antes de reenviar a Calls/Messaging.

### `GET /api/v1/services`

Lista servicios downstream y sus URLs de health.

**Response `200`**

```json
{
  "services": [
    { "name": "Identity", "healthUrl": "http://localhost:5104/api/v1/health" },
    { "name": "Calls", "healthUrl": "http://localhost:5200/api/v1/health" },
    { "name": "Messaging", "healthUrl": "http://localhost:5300/api/v1/health" },
    { "name": "Recognition", "healthUrl": "http://localhost:3000/health" }
  ],
  "timestamp": "2026-07-15T20:31:00.000Z"
}
```

---

## Recognition — Integración frame → predict-letter

**Servicio:** `SignTrack.Recognition` · Puerto: `3000`  
**Flujo en llamada:** cámara del cliente → frame/features → Recognition → texto → Messaging

```
┌──────────┐    frame/features     ┌─────────────────┐
│ Frontend │ ────────────────────► │ Recognition API │
│ (cámara) │                         │  :3000          │
└──────────┘                         └────────┬────────┘
                                              │ POST /predict-letter
                                              ▼
                                    ┌─────────────────┐
                                    │ predict_letter  │
                                    │ .py (MediaPipe  │
                                    │ + RandomForest) │
                                    └────────┬────────┘
                                              │ { letter, confidence }
                                              ▼
┌──────────┐   POST /rooms/{id}/messages   ┌─────────────────┐
│ Frontend │ ◄──────────────────────────── │ Messaging API   │
│ (chat)   │   type: "translation"        │  :5300          │
└──────────┘                               └─────────────────┘
```

### Endpoints Recognition (existentes / proxy vía Gateway)

| Método | Ruta directa | Ruta Gateway (plan) | Descripción |
|--------|--------------|---------------------|-------------|
| `POST` | `/predict-letter` | `/api/v1/predict-letter` | Predice letra desde features o imagen |
| `POST` | `/predict-word` | `/api/v1/predict-word` | Predice palabra desde features o video |
| `POST` | `/translate` | `/api/v1/translate` | Passthrough texto (stub) |
| `GET` | `/health` | — | Health del servicio IA |

### `POST /predict-letter` (frame → letra)

**Request (opción A — features MediaPipe)**

```json
{
  "features": [0.12, -0.34, 0.56, "..."]
}
```

**Request (opción B — ruta de imagen)**

```json
{
  "imagePath": "/tmp/frame_001.jpg"
}
```

**Response `200`**

```json
{
  "success": true,
  "letter": "A",
  "confidence": 0.92
}
```

### Integración en Sprint 3–4

1. Cliente captura frame de cámara durante la llamada.
2. Extrae landmarks con MediaPipe (cliente o Recognition).
3. Envía `features` a Recognition (`POST /predict-letter`).
4. Acumula letras en buffer de palabra; al detectar pausa, envía mensaje `type: "translation"` a Messaging.
5. Participantes oyentes ven el texto en el chat de la sala.

---

## Health (todos los servicios C#)

| Servicio | Ruta |
|----------|------|
| Identity | `GET /api/v1/health` |
| Calls | `GET /api/v1/health` |
| Messaging | `GET /api/v1/health` |
| Gateway | `GET /api/v1/health` (futuro) / `GET /health` (scaffold actual) |
| Recognition | `GET /health` |
