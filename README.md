# SignTrack — Backend

Monorepo de microservicios para una app tipo **Teams inclusiva** (lenguaje de señas).

- **Rama activa:** `ft/sajche`
- **Frontend:** repositorio separado `SignTrack-frontend`
- **Metodología:** Scrum (ver `docs/SCRUM_BACKLOG.md`)

## Inicio rápido

```bash
# Infraestructura
docker compose up -d

# Microservicios C#
dotnet build SignTrack.sln
dotnet run --project services/identity/SignTrack.Identity.Api    # :5104
dotnet run --project services/gateway/SignTrack.Gateway.Api        # :5000
dotnet run --project services/calls/SignTrack.Calls.Api            # :5200
dotnet run --project services/messaging/SignTrack.Messaging.Api    # :5300

# Reconocimiento de señas (MediaPipe)
pnpm install
pnpm recognition:api   # :3000
```

## Servicios

| Carpeta | Descripción | Puerto |
|---------|-------------|--------|
| `services/identity/` | Auth, usuarios, JWT | 5104 |
| `services/calls/` | Videollamadas (scaffold) | 5200 |
| `services/messaging/` | Chat en sala (scaffold) | 5300 |
| `services/gateway/` | BFF / enrutamiento (scaffold) | 5000 |
| `services/recognition/` | Detector señas Node+Python | 3000 |

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Backlog Scrum](docs/SCRUM_BACKLOG.md)
- [Contrato JWT](shared/contracts/jwt-contract.md)
- [Módulo Recognition](services/recognition/README.md)

## Health checks

```bash
curl http://localhost:5104/health
curl http://localhost:5000/health
curl http://localhost:5200/health
curl http://localhost:5300/health
curl http://localhost:3000/health
```
