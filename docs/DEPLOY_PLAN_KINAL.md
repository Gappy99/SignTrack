# SignTrack — Plan de despliegue Kinal (videollamadas reales)

> Objetivo: **tú en Petén** y tu amigo en cualquier red entran a la misma URL, se registran/inician sesión y **se ven en videollamada**.

---

## ¿Por qué NO es igual que Banco o Restaurante?

| Proyecto Kinal | Deploy | ¿Videollamada? |
|----------------|--------|----------------|
| **Banco** | Render (API) + Vercel (web) + Neon | No |
| **Restaurante** | Docker local | No |
| **SignTrack** | **VPS + Docker + Caddy + LiveKit + coturn** | **Sí** |

**Vercel solo** sirve archivos estáticos. **No puede** alojar:

- WebRTC / TURN (coturn) — UDP, NAT traversal entre Petén y otra ciudad  
- LiveKit — videollamadas grupales  
- SignalR — chat y hubs en tiempo real  
- 4 microservicios .NET + Redis + Postgres  

**Conclusión:** frontend + backend **en el mismo dominio HTTPS** (VPS) es la opción correcta.  
Vercel queda como **opción secundaria** (solo UI, API en otro servidor) — más frágil para video.

---

## Arquitectura de producción (recomendada)

```
Internet
   │
   ▼
https://TU_DOMINIO/signtrack/     ← React (Caddy sirve estáticos)
https://TU_DOMINIO/api/           ← Gateway YARP
https://TU_DOMINIO/hubs/          ← SignalR (chat + calls)
https://TU_DOMINIO/livekit/       ← LiveKit (grupos 3+)
turn:TU_DOMINIO:3478              ← coturn (1:1 entre redes distintas)
```

**VPS mínimo:** 4 GB RAM · Ubuntu 22/24 · Docker Compose v2  
**Proveedores Kinal-friendly:** Hetzner CX22, DigitalOcean, Oracle Free Tier, Azure student.

---

## Checklist antes de desplegar

### 1. Dominio
- Comprar o usar subdominio (Cloudflare, etc.)
- Registro **A** → IP pública del VPS  
  Ej: `app.signtrack.gt` → `203.0.113.50`

### 2. VPS — puertos abiertos (firewall + panel cloud)

| Puerto | Protocolo | Uso |
|--------|-----------|-----|
| 80, 443 | TCP | HTTPS (Caddy + Let's Encrypt) |
| 3478, 5349 | TCP/UDP | coturn TURN/STUN |
| 7880, 7881 | TCP | LiveKit |
| 7882 | UDP | LiveKit |
| 50000–60000 | UDP | RTP LiveKit / WebRTC |

### 3. Configurar `.env.prod`

```bash
cp .env.prod.example .env.prod
```

Editar obligatorio:

| Variable | Ejemplo |
|----------|---------|
| `DOMAIN` | `app.signtrack.gt` |
| `POSTGRES_PASSWORD` | contraseña fuerte |
| `JwtSettings__SecretKey` | mínimo 32 caracteres |
| `LIVEKIT_API_KEY` / `SECRET` | generar valores únicos |
| `WebRtc__IceServers__0__Credential` | misma contraseña TURN |
| `TURN_DOMAIN` | mismo dominio o subdominio |
| `WebPush__*` | `npx web-push generate-vapid-keys` |

Sincronizar LiveKit: clave en `.env.prod` debe coincidir con `deploy/livekit.prod.yaml` (`keys:`).

### 4. coturn

Editar `deploy/coturn/turnserver.conf`:

```
external-ip=TU_IP_PUBLICA_VPS
user=signtrack:MISMA_PASSWORD_QUE_ENV_PROD
realm=app.signtrack.gt
```

---

## Comando de deploy (un solo paso)

```bash
cd SignTrack-sandbox-ft-sajche
cp .env.prod.example .env.prod   # editar primero
pnpm deploy:prod
```

El script:
1. Compila frontend con `VITE_LIVEKIT_URL=wss://TU_DOMINIO/livekit`
2. Copia `dist/` → `deploy/frontend-dist/`
3. Levanta `docker-compose.prod.yml` (Postgres, Redis, Gateway, Identity, Messaging, Calls, Recognition, LiveKit, coturn, Caddy)

**URL final:** `https://TU_DOMINIO/signtrack/`

---

## Prueba videollamada Petén ↔ amigo

1. **Tú:** abre `https://TU_DOMINIO/signtrack/` desde Petén (WiFi o datos).
2. **Amigo:** misma URL desde otra red (otra ciudad, datos móvil).
3. Ambos registrados o cuentas demo creadas en el VPS.
4. **Chat** → mensaje en vivo (SignalR).
5. **Llamadas** → Nueva reunión **1:1** → compartir enlace `/signtrack/calls/{roomId}`.
6. Aceptar cámara/mic → deben verse (WebRTC + coturn).
7. **Grupo (3+):** crear reunión tipo Grupo → LiveKit.

Si 1:1 falla entre redes: casi siempre es **TURN** (coturn `external-ip` o puertos UDP cerrados).

---

## Opción híbrida Kinal (Vercel + VPS) — no recomendada para video

Solo si el profesor exige Vercel:

| Componente | Dónde |
|------------|-------|
| Frontend React | Vercel |
| API + hubs + LiveKit + TURN | VPS (obligatorio) |

`.env` Vercel:

```
VITE_API_URL=https://TU_DOMINIO/api/v1
VITE_LIVEKIT_URL=wss://TU_DOMINIO/livekit
VITE_CHAT_HUB_URL=https://TU_DOMINIO/hubs/chat
VITE_CALLS_HUB_URL=https://TU_DOMINIO/hubs/calls
```

`.env.prod` → `CORS_ORIGINS=https://tu-app.vercel.app,https://TU_DOMINIO`

Más CORS, más puntos de fallo. **Preferir todo en un VPS.**

---

## Qué NO bloquea el deploy (dejado para después)

| Tarea | Prioridad |
|-------|-----------|
| Precisión IA / reentrenar señas | Baja (post-deploy) |
| Neon/R2 del dueño | Opcional |
| TTS toggle accesibilidad | Opcional |
| Merge `ft/sajche` → `develop` | Cuando el equipo apruebe |

---

## Orden de trabajo esta semana

| Día | Acción |
|-----|--------|
| 1 | Conseguir VPS + dominio + `.env.prod` |
| 2 | `pnpm deploy:prod` + abrir puertos + coturn |
| 3 | Crear 2 usuarios, probar 1:1 tú + amigo |
| 4 | Probar grupo LiveKit con 3 personas |
| 5 | Demo Kinal (`docs/DEMO_SCRIPT.md`) |

---

## Comandos útiles post-deploy

```bash
# Logs
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f caddy gateway calls

# Reiniciar tras cambio
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# Solo rebuild frontend
pnpm deploy:prod
```

---

## Referencias

- `docs/DEPLOYMENT.md` — guía técnica detallada  
- `docs/DEMO_SCRIPT.md` — guion exposición  
- `docker-compose.prod.yml` — stack completo  
- Patrón Banco: Render+Vercel **no aplica** a videollamadas  

*Última actualización: 2026-07-23 · rama `ft/sajche`*
