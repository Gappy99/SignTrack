#!/usr/bin/env node
/**
 * Escribe NEON_DATABASE_URL en services/recognition/.env
 * Uso (password solo en tu terminal, no en el chat):
 *   NEON_PASSWORD='tu_password' pnpm setup:neon
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, 'services/recognition/.env')

const password = process.env.NEON_PASSWORD?.trim()
if (!password) {
  console.error('Falta la contraseña de Neon.')
  console.error('\nEn Neon: Connect → Show password → copia solo la contraseña.')
  console.error('Luego ejecuta:\n  NEON_PASSWORD=\'tu_pass\' pnpm setup:neon\n')
  process.exit(1)
}

const url = `postgresql://neondb_owner:${encodeURIComponent(password)}@ep-dark-boat-a4fbtczv-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require`

let content = existsSync(envPath)
  ? readFileSync(envPath, 'utf8')
  : readFileSync(join(root, 'services/recognition/.env.example'), 'utf8')

const line = `NEON_DATABASE_URL=${url}`
if (/^NEON_DATABASE_URL=.*$/m.test(content)) {
  content = content.replace(/^NEON_DATABASE_URL=.*$/m, line)
} else {
  content = `${line}\n${content}`
}

writeFileSync(envPath, content, 'utf8')
console.log('✓ NEON_DATABASE_URL guardado en services/recognition/.env')
console.log('  Prueba: pnpm recognition:init-schema')
