#!/usr/bin/env node
/**
 * Prepara Recognition para dev: venv Python + modelo demo si falta sign_model.pkl
 * Uso: node scripts/setup-recognition.mjs
 * Con Neon real: copia services/recognition/.env y luego pnpm recognition:export-letters && train
 */
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const venvPy = join(root, 'services/recognition/.venv/bin/python3')
const requirements = join(root, 'services/recognition/requirements.txt')
const modelPath = join(root, 'services/recognition/src/model/sign_model.pkl')
const trainScript = join(root, 'services/recognition/src/model/train_model.py')
const datasetCsv = join(root, 'services/recognition/src/dataset/sign_dataset.csv')

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

console.log('SignTrack — setup Recognition\n')

if (!existsSync(venvPy)) {
  console.log('1) Creando venv Python...')
  run('python3', ['-m', 'venv', join(root, 'services/recognition/.venv')])
} else {
  console.log('1) venv OK')
}

console.log('2) Instalando dependencias (opencv, mediapipe)...')
run(venvPy, ['-m', 'pip', 'install', '-q', '-r', requirements])

if (existsSync(datasetCsv)) {
  console.log('3) Dataset encontrado — entrenando modelo real...')
  run(venvPy, [trainScript])
} else if (!existsSync(modelPath)) {
  console.log('3) Generando modelo demo (RandomForest sintético)...')
  console.log('   Para producción: exporta dataset Neon y vuelve a correr setup.\n')
  run(
    venvPy,
    [
      '-c',
      `
import joblib, numpy as np
from sklearn.ensemble import RandomForestClassifier
labels = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
X, y = [], []
rng = np.random.default_rng(42)
for label in labels:
    center = rng.random(18)
    for _ in range(40):
        X.append(center + rng.normal(0, 0.02, 18))
        y.append(label)
clf = RandomForestClassifier(n_estimators=120, random_state=42)
clf.fit(X, y)
joblib.dump(clf, ${JSON.stringify(modelPath)})
print('Modelo demo guardado')
`,
    ],
    { cwd: root },
  )
} else {
  console.log('3) Modelo ya existe — omitido')
}

console.log('\n✓ Recognition listo. Reinicia: pnpm start:all')
console.log(`  PYTHON_EXECUTABLE=${venvPy}`)
