#!/usr/bin/env node
/**
 * Detiene todo SignTrack: procesos locales + contenedores Docker.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ports = [5180, 5050, 5104, 5200, 5300, 3000, 80, 443, 7880, 7881]

console.log('SignTrack — deteniendo servicios...\n')

for (const port of ports) {
  spawnSync('bash', ['-c', `lsof -ti:${port} | xargs kill -9 2>/dev/null || true`], { stdio: 'ignore' })
}

spawnSync('pkill', ['-f', 'start-all.mjs'], { stdio: 'ignore' })
// Nunca matar start-home.mjs aquí: start:home llama a stop-all al inicio
// y se autoapagaba con [1] killed.
spawnSync('pkill', ['-f', 'SignTrack.Identity.Api'], { stdio: 'ignore' })
spawnSync('pkill', ['-f', 'SignTrack.Gateway.Api'], { stdio: 'ignore' })
spawnSync('pkill', ['-f', 'SignTrack.Calls.Api'], { stdio: 'ignore' })
spawnSync('pkill', ['-f', 'SignTrack.Messaging.Api'], { stdio: 'ignore' })
spawnSync('pkill', ['-f', 'services/recognition/src/api/server.js'], { stdio: 'ignore' })

spawnSync('docker', ['compose', 'down'], { cwd: root, stdio: 'inherit' })
spawnSync('docker', ['compose', '-f', 'docker-compose.prod.yml', '--env-file', '.env.prod', 'down'], {
  cwd: root,
  stdio: 'inherit',
})
spawnSync('docker', ['compose', '-f', 'docker-compose.home.yml', 'down'], { cwd: root, stdio: 'ignore' })

console.log('✓ SignTrack detenido\n')
