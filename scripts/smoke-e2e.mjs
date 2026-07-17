/**
 * Smoke test E2E vía Gateway — verifica servicios críticos sin browser.
 * Uso: pnpm smoke:e2e
 */
const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:5050'
const DEMO_EMAIL = process.env.SMOKE_EMAIL || 'maria.demo@signtrack.test'
const DEMO_PASSWORD = process.env.SMOKE_PASSWORD || 'Test1234!'

const results = []

const ok = (label) => {
  results.push({ label, pass: true })
  console.log(`  ✓ ${label}`)
}

const fail = (label, err) => {
  results.push({ label, pass: false, err: String(err) })
  console.error(`  ✗ ${label}: ${err}`)
}

async function login() {
  const res = await fetch(`${GATEWAY}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername: DEMO_EMAIL, password: DEMO_PASSWORD }),
  })
  if (!res.ok) throw new Error(`login ${res.status}`)
  const data = await res.json()
  const token = data.token || data.accessToken
  if (!token) throw new Error('sin token JWT')
  return token
}

async function authFetch(token, path, options = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const res = await fetch(`${GATEWAY}${path}`, { ...options, headers })
  return res
}

async function main() {
  console.log('SignTrack smoke E2E')
  console.log(`Gateway: ${GATEWAY}\n`)

  let token
  try {
    token = await login()
    ok('Login demo')
  } catch (e) {
    fail('Login demo', e.message)
    printSummary()
    process.exit(1)
  }

  const checks = [
    ['GET /api/v1/health (Identity)', () => authFetch(token, '/api/v1/health')],
    ['GET conversaciones', () => authFetch(token, '/api/v1/conversations')],
    ['GET presencia online', () => authFetch(token, '/api/v1/presence/online')],
    ['POST heartbeat presencia', () =>
      authFetch(token, '/api/v1/presence/heartbeat', { method: 'POST' })],
    ['GET salas de llamada', () => authFetch(token, '/api/v1/rooms')],
    ['GET citas', () => authFetch(token, '/api/v1/appointments')],
    ['GET solicitudes inbox', () => authFetch(token, '/api/v1/requests/inbox')],
    ['GET VAPID key', () => authFetch(token, '/api/v1/notifications/vapid-public-key')],
  ]

  for (const [label, fn] of checks) {
    try {
      const res = await fn()
      if (res.ok) ok(label)
      else fail(label, `HTTP ${res.status}`)
    } catch (e) {
      fail(label, e.message)
    }
  }

  try {
    const res = await authFetch(token, '/api/v1/rooms', {
      method: 'POST',
      body: JSON.stringify({ title: 'Smoke test room', maxParticipants: 2 }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const room = await res.json()
    if (!room.id) throw new Error('sin room.id')
    ok(`POST crear sala (${room.id})`)

    const join = await authFetch(token, `/api/v1/rooms/${room.id}/join`, {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Smoke' }),
    })
    if (join.ok) ok('POST join sala')
    else fail('POST join sala', `HTTP ${join.status}`)
  } catch (e) {
    fail('Flujo sala de llamada', e.message)
  }

  printSummary()
  process.exit(results.some((r) => !r.pass) ? 1 : 0)
}

function printSummary() {
  const passed = results.filter((r) => r.pass).length
  console.log(`\n${passed}/${results.length} checks OK`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
