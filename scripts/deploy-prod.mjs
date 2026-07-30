#!/usr/bin/env node
/**
 * Despliegue producción SignTrack (VPS + Docker + Caddy)
 *
 * Uso:
 *   cp .env.prod.example .env.prod   # editar DOMAIN, contraseñas, JWT, LiveKit, TURN
 *   pnpm deploy:prod
 *
 * Requiere: Docker, pnpm, dominio apuntando al VPS (registro A)
 */
import { existsSync, mkdirSync, cpSync, rmSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontendRoot = join(root, '..', 'SignTrack-frontend')
const envProdPath = join(root, '.env.prod')
const frontendDist = join(root, 'deploy', 'frontend-dist')

const fail = (msg) => {
  console.error(`\n✗ ${msg}`)
  process.exit(1)
}

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd || root, env: opts.env || process.env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const readDomain = () => {
  if (!existsSync(envProdPath)) {
    fail('Falta .env.prod — copia desde .env.prod.example y edita DOMAIN, JWT, LiveKit, TURN')
  }
  const raw = readFileSync(envProdPath, 'utf8')
  const match = raw.match(/^DOMAIN=(.+)$/m)
  const domain = match?.[1]?.trim()
  if (!domain || domain.includes('example.com')) {
    fail('Define DOMAIN en .env.prod (ej. signtrack-kinal.duckdns.org)')
  }
  return domain
}

console.log('SignTrack — deploy producción\n')

const domain = readDomain()
console.log(`Dominio: ${domain}`)

if (!existsSync(frontendRoot)) {
  fail(`No se encontró frontend en ${frontendRoot}`)
}

console.log('\n1) Build frontend...')
run('pnpm', ['install'], { cwd: frontendRoot })
run(
  'pnpm',
  ['exec', 'vite', 'build'],
  {
    cwd: frontendRoot,
    env: {
      ...process.env,
      VITE_LIVEKIT_URL: `wss://${domain}/livekit`,
    },
  },
)

const builtDist = join(frontendRoot, 'dist')
if (!existsSync(join(builtDist, 'index.html'))) {
  fail('Build frontend falló — no hay dist/index.html')
}

console.log('\n2) Copiar dist → deploy/frontend-dist/')
if (existsSync(frontendDist)) {
  rmSync(frontendDist, { recursive: true, force: true })
}
mkdirSync(frontendDist, { recursive: true })
cpSync(builtDist, frontendDist, { recursive: true })

console.log('\n3) Docker Compose (build + up)...')
console.log('   Puertos requeridos en el VPS: 80, 443, 3478, 5349, 7880-7882, UDP LiveKit')
run('docker', ['compose', '-f', 'docker-compose.prod.yml', '--env-file', '.env.prod', 'up', '-d', '--build'])

console.log('\n✓ Deploy iniciado.')
console.log(`\n  App:     https://${domain}/signtrack/`)
console.log(`  Health:  https://${domain}/api/v1/health`)
console.log(`  LiveKit: wss://${domain}/livekit`)
console.log('\nSiguiente:')
console.log('  1. Edita deploy/coturn/turnserver.conf → external-ip=IP_PUBLICA_VPS')
console.log('  2. Abre puertos UDP/TCP en firewall del VPS (3478, 5349, 50000-60000)')
console.log('  3. Crea usuarios o corre seed en el VPS si aplica')
console.log('  4. Prueba videollamada 1:1 desde Petén y otra red (datos móvil)')
