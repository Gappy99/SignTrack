# Guion de demo SignTrack (Kinal)

Duración estimada: **15–20 minutos** con 2–4 participantes en navegadores distintos.

## Preparación

```bash
cd SignTrack-sandbox-ft-sajche
docker compose up -d          # Postgres, Redis, LiveKit
pnpm start:all                # Gateway, Identity, Calls, Messaging, Recognition, Frontend
pnpm seed:demo                # 4 usuarios demo + chats + sala grupal
pnpm smoke:e2e                # Verificación rápida de APIs
```

**URLs:** Frontend `http://localhost:5180/signtrack/` · Gateway `:5050`

**Cuentas demo** (password `Test1234!`):

| Usuario | Email |
|---------|-------|
| María | maria.demo@signtrack.test |
| Carlos | carlos.demo@signtrack.test |
| Ana | ana.demo@signtrack.test |
| Luis | luis.demo@signtrack.test |

Admin: `admin@SignTrack.com` / `Admin1234!`

---

## Acto 1 — Login y presencia (2 min)

1. María y Carlos inician sesión en dos navegadores.
2. Ir a **Contactos** → verificar punto verde (en línea) junto al otro usuario.
3. Abrir **Chats** → conversaciones del seed visibles con preview.

## Acto 2 — Chat en vivo + señas (5 min)

1. María abre chat con Carlos.
2. Enviar mensaje de texto → aparece en tiempo real en Carlos (SignalR).
3. María activa **Modo señas** → cámara → Recognition detecta letras.
4. Enviar traducción → burbuja violeta en ambos chats.
5. Carlos escucha TTS de la traducción (Web Speech API).

## Acto 3 — Solicitudes + push (3 min)

1. Ana envía **Solicitud de contacto** a Luis desde Contactos.
2. Luis ve badge en **Solicitudes** y recibe notificación push (si aceptó permisos).
3. Luis acepta la solicitud.

## Acto 4 — Videollamada 1:1 WebRTC (4 min)

1. María crea reunión **1:1** desde Llamadas.
2. Carlos entra con el enlace copiado.
3. Ver video/audio mesh, chat lateral y panel de señas usando la cámara de la llamada.
4. María termina la reunión → Carlos recibe evento `RoomEnded`.

## Acto 5 — Reunión grupal LiveKit (4 min)

1. Crear reunión **Grupo** (3+ participantes) o usar sala del seed.
2. Tres usuarios entran → video LiveKit + chat lateral.
3. Mostrar **overlay de subtítulos** cuando alguien envía traducción de señas.
4. Anfitrión termina la reunión.

## Acto 6 — Calendario → reunión (2 min)

1. María crea cita e invita a Carlos.
2. Carlos acepta invitación en Solicitudes.
3. En el día de la cita, **Iniciar reunión** → reutiliza `roomId` si ya existe.
4. Navega directo a la sala vinculada.

---

## Troubleshooting rápido

| Problema | Solución |
|----------|----------|
| Messaging sin tablas | Reiniciar Messaging (aplica `EnsureMessagingSchemaAsync`) |
| LiveKit falla | `docker compose up livekit -d` |
| Recognition no detecta | Verificar servicio en `:3000` y proxy `/recognition-api` |
| Push no llega | Aceptar permisos del navegador; VAPID en `appsettings.Development.json` |
| Cámara bloqueada | HTTPS localhost o permisos del navegador |

---

## Comandos útiles

```bash
pnpm smoke:e2e          # smoke API
pnpm seed:demo          # reset datos demo
docker compose logs -f  # infra
```
