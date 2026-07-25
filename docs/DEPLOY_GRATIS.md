# SignTrack — Deploy $0 (sin comprar dominio)

> **Objetivo:** tú en Petén y tu amigo en otra ciudad entran a la **misma URL gratis** y se videollaman.

---

## ¿Se puede sin gastar nada?

**Sí**, con esta combinación (100% gratis):

| Pieza | Costo | Qué es |
|-------|-------|--------|
| **Oracle Cloud Always Free** | $0 | VPS con IP pública (siempre gratis) |
| **DuckDNS** | $0 | `tuapp.duckdns.org` — subdominio gratis, no compras dominio |
| **Caddy + Let's Encrypt** | $0 | HTTPS automático sobre DuckDNS |
| **coturn + LiveKit** | $0 | Videollamadas en Docker (incluido en el repo) |

**No sirve para video entre ciudades:**
- Solo IP (`http://123.45.67.89`) — el navegador **bloquea cámara** sin HTTPS
- Cloudflare Tunnel rápido (`trycloudflare.com`) — chat sí, **video no** (no pasa UDP/WebRTC bien)
- Vercel solo — no hay WebRTC/TURN

---

## Paso 1 — VPS gratis (15 min, una sola vez)

### Oracle Cloud Always Free (recomendado)

1. https://www.cloudflare.com → no, https://signup.cloud.oracle.com  
2. Crear cuenta (pide tarjeta pero **no cobra** en tier Always Free)
3. Crear VM:
   - **Shape:** Ampere A1 (ARM) — 4 OCPU, 24 GB RAM → **Always Free**
   - **OS:** Ubuntu 22.04 o 24.04
   - **Red:** asignar IP pública
4. Abrir puertos en **Security List** (Oracle firewall):

| Puerto | Tipo |
|--------|------|
| 22 | TCP (SSH) |
| 80, 443 | TCP |
| 3478, 5349 | TCP + UDP |
| 7880, 7881 | TCP |
| 7882 | UDP |
| 50000–60000 | UDP |

5. Conectar por SSH:
```bash
ssh ubuntu@TU_IP_PUBLICA
```

6. Instalar Docker en el VPS:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# cerrar sesión y volver a entrar
sudo apt install -y git
```

**Alternativas gratis:** Google Cloud free trial (temporal), Azure for Students.

---

## Paso 2 — DuckDNS gratis (5 min, sin dominio de pago)

1. https://www.duckdns.org → login con Google/GitHub
2. Crear subdominio, ej: `signtrack-kinal`
3. Tu URL será: **`https://signtrack-kinal.duckdns.org`**
4. Copiar el **token** de DuckDNS

---

## Paso 3 — Configurar en el VPS

```bash
git clone https://github.com/Gappy99/SignTrack.git signtrack
cd signtrack   # o tu sandbox ft/sajche
git checkout ft/sajche

# Clonar frontend al lado (deploy lo necesita)
git clone https://github.com/EddyCode1/SignTrack-frontend.git ../SignTrack-frontend
cd ../SignTrack-frontend && git checkout ft/sajche && cd ../signtrack

# Instalar Node/pnpm en VPS (para build frontend)
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
sudo apt install -y nodejs npm
pnpm install
```

Generar config automática:

```bash
pnpm deploy:init-free -- --duckdns signtrack-kinal
```

Editar `.env.prod` y pegar tu token:

```
DUCKDNS_TOKEN=tu-token-de-duckdns
```

Generar claves VAPID (push, opcional):

```bash
npx web-push generate-vapid-keys
# pegar en WebPush__PublicKey y WebPush__PrivateKey en .env.prod
```

---

## Paso 4 — Deploy (un comando)

```bash
pnpm deploy:free
```

Eso hace:
1. Actualiza DuckDNS con la IP del VPS
2. Configura coturn con tu IP pública
3. Compila frontend + levanta Docker (Postgres, Redis, APIs, LiveKit, Caddy…)

**Comparte con tu amigo:**

```
https://signtrack-kinal.duckdns.org/signtrack/
```

---

## Paso 5 — Probar videollamada Petén ↔ amigo

1. Ambos se registran o usan cuentas que creen en la app
2. **Llamadas** → Nueva reunión 1:1
3. Copiar enlace de la sala y enviarlo por WhatsApp
4. Aceptar cámara/mic en ambos
5. Deben verse (coturn ayuda cuando están en redes distintas)

**Grupo 3+:** crear reunión tipo Grupo → usa LiveKit.

---

## Si el VPS reinicia (IP cambia)

Oracle a veces cambia la IP. Solo corre:

```bash
pnpm deploy:duckdns
```

DuckDNS actualiza el subdominio en ~1 minuto.

**Cron automático (opcional en VPS):**

```bash
(crontab -l 2>/dev/null; echo "*/5 * * * * cd /home/ubuntu/signtrack && /usr/bin/node scripts/update-duckdns.mjs >> /tmp/duckdns.log 2>&1") | crontab -
```

---

## Comparación con otros proyectos Kinal

| Proyecto | Deploy | Costo | Video |
|----------|--------|-------|-------|
| Banco | Render + Vercel | ~$0 tier free | No |
| Restaurante | Docker local | $0 | No |
| **SignTrack** | Oracle + DuckDNS | **$0** | **Sí** |

No uses el patrón Banco/Vercel para SignTrack — **no hay videollamada**.

---

## Plan B — solo demo en la misma red (sin VPS)

Si solo quieren probar en **la misma WiFi** (misma casa/aula):

```bash
pnpm start:all
# En otro PC de la misma red:
http://IP-LOCAL-DE-TU-PC:5180/signtrack/
```

⚠️ Cámara puede fallar en HTTP fuera de `localhost`. Para expo real entre Petén y otra ciudad **necesitas el VPS + DuckDNS**.

---

## Comandos resumen

```bash
pnpm deploy:init-free -- --duckdns TU-NOMBRE    # genera .env.prod
pnpm deploy:free                                 # deploy completo $0
pnpm deploy:duckdns                              # actualizar IP DuckDNS
pnpm deploy:prod                                 # deploy (si ya tienes .env.prod)
```

---

## Troubleshooting

| Problema | Solución |
|----------|----------|
| No carga la página | `pnpm deploy:duckdns` + esperar 2 min |
| Chat funciona, video no | Abrir UDP 3478, 50000-60000 en Oracle firewall |
| Certificado HTTPS | Caddy lo pide solo; DOMAIN debe apuntar al VPS vía DuckDNS |
| "Recognition offline" | Normal si no configuraste Gemini; chat/video igual funciona |

---

*Deploy $0 · rama `ft/sajche` · Ver también `DEPLOY_PLAN_KINAL.md`*
