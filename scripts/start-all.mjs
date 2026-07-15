/**
 * Levanta stack local SignTrack: Docker → Identity (:5104) → Frontend (:5173)
 * Uso: pnpm start:all  (desde repo SignTrack)
 */
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = join(__dirname, '..')
const frontendRoot = join(backendRoot, '..', 'SignTrack-frontend')
const isWin = process.platform === 'win32'

if (!existsSync(frontendRoot)) {
  console.error(`No se encontró el frontend en: ${frontendRoot}`)
  console.error('Clona SignTrack-frontend junto al repo SignTrack (misma carpeta padre).')
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: isWin,
      ...opts,
    })
    child.on('error', reject)
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} salió con código ${code}`)),
    )
  })
}

function runBackground(cmd, args, opts = {}) {
  return spawn(cmd, args, {
    stdio: 'inherit',
    shell: isWin,
    ...opts,
  })
}

console.log('Docker: Postgres + Redis...')
await run('docker', ['compose', 'up', '-d'], { cwd: backendRoot })

const devEnv = {
  ...process.env,
  ASPNETCORE_ENVIRONMENT: 'Development',
  JwtSettings__SecretKey:
    process.env.JwtSettings__SecretKey ?? 'SignTrackDevSecretKeyMin32Chars!!',
}

console.log('\nServicios (Ctrl+C detiene todo):')
console.log('  Identity  → http://localhost:5104/swagger')
console.log('  Frontend  → http://localhost:5173\n')

const children = [
  runBackground(
    'dotnet',
    ['run', '--project', 'services/identity/SignTrack.Identity.Api', '--launch-profile', 'http'],
    { cwd: backendRoot, env: devEnv },
  ),
  runBackground('pnpm', ['dev'], { cwd: frontendRoot }),
]

let shuttingDown = false

const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\nDeteniendo (${signal})...`)
  for (const child of children) {
    if (!child.killed) {
      child.kill(isWin ? undefined : 'SIGTERM')
    }
  }
  setTimeout(() => process.exit(0), 500)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`Proceso terminó con código ${code}`)
      shutdown('exit')
    }
  })
}

await new Promise(() => {})
