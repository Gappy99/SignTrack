#!/usr/bin/env node
/**
 * SignTrack — PC de casa como servidor público (DuckDNS + HTTPS).
 *
 * Uso:
 *   pnpm deploy:init-free -- --duckdns signtrack-kinal
 *   # Editar .env.prod → DUCKDNS_TOKEN
 *   pnpm start:home
 *
 * URL: https://signtrack-kinal.duckdns.org/signtrack/
 * Requiere: port forwarding 80,443,3478,7880-7882 en el router.
 */
import { spawn, spawnSync, execSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = join(__dirname, '..')
const frontendRoot = join(backendRoot, '..', 'SignTrack-frontend')
const envProdPath = join(backendRoot, '.env.prod')
const frontendDist = join(backendRoot, 'deploy', 'frontend-dist')
const recognitionVenvPython = join(backendRoot, 'services/recognition/.venv/bin/python3')
const isWin = process.platform === 'win32'

const parseEnvFile = (path) => {
  const out = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const prodEnv = parseEnvFile(envProdPath)
const domain = prodEnv.DOMAIN || 'signtrack-kinal.duckdns.org'

if (!existsSync(envProdPath)) {
  console.error('Falta .env.prod — corre: pnpm deploy:init-free -- --duckdns signtrack-kinal')
  process.exit(1)
}

console.log('SignTrack — servidor en PC de casa\n')
console.log(`Dominio: https://${domain}/signtrack/\n`)

// 1) Detener todo
console.log('1) Deteniendo servicios anteriores...')
spawnSync('node', ['scripts/stop-all.mjs'], { cwd: backendRoot, stdio: 'inherit' })

// 2) DuckDNS
if (prodEnv.DUCKDNS_TOKEN && !prodEnv.DUCKDNS_TOKEN.includes('Pega_tu')) {
  console.log('\n2) Actualizando DuckDNS...')
  spawnSync('node', ['scripts/update-duckdns.mjs'], { cwd: backendRoot, stdio: 'inherit' })
} else {
  console.warn('\n2) ⚠ Sin DUCKDNS_TOKEN — edita .env.prod cuando tengas el token de duckdns.org')
}

// 3) Build frontend producción
if (!existsSync(frontendRoot)) {
  console.error(`No se encontró frontend: ${frontendRoot}`)
  process.exit(1)
}

console.log('\n3) Compilando frontend...')
spawnSync('pnpm', ['install'], { cwd: frontendRoot, stdio: 'inherit' })
const build = spawnSync('pnpm', ['exec', 'vite', 'build'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: { ...process.env, VITE_LIVEKIT_URL: `wss://${domain}/livekit` },
})
if (build.status !== 0) process.exit(build.status ?? 1)

const builtDist = join(frontendRoot, 'dist')
if (existsSync(frontendDist)) rmSync(frontendDist, { recursive: true, force: true })
mkdirSync(frontendDist, { recursive: true })
cpSync(builtDist, frontendDist, { recursive: true })

// 4) Docker infra + Caddy
console.log('\n4) Docker: Postgres, Redis, LiveKit, coturn, Caddy (HTTPS)...')
const dockerEnv = {
  ...process.env,
  DOMAIN: domain,
  POSTGRES_DB: prodEnv.POSTGRES_DB || 'SignTrack',
  POSTGRES_USER: prodEnv.POSTGRES_USER || 'signtrack',
  POSTGRES_PASSWORD: prodEnv.POSTGRES_PASSWORD || 'SignTrackHome2026!',
}
const dc = spawnSync(
  'docker',
  ['compose', '-f', 'docker-compose.home.yml', 'up', '-d'],
  { cwd: backendRoot, stdio: 'inherit', env: dockerEnv },
)
if (dc.status !== 0) {
  console.error('Docker falló — ¿Docker Desktop está encendido?')
  process.exit(dc.status ?? 1)
}

// 5) Backend en el host
const pgPassword = prodEnv.POSTGRES_PASSWORD || 'SignTrackHome2026!'
const homeEnv = {
  ...process.env,
  ASPNETCORE_ENVIRONMENT: 'Production',
  JwtSettings__SecretKey: prodEnv.JwtSettings__SecretKey || 'SignTrackDevSecretKeyMin32Chars!!',
  JwtSettings__Issuer: prodEnv.JwtSettings__Issuer || 'SignTrack.Identity',
  JwtSettings__Audience: prodEnv.JwtSettings__Audience || 'SignTrack.Identity',
  ConnectionStrings__DefaultConnection:
    prodEnv.ConnectionStrings__DefaultConnection
    || `Host=localhost;Port=5435;Database=SignTrack;Username=signtrack;Password=${pgPassword}`,
  ConnectionStrings__Redis: 'localhost:6379',
  LiveKit__ApiKey: prodEnv.LIVEKIT_API_KEY || prodEnv.LiveKit__ApiKey || 'prodkey',
  LiveKit__ApiSecret: prodEnv.LIVEKIT_API_SECRET || prodEnv.LiveKit__ApiSecret || 'CHANGE_ME_LIVEKIT_SECRET',
  LiveKit__Url: `wss://${domain}/livekit`,
  LiveKit__GroupThreshold: '3',
  WebRtc__IceServers__0__Urls: prodEnv['WebRtc__IceServers__0__Urls'] || `turn:${domain}:3478`,
  WebRtc__IceServers__0__Username: prodEnv['WebRtc__IceServers__0__Username'] || 'signtrack',
  WebRtc__IceServers__0__Credential: prodEnv['WebRtc__IceServers__0__Credential'] || 'CHANGE_ME_TURN_PASSWORD',
  WebRtc__IceServers__1__Urls: 'stun:stun.l.google.com:19302',
  CORS_ORIGINS: `https://${domain}`,
  'Security__AllowedOrigins__0': `https://${domain}`,
  Auth__AutoActivateInDevelopment: 'true',
  CORS_ORIGINS: `https://${domain}`,
  'Security__AllowedOrigins__0': `https://${domain}`,
  Auth__AutoActivateInDevelopment: 'true',
  PYTHON_EXECUTABLE:
    process.env.PYTHON_EXECUTABLE
    ?? (existsSync(recognitionVenvPython) ? recognitionVenvPython : 'python3'),
}

const SERVICES = [
  { name: 'Identity', port: 5104, project: join(backendRoot, 'services/identity/SignTrack.Identity.Api/SignTrack.Identity.Api.csproj') },
  { name: 'Messaging', port: 5300, project: join(backendRoot, 'services/messaging/SignTrack.Messaging.Api/SignTrack.Messaging.Api.csproj') },
  { name: 'Calls', port: 5200, project: join(backendRoot, 'services/calls/SignTrack.Calls.Api/SignTrack.Calls.Api.csproj') },
  { name: 'Gateway', port: 5050, project: join(backendRoot, 'services/gateway/SignTrack.Gateway.Api/SignTrack.Gateway.Api.csproj') },
  { name: 'Recognition', port: 3000, type: 'node', script: 'recognition:api' },
]

function runBackground(cmd, args, opts = {}) {
  return spawn(cmd, args, { stdio: 'inherit', shell: isWin, ...opts })
}

console.log('\n5) Compilando backend .NET...')
spawnSync('dotnet', ['build', join(backendRoot, 'SignTrack.sln'), '-v', 'q'], { cwd: backendRoot, stdio: 'inherit' })

console.log('\n6) APIs en el host (Gateway :5050 → Caddy :443):\n')
const children = []
for (const svc of SERVICES) {
  if (svc.type === 'node') {
    children.push(runBackground('pnpm', [svc.script], { cwd: backendRoot, env: homeEnv }))
  } else {
    children.push(
      runBackground('dotnet', ['run', '--project', svc.project, '--launch-profile', 'http', '--no-build'], {
        cwd: backendRoot,
        env: homeEnv,
      }),
    )
  }
}

console.log('══════════════════════════════════════════')
console.log(`  APP PÚBLICA: https://${domain}/signtrack/`)
console.log('  Comparte ese link con tu amigo')
console.log('══════════════════════════════════════════')
console.log('\nRouter: reenvía puertos 80, 443, 3478, 7880-7882 a esta PC')
console.log('Ctrl+C detiene las APIs (Docker sigue — pnpm stop:all para todo)\n')

const shutdown = () => {
  for (const child of children) {
    if (child && !child.killed) child.kill('SIGTERM')
  }
  setTimeout(() => process.exit(0), 500)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

await new Promise(() => {})
