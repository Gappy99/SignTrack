# Sandbox SignTrack — este chat / este equipo

Aislamiento para desarrollar **solo SignTrack backend** sin mezclar otros proyectos del PC.

## Reglas

| Regla | Valor |
|-------|--------|
| Rama | **`ft/sajche`** exclusivamente |
| Autor git | `jsajche-2024380@kinal.edu.gt` |
| No tocar | `services/recognition/**` (IA / detector de señas) |
| Enfoque | Microservicios C# Teams (Identity, Gateway, Calls, Messaging) |

## Verificar antes de commit

```powershell
git branch --show-current          # debe ser ft/sajche
git log -1 --format="%an <%ae>"     # debe ser jsajche-2024380
dotnet build SignTrack.sln
```

## Commit (sin Cursor como colaborador)

```powershell
git -c user.name="jsajche-2024380" -c user.email="jsajche-2024380@kinal.edu.gt" commit -m "tu mensaje"
```

## User Secrets (Identity — desarrollo local)

```powershell
cd services/identity/SignTrack.Identity.Api
dotnet user-secrets init
dotnet user-secrets set "JwtSettings:SecretKey" "TU_CLAVE_MIN_32_CARACTERES_AQUI"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Database=SignTrack;Username=root;Password=admin;Port=5435"
```

Ver `services/identity/README.md` para la lista completa.
