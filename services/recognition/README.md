# SignTrack.Recognition

Microservicio de **reconocimiento de lenguaje de señas** (Node.js + Python + MediaPipe).

Ubicación: `services/recognition/` — código en `services/recognition/src/`.

## Estado: funcional (mantener estable)

No reentrenar modelos en sprints de app. Este módulo ya incluye pipeline de letras/palabras, dataset R2/Neon y API de predicción.

## Configuración

```bash
cp services/recognition/.env.example .env
# Edita NEON_DATABASE_URL, credenciales R2, PYTHON_EXECUTABLE, etc.
```

Variables principales: `NEON_DATABASE_URL`, `R2_ENDPOINT`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `PYTHON_EXECUTABLE`, `PORT` (default 3000). Opcional: `GEMINI_API_KEY` para traducción/coherencia.

## Ejecutar API

```bash
# Desde raíz del monorepo
pnpm recognition:api
```

Puerto: **3000**

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/predict-letter` | Predicción letra (features o imagePath) |
| POST | `/predict-word` | Predicción palabra (features o videoPath) |
| POST | `/translate` | Stub (passthrough texto); Sprint 3: conectar `coherence.py` |
| GET | `/health` | Health check |

## Python

```bash
pip install -r services/recognition/requirements.txt
pnpm recognition:camera   # demo cámara en vivo
```

## Pipeline de entrenamiento

Detalle paso a paso en `src/README.md`. Scripts npm/pnpm disponibles:

| Script | Descripción |
|--------|-------------|
| `recognition:letter-dataset` | CSV de letras desde imágenes locales |
| `recognition:letter-train` | Entrenar modelo de letras |
| `recognition:word-dataset` | CSV de palabras desde videos locales |
| `recognition:word-train` | Entrenar modelo de palabras |
| `recognition:backfill-r2` | Backfill R2 → Neon |
| `recognition:export-letters` | Exportar dataset de letras desde Neon |
| `recognition:export-words` | Exportar dataset de palabras desde Neon |
| `recognition:init-schema` | Inicializar esquema Neon |

## Integración con Calls

Calls capturará frames de la videollamada y enviará features a `POST /predict-letter`. El resultado se publicará en Messaging como mensaje de traducción.
