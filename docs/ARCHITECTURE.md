# SignTrack — Arquitectura Backend (v2)

> **Proyecto escolar · Metodología Scrum · Rama `ft/sajche`**

SignTrack es una plataforma tipo **Microsoft Teams inclusiva** para personas que se comunican con **lenguaje de señas**. Este documento describe la arquitectura inicial del **backend** (fase actual). El frontend es un repositorio separado (`SignTrack-frontend`).

---

## Visión del producto

| Actor | Necesidad |
|-------|-----------|
| Usuario sordo | Videollamadas, chat escrito, comunicarse libremente en señas |
| Participante oyente | Recibir traducción escrita o por voz de lo que el otro firma |
| Bot de traducción | Leer cámara → detectar señas (MediaPipe) → enviar texto a la sala |

**Prioridad del equipo backend:** auth, salas, mensajería, gateway.  
**Prioridad del módulo IA (ya existente):** mantener detector de señas estable; no reentrenar modelos en esta fase.

---

## Mapa de microservicios

```
                    ┌─────────────────────┐
                    │  SignTrack.Gateway  │  :5050  (BFF / enrutamiento)
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┬──────────────────┐
           │                   │                   │                  │
  ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐ ┌───────▼───────────────┐
  │ SignTrack.        │ │ SignTrack.      │ │ SignTrack.      │ │ SignTrack.Recognition │
  │ Identity          │ │ Calls           │ │ Messaging       │ │ (Node + Python) :3000 │
  │ (C#) :5104        │ │ (C#) :5200      │ │ (C#) :5300      │ │ predict-letter/word   │
  └────────┬──────────┘ └────────┬────────┘ └────────┬────────┘ └───────────────────────┘
           │                   │                   │
           │            WebRTC / SignalR (Grupo B)
           │
  Postgres (:5435) + Redis (:6379) vía Docker
```

| Servicio | Puerto | Stack | Estado |
|----------|--------|-------|--------|
| **Gateway** | 5050 | C# .NET 8 | YARP BFF (REST + SignalR + Recognition proxy) |
| **Identity** | 5104 | C# .NET 8 | Funcional (auth existente) |
| **Calls** | 5200 | C# .NET 8 | WebRTC 1:1 + LiveKit grupal (token API) |
| **Messaging** | 5300 | C# .NET 8 | Chat REST + SignalR + Web Push |
| **Recognition** | 3000 | Node + Python | Funcional (detector señas) |

---

## Estructura del monorepo

```
SignTrack/
├── SignTrack.sln                 # Solución .NET principal
├── docker-compose.yml            # Postgres + Redis + LiveKit (dev)
├── docker-compose.prod.yml       # Stack producción (B0)
├── deploy/                       # Caddy, coturn, Dockerfiles
├── docs/                         # Planificación Scrum + arquitectura
├── shared/contracts/             # Contratos JWT, eventos, etc.
├── services/
│   ├── gateway/SignTrack.Gateway.Api/
│   ├── identity/                 # SignTrack.Identity.* (renombrar en Sprint 2)
│   ├── calls/SignTrack.Calls.Api/
│   ├── messaging/SignTrack.Messaging.Api/
│   └── recognition/              # MediaPipe + ML (Node/Python)
│       ├── requirements.txt
│       └── src/
├── prisma/                       # Schema IA (Neon)
└── package.json                  # Scripts del servicio Recognition
```

---

## Infraestructura local

```bash
docker compose up -d          # Postgres :5435, Redis :6379
dotnet build SignTrack.sln    # Compilar microservicios C#
pnpm recognition:api          # API IA :3000
```

---

## Contrato JWT (resumen)

Ver `shared/contracts/jwt-contract.md`. Todos los microservicios C# validan el mismo token emitido por **Identity**.

Claims: `sub` (userId), `role` (`ADMIN_ROLE` | `USER_ROLE`), `jti`, `iat`.

---

## Lo eliminado en v2

- **KinalSports Admin** (Express + MongoDB): canchas deportivas
- **Módulo museo**: guía interactiva, nodos, rutas
- Microservicios Node de videollamada de `main` (se rediseñarán en C#)

---

## Próximos sprints (ver SCRUM_BACKLOG.md)

1. **Sprint 1** — Estructura + limpieza + Identity estable
2. **Sprint 2** — Gateway + Calls (salas, WebRTC signaling)
3. **Sprint 3** — Messaging (chat) + integración Recognition en llamada
4. **Sprint 4** — Bot traductor (texto + TTS) + pruebas E2E
