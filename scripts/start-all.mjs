/**
 * Levanta stack local SignTrack: Docker → Identity (:5104) → Frontend (:5180)
 * Uso: pnpm start:all  (desde repo SignTrack)
 */
import { spawn, execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = join(__dirname, '..')
const frontendRoot = join(backendRoot, '..', 'SignTrack-frontend')
const identityProject = join(
  backendRoot,
  'services/identity/SignTrack.Identity.Api/SignTrack.Identity.Api.csproj',
)
const isWin = process.platform === 'win32'
const IDENTITY_URL = 'http://localhost:5104/api/v1/health'
const FRONTEND_URL = 'http://localhost:5180/signtrack/'

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

async function isHealthy(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

function getPidsOnPort(port) {
  try {
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' })
      const pids = new Set()
      for (const line of out.split('\n')) {
        if (!line.includes('LISTENING')) continue
        const pid = line.trim().split(/\s+/).pop()
        if (pid && /^\d+$/.test(pid)) pids.add(pid)
      }
      return [...pids]
    }
    const out = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim()
    return out ? out.split('\n').filter(Boolean) : []
  } catch {
    return []
  }
}

function killProcessTree(pid) {
  try {
    if (isWin) {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } else {
      process.kill(Number(pid), 'SIGTERM')
    }
  } catch {
    /* ya terminó */
  }
}

async function ensureFrontendDeps() {
  const viteBin = join(frontendRoot, 'node_modules', 'vite', 'bin', 'vite.js')
  if (existsSync(viteBin)) return

  console.log('Frontend: instalando dependencias (pnpm install)...')
  await run('pnpm', ['install'], { cwd: frontendRoot })
}

async function ensureIdentityReady() {
  if (await isHealthy(IDENTITY_URL)) {
    console.log('Identity ya está activo en :5104 (se reutiliza, no se inicia otro).')
    return null
  }

  const stalePids = getPidsOnPort(5104)
  if (stalePids.length > 0) {
    console.log(`Puerto 5104 ocupado por PID(s) ${stalePids.join(', ')} — liberando...`)
    for (const pid of stalePids) killProcessTree(pid)
    await new Promise((r) => setTimeout(r, 1500))
  }

  const devEnv = {
    ...process.env,
    ASPNETCORE_ENVIRONMENT: 'Development',
    JwtSettings__SecretKey:
      process.env.JwtSettings__SecretKey ?? 'SignTrackDevSecretKeyMin32Chars!!',
  }

  return runBackground(
    'dotnet',
    ['run', '--project', identityProject, '--launch-profile', 'http', '--no-build'],
    { cwd: backendRoot, env: devEnv },
  )
}

console.log('Docker: Postgres + Redis...')
await run('docker', ['compose', 'up', '-d'], { cwd: backendRoot })

await ensureFrontendDeps()

console.log('\nCompilando Identity (solo si hace falta)...')
await run('dotnet', ['build', identityProject, '-v', 'q'], { cwd: backendRoot })

console.log('\nServicios (Ctrl+C detiene lo iniciado por este script):')
console.log(`  Identity  → http://localhost:5104/swagger`)
console.log(`  Frontend  → ${FRONTEND_URL}\n`)

const children = []
const identityChild = await ensureIdentityReady()
if (identityChild) children.push(identityChild)

children.push(runBackground('pnpm', ['dev'], { cwd: frontendRoot }))

let shuttingDown = false

const shutdown = (signal) => {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\nDeteniendo (${signal})...`)
  for (const child of children) {
    if (child && !child.killed) {
      if (isWin && child.pid) {
        killProcessTree(child.pid)
      } else {
        child.kill('SIGTERM')
      }
    }
  }
  setTimeout(() => process.exit(0), 800)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.error(`Proceso terminó con código ${code}`)
      shutdown('exit')
    }
  })
}

await new Promise(() => {})
