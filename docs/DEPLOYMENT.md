# Despliegue SignTrack (Grupo B0)

Guía para publicar SignTrack en un VPS con HTTPS, TURN, LiveKit y microservicios Docker.

## Requisitos

- VPS Linux (4 GB RAM mínimo)
- Dominio apuntando al VPS (`A` → IP pública)
- Docker + Docker Compose v2
- .NET 8 SDK (solo para build local; en prod usa imágenes Docker)

## 1. Preparar entorno

```bash
cp .env.prod.example .env.prod
# Editar: DOMAIN, contraseñas, JWT, LiveKit, VAPID, TURN
```

Generar claves VAPID (Web Push):

```bash
npx web-push generate-vapid-keys
```

LiveKit dev local usa `devkey` / `secret` (`docker compose up livekit`).

## 2. Build frontend

```bash
cd ../SignTrack-frontend
pnpm install
VITE_LIVEKIT_URL=ws://localhost:7880 pnpm build
# En prod: VITE_LIVEKIT_URL=wss://app.tudominio.com/livekit
```

Copiar `dist/` al path que monta Caddy (`SignTrack-frontend/dist` relativo al repo).

## 3. Levantar stack producción

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Servicios:

| Servicio | Rol |
|----------|-----|
| `caddy` | HTTPS + estáticos + proxy API/hubs/LiveKit |
| `gateway` | BFF YARP |
| `identity`, `messaging`, `calls` | Microservicios C# |
| `postgres`, `redis` | Datos + SignalR backplane |
| `livekit` | Videollamadas grupales (B3) |
| `coturn` | STUN/TURN para WebRTC en internet (B2) |

## 4. coturn (TURN)

1. Editar `deploy/coturn/turnserver.conf`: `external-ip`, `realm`, `static-auth-secret`
2. Abrir puertos UDP/TCP: `3478`, `5349`, rango RTP si aplica
3. Actualizar `WebRtc__IceServers` en `.env.prod`

## 5. CI/CD

El workflow `.github/workflows/ci.yml` compila backend y frontend en cada push.

Deploy manual recomendado para Kinal:

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 6. Verificación

- `https://TU_DOMINIO/signtrack/` — app
- `https://TU_DOMINIO/api/v1/health` vía Gateway
- Chat en vivo: hub `/hubs/chat`
- Video 1:1: mesh WebRTC (`maxParticipants=2`)
- Video grupal: LiveKit (`maxParticipants≥3`)
- Push: permiso navegador + `GET /api/v1/notifications/vapid-public-key`

## Local (desarrollo)

```bash
pnpm start:all   # Docker (Postgres, Redis, LiveKit) + servicios + frontend
```

Gateway: `:5050` · Frontend: `:5180/signtrack/`
