# Integración Frontend ↔ Backend (develop)

Repositorios separados:

| Repo | Rama | Puerto dev |
|------|------|------------|
| [SignTrack](https://github.com/Gappy99/SignTrack) | `develop` | Identity `:5104` |
| [SignTrack-frontend](https://github.com/EddyCode1/SignTrack-frontend) | `develop` | Vite `:5173` |

## 1. Levantar backend

```powershell
cd SignTrack
git checkout develop
docker compose up -d
cd services\identity\SignTrack.Identity.Api
dotnet user-secrets set "JwtSettings:SecretKey" "SignTrackDevSecretKeyMin32Chars!!"
dotnet run
```

Verificar: `http://localhost:5104/api/v1/health`  
Swagger: `http://localhost:5104/swagger`

## 2. Levantar frontend

```powershell
cd SignTrack-frontend
git checkout develop
pnpm install
pnpm dev
```

El proxy de Vite redirige `/api/*` → `http://localhost:5104`.

## 3. Endpoints usados por el frontend

### Auth (`/api/v1/auth`)

| Método | Ruta | Uso |
|--------|------|-----|
| POST | `/login` | Login `{ emailOrUsername, password }` |
| POST | `/register` | Registro multipart/form-data |
| GET | `/profile` | Perfil (JWT) |

### Users (`/api/v1/users`)

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/me` | Perfil completo |
| PUT | `/me` | Actualizar perfil |
| GET | `/by-role/{roleName}` | Lista usuarios (admin) |

## 4. JWT

- **Issuer / Audience:** `SignTrack.Identity`
- Header: `Authorization: Bearer <token>`
- Claim rol: `role` → `ADMIN_ROLE` | `USER_ROLE`

## 5. CORS

Identity permite `http://localhost:5173` en desarrollo.

## 6. Usuario admin seed

Tras migraciones: `admin@SignTrack.com` / `Admin1234!` (solo dev local).

## 7. Variables frontend

```env
VITE_IDENTITY_URL=/api/v1
VITE_AUTH_URL=/api/v1/auth
```

Con proxy Vite no hace falta URL absoluta en local.
