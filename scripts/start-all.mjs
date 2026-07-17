/**
 * Levanta stack local SignTrack (Grupo A + B1):
 * Docker → Identity → Messaging → Calls → Gateway → Recognition → Frontend
 * Uso: pnpm start:all  (desde repo SignTrack)
 */
import { spawn, execSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const backendRoot = join(__dirname, '..')
const frontendRoot = join(backendRoot, '..', 'SignTrack-frontend')
const recognitionVenvPython = join(backendRoot, 'services/recognition/.venv/bin/python3')
const isWin = process.platform === 'win32'
const FRONTEND_URL = 'http://localhost:5180/signtrack/'

const devEnv = {
  ...process.env,
  ASPNETCORE_ENVIRONMENT: 'Development',
  JwtSettings__SecretKey:
    process.env.JwtSettings__SecretKey ?? 'SignTrackDevSecretKeyMin32Chars!!',
  PYTHON_EXECUTABLE:
    process.env.PYTHON_EXECUTABLE ??
    (existsSync(recognitionVenvPython) ? recognitionVenvPython : 'python3'),
}

const SERVICES = [
  {
    name: 'Identity',
    port: 5104,
    healthUrl: 'http://localhost:5104/api/v1/health',
    project: join(backendRoot, 'services/identity/SignTrack.Identity.Api/SignTrack.Identity.Api.csproj'),
    swagger: 'http://localhost:5104/swagger',
  },
  {
    name: 'Messaging',
    port: 5300,
    healthUrl: 'http://localhost:5300/api/v1/health',
    project: join(backendRoot, 'services/messaging/SignTrack.Messaging.Api/SignTrack.Messaging.Api.csproj'),
  },
  {
    name: 'Calls',
    port: 5200,
    healthUrl: 'http://localhost:5200/api/v1/health',
    project: join(backendRoot, 'services/calls/SignTrack.Calls.Api/SignTrack.Calls.Api.csproj'),
  },
  {
    name: 'Gateway',
    port: 5050,
    healthUrl: 'http://localhost:5050/health',
    project: join(backendRoot, 'services/gateway/SignTrack.Gateway.Api/SignTrack.Gateway.Api.csproj'),
    swagger: 'http://localhost:5050/',
  },
  {
    name: 'Recognition',
    port: 3000,
    healthUrl: 'http://localhost:3000/health',
    type: 'node',
    script: 'recognition:api',
  },
]

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

async function ensureServiceReady(service) {
  // Recognition cae con frecuencia; siempre lo gestionamos con watchdog aparte.
  if (service.name === 'Recognition') {
    return null
  }

  if (await isHealthy(service.healthUrl)) {
    console.log(`${service.name} ya está activo en :${service.port} (se reutiliza).`)
    return null
  }

  const stalePids = getPidsOnPort(service.port)
  if (stalePids.length > 0) {
    console.log(`Puerto ${service.port} ocupado por PID(s) ${stalePids.join(', ')} — liberando...`)
    for (const pid of stalePids) killProcessTree(pid)
    await new Promise((r) => setTimeout(r, 1500))
  }

  if (service.type === 'node') {
    return runBackground('pnpm', [service.script], { cwd: backendRoot, env: devEnv })
  }

  return runBackground(
    'dotnet',
    ['run', '--project', service.project, '--launch-profile', 'http', '--no-build'],
    { cwd: backendRoot, env: devEnv },
  )
}

console.log('Docker: Postgres + Redis...')
try {
  await Promise.race([
    run('docker', ['compose', 'up', '-d'], { cwd: backendRoot }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Docker no respondió en 20s')), 20000),
    ),
  ])
} catch (err) {
  console.warn(
    '⚠ Docker compose no levantó infra (¿Docker Desktop apagado?).',
    'Enciende Docker y ejecuta: docker compose up -d',
  )
  console.warn(String(err.message || err))
}

await ensureFrontendDeps()

console.log('\nCompilando solución .NET...')
await run('dotnet', ['build', join(backendRoot, 'SignTrack.sln'), '-v', 'q'], { cwd: backendRoot })

console.log('\nServicios (Ctrl+C detiene lo iniciado por este script):')
for (const svc of SERVICES) {
  const url = svc.swagger ?? svc.healthUrl
  console.log(`  ${svc.name.padEnd(10)} → ${url}`)
}
console.log(`  Frontend   → ${FRONTEND_URL}\n`)

const children = []
let shuttingDown = false
let recognitionRestarting = false

const recognitionService = SERVICES.find((svc) => svc.name === 'Recognition')

async function startRecognitionService() {
  const stalePids = getPidsOnPort(recognitionService.port)
  if (stalePids.length > 0) {
    console.log(
      `Recognition: liberando puerto ${recognitionService.port} (PID ${stalePids.join(', ')})…`,
    )
    for (const pid of stalePids) killProcessTree(pid)
    await new Promise((r) => setTimeout(r, 800))
  }

  const child = runBackground('pnpm', [recognitionService.script], {
    cwd: backendRoot,
    env: devEnv,
  })

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      console.warn(`Recognition terminó (código ${code}). El watchdog lo reiniciará…`)
    }
  })

  return child
}

async function ensureRecognitionAlive() {
  if (shuttingDown || recognitionRestarting) return
  if (await isHealthy(recognitionService.healthUrl)) return

  recognitionRestarting = true
  console.warn('Recognition offline — reiniciando…')
  try {
    await startRecognitionService()
    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (await isHealthy(recognitionService.healthUrl)) {
        console.log('Recognition OK')
        return
      }
      await new Promise((r) => setTimeout(r, 1000))
    }
    console.error('Recognition no respondió tras reinicio. Revisa: pnpm setup:recognition')
  } finally {
    recognitionRestarting = false
  }
}

for (const svc of SERVICES) {
  const child = await ensureServiceReady(svc)
  if (child) children.push(child)
}

await ensureRecognitionAlive()
setInterval(() => {
  ensureRecognitionAlive().catch((err) => console.error('Watchdog Recognition:', err.message))
}, 10000)

children.push(runBackground('pnpm', ['dev'], { cwd: frontendRoot }))

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
