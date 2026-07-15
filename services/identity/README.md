# SignTrack.Identity

Microservicio de **autenticación e identidad** (C# .NET 8, Clean Architecture).

## Ejecutar

```bash
dotnet run --project SignTrack.Identity.Api
```

Puerto: **5104** · Swagger: `http://localhost:5104/swagger` · Health: `http://localhost:5104/api/v1/health`

## User Secrets (desarrollo local)

```powershell
cd services/identity/SignTrack.Identity.Api
dotnet user-secrets set "JwtSettings:SecretKey" "TU_CLAVE_SECRETA_MINIMO_32_CARACTERES"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=SignTrack;Username=root;Password=admin;Port=5435"
```

Opcional (email, avatares): ver `services/identity/.env.example`

## Proyectos

| Proyecto | Capa |
|----------|------|
| `SignTrack.Identity.Api` | HTTP, controllers, Swagger |
| `SignTrack.Identity.Application` | Casos de uso |
| `SignTrack.Identity.Domain` | Entidades |
| `SignTrack.Identity.Persistence` | EF Core + PostgreSQL + migraciones |

## Sprint 1 completado

- Namespaces `SignTrack.Identity.*`
- CORS `:5173` (frontend Vite)
- EF `MigrateAsync()` + seed
- Swagger con JWT Bearer
- User Secrets configurado
