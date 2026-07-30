#!/usr/bin/env node
/**
 * Genera .env.prod listo para deploy GRATIS (DuckDNS + VPS free).
 * No compra dominio — usa tu-subdominio.duckdns.org
 *
 * Uso:
 *   pnpm deploy:init-free
 *   # Edita DUCKDNS_TOKEN en .env.prod si hace falta
 *   pnpm deploy:free
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, '.env.prod')
const examplePath = join(root, '.env.prod.example')

const rand = (n = 32) => randomBytes(n).toString('base64url').slice(0, n)

const args = process.argv.slice(2)
const duckName = (() => {
  const idx = args.indexOf('--duckdns')
  return idx !== -1 ? args[idx + 1]?.trim() : process.env.DUCKDNS_SUBDOMAIN?.trim()
})()

if (!duckName) {
  console.log(`
SignTrack — init .env.prod GRATIS

1) Crea cuenta en https://www.duckdns.org (gratis, sin tarjeta)
2) Crea un subdominio, ej: signtrack-kinal
3) Copia tu token de DuckDNS

Uso:
  pnpm deploy:init-free -- --duckdns signtrack-kinal

O:
  DUCKDNS_SUBDOMAIN=signtrack-kinal pnpm deploy:init-free
`)
  process.exit(1)
}

if (existsSync(outPath)) {
  console.error('✗ Ya existe .env.prod — renómbralo o bórralo primero')
  process.exit(1)
}

const domain = `${duckName}.duckdns.org`
const postgresPassword = rand(24)
const jwtSecret = rand(48)
const livekitKey = 'lk_' + rand(12)
const livekitSecret = rand(32)
const turnPassword = rand(20)
const vapidPlaceholder = 'GENERAR_CON_npx_web-push_generate-vapid-keys'

let template = existsSync(examplePath)
  ? readFileSync(examplePath, 'utf8')
  : readFileSync(join(root, '.env.prod.example'), 'utf8')

template = template
  .replace(/^DOMAIN=.*$/m, `DOMAIN=${domain}`)
  .replace(/^POSTGRES_PASSWORD=.*$/m, `POSTGRES_PASSWORD=${postgresPassword}`)
  .replace(/^ConnectionStrings__DefaultConnection=.*$/m,
    `ConnectionStrings__DefaultConnection=Host=postgres;Database=SignTrack;Username=signtrack;Password=${postgresPassword}`)
  .replace(/^JwtSettings__SecretKey=.*$/m, `JwtSettings__SecretKey=${jwtSecret}`)
  .replace(/^LIVEKIT_API_KEY=.*$/m, `LIVEKIT_API_KEY=${livekitKey}`)
  .replace(/^LIVEKIT_API_SECRET=.*$/m, `LIVEKIT_API_SECRET=${livekitSecret}`)
  .replace(/^WebRtc__IceServers__0__Credential=.*$/m, `WebRtc__IceServers__0__Credential=${turnPassword}`)

if (!template.includes('DUCKDNS_SUBDOMAIN=')) {
  template += `\n# DuckDNS (gratis)\nDUCKDNS_SUBDOMAIN=${duckName}\nDUCKDNS_TOKEN=Pega_tu_token_de_duckdns.org\n`
} else {
  template = template.replace(/^DUCKDNS_SUBDOMAIN=.*$/m, `DUCKDNS_SUBDOMAIN=${duckName}`)
}

writeFileSync(outPath, template, 'utf8')

// Sincronizar LiveKit keys en livekit.prod.yaml
const livekitYamlPath = join(root, 'deploy', 'livekit.prod.yaml')
if (existsSync(livekitYamlPath)) {
  let lk = readFileSync(livekitYamlPath, 'utf8')
  lk = lk.replace(/^keys:\s*\n\s*\w+:.*/m, `keys:\n  ${livekitKey}: ${livekitSecret}`)
  writeFileSync(livekitYamlPath, lk, 'utf8')
}

// coturn user line
const turnPath = join(root, 'deploy', 'coturn', 'turnserver.conf')
if (existsSync(turnPath)) {
  let turn = readFileSync(turnPath, 'utf8')
  turn = turn.replace(/^user=signtrack:.*$/m, `user=signtrack:${turnPassword}`)
  turn = turn.replace(/^realm=.*$/m, `realm=${domain}`)
  turn = turn.replace(/^server-name=.*$/m, `server-name=${domain}`)
  writeFileSync(turnPath, turn, 'utf8')
}

console.log('✓ .env.prod generado para deploy GRATIS\n')
console.log(`  URL final: https://${domain}/signtrack/`)
console.log('\nEdita .env.prod y pon tu DUCKDNS_TOKEN=...')
console.log('\nLuego en el VPS (Oracle free):')
console.log('  pnpm deploy:free')
