import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

const env = {
  ...process.env,
  ASPNETCORE_ENVIRONMENT: 'Development',
  JwtSettings__SecretKey:
    process.env.JwtSettings__SecretKey ?? 'SignTrackDevSecretKeyMin32Chars!!',
}

const child = spawn(
  'dotnet',
  ['run', '--project', 'services/identity/SignTrack.Identity.Api', '--launch-profile', 'http'],
  { cwd: backendRoot, env, stdio: 'inherit', shell: isWin },
)

child.on('exit', (code) => process.exit(code ?? 0))
