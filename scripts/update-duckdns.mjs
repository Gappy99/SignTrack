#!/usr/bin/env node
/**
 * Actualiza la IP pública en DuckDNS (gratis).
 * Necesario cuando el VPS reinicia o cambia IP.
 *
 * Uso:
 *   DUCKDNS_TOKEN=xxx DUCKDNS_SUBDOMAIN=signtrack-kinal pnpm deploy:duckdns
 *   # o valores en .env.prod
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.prod')

const loadEnv = () => {
  const env = { ...process.env }
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !env[m[1]]) env[m[1]] = m[2].trim()
    }
  }
  return env
}

const env = loadEnv()
const subdomain = env.DUCKDNS_SUBDOMAIN?.trim()
const token = env.DUCKDNS_TOKEN?.trim()

if (!subdomain || !token || token.includes('Pega_tu')) {
  console.error('✗ Define DUCKDNS_SUBDOMAIN y DUCKDNS_TOKEN en .env.prod')
  console.error('  Token: https://www.duckdns.org → tu subdominio')
  process.exit(1)
}

const publicIp = env.PUBLIC_IP?.trim()
  || (await fetch('https://api.ipify.org?format=text').then((r) => r.text()).catch(() => ''))

const ipParam = publicIp ? `&ip=${publicIp.trim()}` : ''
const url = `https://www.duckdns.org/update?domains=${encodeURIComponent(subdomain)}&token=${encodeURIComponent(token)}${ipParam}`

const res = await fetch(url)
const body = (await res.text()).trim()

if (body !== 'OK') {
  console.error(`✗ DuckDNS respondió: ${body}`)
  process.exit(1)
}

console.log(`✓ DuckDNS OK → ${subdomain}.duckdns.org → ${publicIp || '(IP detectada por DuckDNS)'}`)
