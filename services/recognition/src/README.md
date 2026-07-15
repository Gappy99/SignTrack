# Recognition Service — Código fuente

Este directorio contiene la lógica de reconocimiento y traducción de lenguaje de señas del microservicio `services/recognition/`.

## Estructura

- `recognition/` — pipeline de letras (extracción, dataset, inferencia)
- `words/` — pipeline de palabras (videos, entrenamiento, predicción)
- `translation/` — postproceso de texto detectado
- `shared/` — contratos, features de mano y utilidades comunes
- `api/` — servidor HTTP (Express)
- `db/` — Neon PostgreSQL, exportación de datasets y backfill desde R2
- `storage/` — integración con Cloudflare R2
- `features/` — extracción de características
- `model/` — entrenamiento e inferencia de modelos de letras
- `dataset/` — datos locales de entrenamiento (CSV generados e imágenes/videos por clase)

## Regla de trabajo

Todo código nuevo de reconocimiento o traducción debe agregarse en `recognition/` o `translation/`. Los directorios `features/` y `model/` son la base técnica del pipeline de letras.

## Pasos mínimos — reconocimiento de letras

Hay tres formas válidas de construir el dataset de entrenamiento.

### Opción A: imágenes locales

1. Agrega imágenes por letra:

   - `services/recognition/src/dataset/A/*.jpg`
   - `services/recognition/src/dataset/B/*.jpg`

2. Genera el CSV de entrenamiento (features reales):

   ```bash
   # Desde la raíz del monorepo
   pnpm recognition:letter-dataset
   ```

   O, desde `services/recognition/`:

   ```bash
   python src/recognition/build_letter_dataset.py
   ```

### Opción B: exportar desde Neon

Recomendado cuando ya subiste archivos a R2 y las features están en Neon.

```bash
pnpm recognition:export-letters
```

Equivalente directo:

```bash
node services/recognition/src/db/exportLetterDatasetFromNeon.js
```

### Opción C: backfill automático R2 → Neon

Recomendado para el pipeline cloud completo.

1. Sube imágenes de letras a R2 en carpetas `dataset/A/`, `dataset/B/`, etc.
2. Ejecuta backfill (descarga, extrae landmarks, guarda en Neon):

   ```bash
   pnpm recognition:backfill-r2
   ```

3. Exporta CSV desde Neon:

   ```bash
   pnpm recognition:export-letters
   ```

## Entrenar y servir

1. Entrena el modelo de letras:

   ```bash
   pnpm recognition:letter-train
   ```

2. Levanta la API:

   ```bash
   pnpm recognition:api
   ```

   - Puerto por defecto: **3000**
   - `POST /predict-letter` con `{"features": [...]}` o `{"imagePath": "ruta/a/imagen.jpg"}`

## Variables de entorno

Copia `services/recognition/.env.example` a `.env` en la raíz del monorepo (o en `services/recognition/` según dónde ejecutes los scripts). Ver también `services/recognition/README.md`.
