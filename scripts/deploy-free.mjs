#!/usr/bin/env node
/**
 * Deploy SignTrack $0 — VPS gratis + DuckDNS (sin comprar dominio).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.prod')
const turnPath = join(root, 'deploy', 'coturn', 'turnserver.conf')

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, env: process.env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const fetchPublicIp = async () => {
  try {
    const res = await fetch('https://api.ipify.org?format=text')
    return (await res.text()).trim()
  } catch {
    return ''
  }
}

console.log('SignTrack — deploy GRATIS (DuckDNS + VPS)\n')

if (!existsSync(envPath)) {
  console.error('Primero: pnpm deploy:init-free -- --duckdns tu-nombre')
  process.exit(1)
}

const envRaw = readFileSync(envPath, 'utf8')
const domain = envRaw.match(/^DOMAIN=(.+)$/m)?.[1]?.trim()

console.log('1) Actualizar IP en DuckDNS...')
run('node', ['scripts/update-duckdns.mjs'])

console.log('\n2) Configurar coturn con IP pública...')
const publicIp = await fetchPublicIp()
if (publicIp && existsSync(turnPath)) {
  let turn = readFileSync(turnPath, 'utf8')
  if (/^#\s*external-ip=/m.test(turn) || !/^external-ip=/m.test(turn)) {
    turn = turn.replace(/^#\s*external-ip=.*$/m, `external-ip=${publicIp}`)
    if (!turn.includes(`external-ip=${publicIp}`)) {
      turn = turn.replace(
        /# En VPS: descomentar.*/,
        `# IP pública (auto)\nexternal-ip=${publicIp}`,
      )
    }
    if (!/^external-ip=/m.test(turn)) {
      turn += `\nexternal-ip=${publicIp}\n`
    }
    writeFileSync(turnPath, turn, 'utf8')
    console.log(`   coturn external-ip=${publicIp}`)
  }
}

console.log('\n3) Deploy producción (build + docker)...')
run('node', ['scripts/deploy-prod.mjs'])

console.log('\n══════════════════════════════════════════')
console.log('  COMPARTE ESTE LINK CON TU AMIGO:')
console.log(`  https://${domain}/signtrack/`)
console.log('══════════════════════════════════════════')
console.log('\nSi el VPS reinicia: pnpm deploy:duckdns')
