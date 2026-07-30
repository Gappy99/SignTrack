/**
 * Crea 4 usuarios demo, los activa, chats DM entre todos y sala grupal.
 * Uso: node scripts/seed-demo-users.mjs
 */
import pg from 'pg'
import crypto from 'node:crypto'

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:5050'
const PG =
  process.env.ConnectionStrings__DefaultConnection ||
  'postgresql://root:admin@localhost:5435/SignTrack'

const PASSWORD = 'Test1234!'
const PHONE = '50212345'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const ALPHABET = '123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'

const USERS = [
  { name: 'María', surname: 'López', username: 'maria_lopez', email: 'maria.demo@signtrack.test' },
  { name: 'Carlos', surname: 'Ruiz', username: 'carlos_ruiz', email: 'carlos.demo@signtrack.test' },
  { name: 'Ana', surname: 'Méndez', username: 'ana_mendez', email: 'ana.demo@signtrack.test' },
  { name: 'Luis', surname: 'Soto', username: 'luis_soto', email: 'luis.demo@signtrack.test' },
]

function shortId() {
  const bytes = crypto.randomBytes(12)
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

const id = {
  conv: () => `conv_${shortId()}`,
  prt: () => `prt_${shortId()}`,
  msg: () => `msg_${shortId()}`,
  room: () => `room_${shortId()}`,
}

async function register(user) {
  const form = new FormData()
  form.append('Name', user.name)
  form.append('Surname', user.surname)
  form.append('Username', user.username)
  form.append('Email', user.email)
  form.append('Password', PASSWORD)
  form.append('Phone', PHONE)

  const res = await fetch(`${GATEWAY}/api/v1/auth/register`, { method: 'POST', body: form })
  if (res.status === 201) {
    console.log(`  ✓ Registrado: ${user.email}`)
    return
  }
  const body = await res.text()
  if (res.status === 400 || res.status === 409 || body.toLowerCase().includes('exist')) {
    console.log(`  · Ya existe: ${user.email}`)
    return
  }
  if (res.status === 429) {
    console.log(`  · Rate limit al registrar (usuario probablemente ya existe): ${user.email}`)
    return
  }
  console.error(`  ✗ Error ${user.email}: ${res.status} ${body}`)
}

async function activateDemoUsers(client) {
  await client.query(
    `UPDATE users SET status = true WHERE email LIKE '%.demo@signtrack.test'`,
  )
  await client.query(`
    UPDATE user_emails SET email_verified = true
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%.demo@signtrack.test')
  `)
}

async function loadDemoUsers(client) {
  const { rows } = await client.query(
    `SELECT id, email, username, name, surname FROM users
     WHERE email LIKE '%.demo@signtrack.test' ORDER BY email`,
  )
  return rows
}

async function findDirectConversation(client, userA, userB) {
  const { rows } = await client.query(
    `
    SELECT c.id FROM conversations c
    WHERE c.type = 'dm'
      AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = $1)
      AND EXISTS (SELECT 1 FROM conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = $2)
      AND (SELECT COUNT(*) FROM conversation_participants p WHERE p.conversation_id = c.id) = 2
    LIMIT 1
    `,
    [userA, userB],
  )
  return rows[0]?.id
}

async function ensureConversation(client, userA, userB) {
  const existing = await findDirectConversation(client, userA.id, userB.id)
  if (existing) return existing

  const convId = id.conv()
  const now = new Date()

  await client.query(
    `INSERT INTO conversations (id, type, group_id, title, created_at, updated_at)
     VALUES ($1, 'dm', NULL, $2, $3, $3)`,
    [convId, `Chat ${userA.name} ↔ ${userB.name}`, now],
  )

  for (const u of [userA, userB]) {
    await client.query(
      `INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, last_read_at)
       VALUES ($1, $2, $3, $4, NULL)`,
      [id.prt(), convId, u.id, now],
    )
  }

  return convId
}

async function addMessage(client, convId, senderId, content) {
  const now = new Date()
  await client.query(
    `INSERT INTO messages (id, conversation_id, sender_user_id, content, type, sent_at)
     VALUES ($1, $2, $3, $4, 'text', $5)`,
    [id.msg(), convId, senderId, content, now],
  )
  await client.query(`UPDATE conversations SET updated_at = $1 WHERE id = $2`, [now, convId])
}

async function ensureGroupRoom(client, users) {
  const host = users[0]
  const { rows } = await client.query(
    `SELECT id, title FROM call_rooms WHERE title = 'Reunión demo — Equipo SignTrack' LIMIT 1`,
  )
  if (rows[0]) return rows[0].id

  const roomId = id.room()
  const now = new Date()
  await client.query(
    `INSERT INTO call_rooms (id, title, host_user_id, status, max_participants, created_at, updated_at)
     VALUES ($1, $2, $3, 'waiting', 8, $4, $4)`,
    [roomId, 'Reunión demo — Equipo SignTrack', host.id, now],
  )

  for (const u of users) {
    await client.query(
      `INSERT INTO room_participants (id, room_id, user_id, display_name, joined_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [id.prt(), roomId, u.id, u.name, now],
    )
  }

  return roomId
}

async function main() {
  console.log('SignTrack — seed usuarios demo\n')

  const health = await fetch(`${GATEWAY}/health`).catch(() => null)
  if (!health?.ok) {
    console.error(`Gateway no responde en ${GATEWAY}. ¿Está corriendo pnpm start:all?`)
    process.exit(1)
  }

  console.log('1) Registrando usuarios (con pausa anti rate-limit)...')
  for (const u of USERS) {
    await register(u)
    await sleep(13000)
  }

  const client = new pg.Client({ connectionString: PG })
  await client.connect()

  console.log('\n2) Activando cuentas demo en Postgres...')
  await activateDemoUsers(client)
  const users = await loadDemoUsers(client)
  if (users.length < 4) {
    console.error(`Solo se encontraron ${users.length}/4 usuarios demo en la BD.`)
    await client.end()
    process.exit(1)
  }
  users.forEach((u) => console.log(`  ✓ ${u.name} ${u.surname} → ${u.id}`))

  console.log('\n3) Creando chats entre todos los pares...')
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const a = users[i]
      const b = users[j]
      const convId = await ensureConversation(client, a, b)
      const { rows: msgCount } = await client.query(
        `SELECT COUNT(*)::int AS n FROM messages WHERE conversation_id = $1`,
        [convId],
      )
      if (msgCount[0].n === 0) {
        await addMessage(client, convId, a.id, `¡Hola ${b.name}! Soy ${a.name}, probando SignTrack 👋`)
        await addMessage(client, convId, b.id, `¡Hola ${a.name}! Aquí ${b.name}, recibido ✅`)
      }
      console.log(`  ✓ ${a.username} ↔ ${b.username} (${convId})`)
    }
  }

  console.log('\n4) Sala grupal demo (LiveKit)...')
  const roomId = await ensureGroupRoom(client, users)
  console.log(`  ✓ room_${roomId.replace(/^room_/, '')} → http://localhost:5180/signtrack/dashboard/calls/${roomId}`)

  await client.end()

  console.log('\n══════════════════════════════════════════════')
  console.log('CUENTAS DEMO — contraseña: Test1234!')
  console.log('══════════════════════════════════════════════')
  for (const u of USERS) {
    console.log(`  ${u.email.padEnd(28)} @${u.username}`)
  }
  console.log('\nAdmin: admin@SignTrack.com / Admin1234!')
  console.log('\n→ Contactos: verás a los otros 3 + admin')
  console.log('→ Chats: 6 conversaciones ya con mensajes')
  console.log('→ Llamadas: reunión grupal lista para unirse')
  console.log('\nhttp://localhost:5180/signtrack/')
}

main().catch(async (err) => {
  console.error(err)
  process.exit(1)
})
