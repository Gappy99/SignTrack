#!/usr/bin/env bash
# Espera a Docker/Postgres/Redis y levanta SignTrack completo.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="/tmp/signtrack-auto-start.log"
exec > >(tee -a "$LOG") 2>&1

echo "=== SignTrack auto-start $(date) ==="
open -a Docker 2>/dev/null || true

for i in $(seq 1 60); do
  if nc -z -w 1 localhost 5435 2>/dev/null && nc -z -w 1 localhost 6379 2>/dev/null; then
    echo "[OK] Infra lista en intento $i"
    break
  fi
  echo "[...] Esperando Docker (Postgres+Redis) $i/60 — enciende Docker Desktop"
  sleep 5
done

if ! nc -z -w 1 localhost 5435 2>/dev/null; then
  echo "[FAIL] Docker no levantó Postgres. Revisa Docker Desktop."
  exit 1
fi

cd "$ROOT"
docker compose up -d
sleep 3

for port in 5180 5050 5104 5200 5300 3000; do
  pids=$(lsof -ti tcp:$port 2>/dev/null || true)
  [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
done

echo "[...] Iniciando pnpm start:all"
pnpm start:all &
START_PID=$!

for i in $(seq 1 30); do
  if curl -sf http://localhost:5050/health >/dev/null 2>&1; then
    echo "[OK] Gateway listo"
    break
  fi
  sleep 2
done

sleep 5
pnpm seed:demo || true
pnpm smoke:e2e || true

echo "=== LISTO ==="
echo "Frontend: http://localhost:5180/signtrack/"
wait $START_PID
