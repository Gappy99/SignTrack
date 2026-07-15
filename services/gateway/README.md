# SignTrack.Gateway

**API Gateway / BFF** — punto de entrada único para el frontend (C# .NET 8).

## Estado: Scaffold (Sprint 2)

## Responsabilidades planeadas

- Enrutar requests a Identity, Calls, Messaging
- Validación JWT centralizada (opcional)
- Rate limiting global
- Agregación de respuestas para el cliente web

## Ejecutar

```bash
dotnet run --project SignTrack.Gateway.Api
```

Puerto: **5000**

## Endpoints actuales

- `GET /health`
- `GET /` — lista de servicios downstream
