#!/usr/bin/env node
/**
 * Configura Cloudflare R2 para Recognition (sandbox).
 * Requiere: pnpm exec wrangler login  (una vez, abre el navegador)
 *
 * Uso:
 *   pnpm setup:r2
 *   BUCKET_NAME=signtrack-sajche pnpm setup:r2
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'services/recognition/.env')
const envExample = join(root, 'services/recognition/.env.example')
const bucketName = process.env.BUCKET_NAME || 'signtrack-sajche'

const run = (args) =>
  spawnSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

const parseAccountId = (whoamiResult) => {
  const jsonResult = run(['whoami', '--json'])
  if (jsonResult.status === 0 && jsonResult.stdout?.trim()) {
    try {
      const data = JSON.parse(jsonResult.stdout)
      const id = data?.accounts?.[0]?.id
      if (id) return id
    } catch {
      /* fallback abajo */
    }
  }

  const text = `${whoamiResult.stdout}\n${whoamiResult.stderr}`
  const labeled = text.match(/Account ID[:\s|]+([a-f0-9]{32})/i)?.[1]
  if (labeled) return labeled

  const tableCell = text.match(/\│\s*[^│]+\s*\│\s*([a-f0-9]{32})\s*\│/i)?.[1]
  if (tableCell) return tableCell

  return text.match(/\b([a-f0-9]{32})\b/)?.[1] ?? null
}

console.log('SignTrack — setup R2 (Wrangler)\n')

const whoami = run(['whoami'])
if (whoami.status !== 0) {
  console.error('No estás logueado en Cloudflare.')
  console.error('Ejecuta primero:\n  cd SignTrack-sandbox-ft-sajche\n  pnpm exec wrangler login\n')
  process.exit(1)
}

const accountId = parseAccountId(whoami)
if (!accountId) {
  console.log(`${whoami.stdout}\n${whoami.stderr}`)
  console.error('\nNo pude leer Account ID. Copia el ID de: pnpm exec wrangler whoami')
  process.exit(1)
}

console.log(`Account ID: ${accountId}`)

const list = run(['r2', 'bucket', 'list'])
const alreadyExists = list.stdout?.includes(bucketName)
if (!alreadyExists) {
  console.log(`Creando bucket "${bucketName}"…`)
  const created = run(['r2', 'bucket', 'create', bucketName])
  if (created.status !== 0) {
    console.error(created.stderr || created.stdout)
    process.exit(created.status ?? 1)
  }
  console.log('Bucket creado.')
} else {
  console.log(`Bucket "${bucketName}" ya existe.`)
}

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`
let envContent = existsSync(envPath)
  ? readFileSync(envPath, 'utf8')
  : readFileSync(envExample, 'utf8')

const upsert = (key, value) => {
  const line = `${key}=${value}`
  const re = new RegExp(`^${key}=.*$`, 'm')
  envContent = re.test(envContent) ? envContent.replace(re, line) : `${envContent.trimEnd()}\n${line}\n`
}

upsert('R2_ENDPOINT', endpoint)
upsert('R2_BUCKET', bucketName)
if (!/^R2_PUBLIC_URL=.+$/m.test(envContent) || /R2_PUBLIC_URL=https:\/\/<public-domain>\/?/.test(envContent)) {
  upsert('R2_PUBLIC_URL', `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/`)
}

writeFileSync(envPath, envContent, 'utf8')

console.log('\n✓ Actualizado:', envPath)
console.log('\nFalta completar a mano (API token S3, no es el login de Wrangler):')
console.log('  https://dash.cloudflare.com/?to=/:account/r2/api-tokens')
console.log('  → Create API token → Object Read & Write → bucket', bucketName)
console.log('  → Pegar en .env: R2_ACCESS_KEY= y R2_SECRET_KEY=')
console.log('\nOpcional: activa Public access en el bucket si necesitas R2_PUBLIC_URL con r2.dev')
console.log('  https://dash.cloudflare.com/?to=/:account/r2/overview')
