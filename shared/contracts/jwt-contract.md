# Contrato JWT — SignTrack

Emisor: **SignTrack.Identity** (`http://localhost:5104`)

## Configuración

| Variable | Valor dev |
|----------|-----------|
| Issuer | `SignTrack.Identity` |
| Audience | `SignTrack.Identity` |
| Expiry | 30 minutos |
| Secret | Ver `JwtSettings:SecretKey` (User Secrets en dev) |

## Claims

| Claim | Descripción |
|-------|-------------|
| `sub` | ID del usuario (UUID 16 chars) |
| `role` | `ADMIN_ROLE` o `USER_ROLE` |
| `jti` | ID único del token |
| `iat` | Issued at (Unix) |

## Uso en microservicios

Cada servicio C# debe:

1. Validar `Authorization: Bearer <token>`
2. Leer `sub` para identificar usuario
3. Leer `role` para autorización

## Ejemplo header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Endpoints Identity relacionados

- `POST /api/v1/auth/login` → emite JWT
- `POST /api/v1/auth/register` → crea usuario
- `GET /api/v1/auth/profile` → requiere JWT
