# SignTrack Teams — Plan de ejecución Backend (Sprint 1–2)

> Rama: `ft/sajche` · Contrato API: `shared/contracts/teams-api-v1.md`  
> Arquitectura: `docs/ARCHITECTURE.md` · Backlog completo: `docs/SCRUM_BACKLOG.md`

---

## Objetivo Sprint 1–2

Tener un backend Teams **consumible desde el frontend** con auth estable, gateway enrutando tráfico y salas de videollamada con signaling básico.

---

## Sprint 1 — Identity estable

**Duración:** 2 semanas · **Objetivo:** JWT y auth listos para consumo cross-service.

| ID | Tarea | Owner | Estado | Entregable |
|----|-------|-------|--------|------------|
| S1-1 | Renombrar namespaces `SignTrack.Identity` → `SignTrack.Identity` | `[Backend C#]` | ⏳ | Proyectos compilando con nuevo namespace |
| S1-2 | Configurar CORS para frontend (`:5173`) | `[Backend C#]` | ⏳ | `AddSecurityPolicies` probado |
| S1-3 | Migraciones EF en lugar de `EnsureCreatedAsync` | `[Backend C#]` | ⏳ | `dotnet ef database update` funcional |
| S1-4 | Documentar endpoints en Swagger | `[Backend C#]` | ⏳ | Swagger en `:5104/swagger` |
| S1-5 | Secretos en User Secrets / `.env` | `[Backend C#]` | ⏳ | Sin secretos hardcodeados en repo |
| S1-6 | Validar contrato JWT en Calls/Messaging (scaffold) | `[Backend C#]` | ⏳ | `JwtSettings` en appsettings + middleware stub |
| S1-7 | Health unificado `GET /api/v1/health` en todos los servicios C# | `[Backend C#]` | ⏳ | Identity, Calls, Messaging respondiendo |

### Criterios de aceptación Sprint 1

- [ ] `POST /api/v1/auth/login` emite JWT con `Issuer`/`Audience` = `AuthService`
- [ ] `GET /api/v1/auth/profile` valida token
- [ ] Frontend conecta a Identity en `:5104`
- [ ] `dotnet build SignTrack.sln` sin errores
- [ ] Contrato documentado en `shared/contracts/teams-api-v1.md` (Identity)

### Dependencias

| Bloquea a | Depende de |
|-----------|------------|
| Sprint 2 (JWT en Calls) | S1-5, S1-6 |
| Frontend auth | S1-2, S1-4 |

---

## Sprint 2 — Gateway + Calls (salas)

**Duración:** 2 semanas · **Objetivo:** Crear/unir salas y enrutar vía Gateway.

| ID | Tarea | Owner | Estado | Entregable |
|----|-------|-------|--------|------------|
| S2-1 | Modelo `CallRoom` + `Participant` (EF + Postgres) | `[Backend C#]` | ⏳ | Migración Calls |
| S2-2 | `POST /api/v1/rooms` — crear sala | `[Backend C#]` | ⏳ | `RoomsController` |
| S2-3 | `POST /api/v1/rooms/{id}/join` — unirse | `[Backend C#]` | ⏳ | Respuesta con signaling URL |
| S2-4 | `GET /api/v1/rooms/{id}` — detalle sala | `[Backend C#]` | ⏳ | Lista de participantes |
| S2-5 | Validar JWT en Calls (middleware) | `[Backend C#]` | ⏳ | `sub` → userId |
| S2-6 | Gateway: integrar YARP/Ocelot con route map | `[Backend C#]` | ⏳ | Proxy `/api/v1/rooms/*` → Calls |
| S2-7 | Gateway: proxy Identity (`/api/v1/auth`, `/api/v1/users`) | `[Backend C#]` | ⏳ | Un solo punto de entrada `:5000` |
| S2-8 | SignalR hub para signaling WebRTC | `[Backend C#]` | ⏳ | Hub `/hubs/calls` |
| S2-9 | `GET /api/v1/services` — health aggregation (opcional) | `[Backend C#]` | ⏳ | Ping downstream health URLs |

### Criterios de aceptación Sprint 2

- [ ] Cliente crea sala vía Gateway `POST /api/v1/rooms`
- [ ] Segundo usuario se une con JWT válido
- [ ] `GET /api/v1/services` lista health URLs de downstream
- [ ] Signaling WebRTC básico (offer/answer/ICE) vía SignalR
- [ ] Endpoints documentados en `teams-api-v1.md` (Calls + Gateway)

### Dependencias

| Bloquea a | Depende de |
|-----------|------------|
| Sprint 3 (Messaging en sala) | S2-1, S2-2 |
| Sprint 3 (Recognition en llamada) | S2-8 |

---

## Infraestructura compartida (Sprint 1–2)

| Recurso | Owner | Puerto | Comando |
|---------|-------|--------|---------|
| PostgreSQL | `[DevOps / Backend]` | 5435 | `docker compose up -d` |
| Redis | `[DevOps / Backend]` | 6379 | `docker compose up -d` |
| Gateway | `[Backend C#]` | 5000 | `dotnet run --project services/gateway/...` |
| Identity | `[Backend C#]` | 5104 | `dotnet run --project services/identity/...` |
| Calls | `[Backend C#]` | 5200 | `dotnet run --project services/calls/...` |
| Messaging | `[Backend C#]` | 5300 | `dotnet run --project services/messaging/...` |
| Recognition | `[Dev IA]` | 3000 | `pnpm recognition:api` |

Variables de entorno: ver `.env.example` en la raíz del repo.

---

## Riesgos y mitigación

| Riesgo | Mitigación | Owner |
|--------|------------|-------|
| Renombrado Identity rompe referencias | Hacer en rama dedicada; CI build | `[Backend C#]` |
| WebRTC signaling complejo | SignalR mínimo (offer/answer); TURN en Sprint 4 | `[Backend C#]` |
| JWT secret inconsistente entre servicios | Un solo `.env` raíz + User Secrets | `[Backend C#]` |

---

## Definition of Done (Sprint 1–2)

- Código en rama `ft/sajche` con PR revisado
- `dotnet build SignTrack.sln` exitoso
- Health checks: `GET /api/v1/health` (Calls, Messaging, Identity)
- Gateway: `GET /api/v1/services` responde catálogo
- Contrato API actualizado en `shared/contracts/teams-api-v1.md`
- Demo en Sprint Review: login → crear sala → unirse (aunque sea sin video real)
