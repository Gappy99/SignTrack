# Deploy permanente en Render (para que el profesor entre cuando quiera)

Este es el "cascarón" siempre disponible de SignTrack: login, chats y contactos
funcionan de verdad. **Llamadas y reconocimiento de señas no están incluidos
aquí a propósito** — esos siguen siendo exclusivos de la demo en vivo desde la
Mac + túnel de Cloudflare.

Fuente: rama `develop` de este repo (ya tiene todo el trabajo de `ft/sajche`
fusionado). El archivo `render.yaml` en la raíz define los 3 servicios.

## Paso 1 — Base de datos (Neon, gratis y permanente)

1. Entra a https://neon.tech y crea una cuenta gratis.
2. Crea un proyecto nuevo (cualquier nombre, ej. "signtrack-render").
3. En el dashboard del proyecto, copia el **Connection string** completo
   (botón "Connect" — elige el formato `postgresql://...` o el equivalente
   `Host=...;Database=...` si Neon te lo da en ese formato).
4. Guárdalo, lo vas a necesitar en el Paso 3.

## Paso 2 — Cuenta de Render y conectar el repo

1. Entra a https://render.com y crea una cuenta gratis (puedes usar tu cuenta
   de GitHub para entrar directo).
2. Conecta tu cuenta de GitHub y dale acceso al repositorio `Gappy99/SignTrack`.
3. En el dashboard de Render: **New** → **Blueprint**.
4. Elige el repo `Gappy99/SignTrack` y la rama **develop**.
5. Render va a detectar el archivo `render.yaml` automáticamente y te va a
   mostrar los 3 servicios que va a crear: `signtrack-identity`,
   `signtrack-messaging`, `signtrack-gateway`.

## Paso 3 — Rellenar las variables que Render te va a pedir

Antes de confirmar la creación, Render te muestra un formulario con las
variables marcadas `sync: false` en el `render.yaml`. Rellena:

**En `signtrack-identity`:**
- `ConnectionStrings__DefaultConnection` → el connection string de Neon del Paso 1.
- `Security__AllowedOrigins__0` y `AppSettings__FrontendUrl` → **déjalas vacías por ahora**, se llenan en el Paso 5 (todavía no existe la URL del frontend).

**En `signtrack-messaging`:**
- `ConnectionStrings__DefaultConnection` → el mismo connection string de Neon.
- `JwtSettings__SecretKey` → **déjala vacía por ahora**, se llena en el Paso 4.

**En `signtrack-gateway`:**
- `JwtSettings__SecretKey` → vacía por ahora (Paso 4).
- `DownstreamUrls__Identity` y `DownstreamUrls__Messaging` → vacías por ahora (Paso 4).

Confirma y deja que Render cree y despliegue los 3 servicios (tarda unos
minutos la primera vez).

## Paso 4 — Conectar los servicios entre sí (después del primer deploy)

1. Entra al servicio **signtrack-identity** en Render → pestaña "Environment"
   → copia el valor real que Render generó para `JwtSettings__SecretKey`
   (lo generó solo, gracias a `generateValue: true`).
2. Pégalo como `JwtSettings__SecretKey` en **signtrack-messaging** y en
   **signtrack-gateway** (debe ser idéntico en los 3 — si no coincide, el
   login "funciona" pero las demás peticiones fallan con error de token).
3. Copia la URL pública de **signtrack-identity** (arriba del todo en su
   página, algo como `https://signtrack-identity.onrender.com`) y pégala en
   `DownstreamUrls__Identity` de **signtrack-gateway**.
4. Haz lo mismo con la URL de **signtrack-messaging** →
   `DownstreamUrls__Messaging` en **signtrack-gateway**.
5. Guarda — cada servicio se reinicia solo cuando cambias sus variables.

## Paso 5 — Desplegar el frontend (Static Site)

Ver `SignTrack-frontend/docs` — se hace por separado, como Static Site de
Render. Una vez tengas esa URL:

1. Vuelve a **signtrack-identity** → pega esa URL en `Security__AllowedOrigins__0`
   y en `AppSettings__FrontendUrl`.

## Verificación

1. Abre la URL de `signtrack-gateway` + `/health` → debe responder OK.
2. Abre la URL del frontend (Static Site) → debe cargar el login.
3. Inicia sesión o regístrate → debe entrar al dashboard.
4. Prueba Chats y Contactos → deben funcionar.
5. Llamadas se ve pero no conecta — es esperado, esa parte sigue siendo solo
   de la Mac.

## Nota sobre el plan gratis

Los servicios gratuitos de Render se "duermen" tras un rato sin visitas y
tardan unos segundos en despertar en la primera petición del día — es normal,
no significa que algo esté roto.
