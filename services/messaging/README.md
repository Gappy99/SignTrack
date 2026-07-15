# SignTrack.Messaging

Microservicio de **mensajería y chat** en salas (C# .NET 8).

## Estado: Scaffold (Sprint 3)

## Responsabilidades planeadas

- Chat escrito en tiempo real por sala
- Mensajes de sistema (traducciones del bot)
- Persistencia en PostgreSQL o MongoDB (decidir en Sprint 3)

## Ejecutar

```bash
dotnet run --project SignTrack.Messaging.Api
```

Puerto: **5300**

## Endpoints actuales

- `GET /health`
- `GET /`
