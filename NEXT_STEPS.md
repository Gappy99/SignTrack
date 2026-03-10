# SignTrack IA

Sistema de reconocimiento de lengua de signos usando MediaPipe + RandomForest + Node.js.

## Estado Actual

✅ Arquitectura: R2 (storage) → Python (extracción) → Neon (metadata) → Modelo (entrenamiento)
✅ Scripts Python listos (MediaPipe + sklearn)
✅ APIs Node.js listas
✅ Schema de base de datos creado
⏳ **Bloqueante**: Sin datos de entrenamiento en R2

## Flujo Completo

Imágenes R2 → backfillFromR2.js → Neon DB → exportCSV → train_model.py → model.pkl → API

## Pasos para Levantar el Modelo

### Paso 1: Subir imágenes de entrenamiento a R2

Estructura de carpetas requerida:

dataset/A/img1.jpg
dataset/B/img1.jpg
dataset/C/img1.jpg
... (A-Z)

Requisitos de imágenes:
- Formato JPG
- Mínimo 20 imágenes por letra
- Mano visible y bien iluminada
- Diferentes ángulos y condiciones de luz
- Resolución mínima 480x640px

### Paso 2: Extraer landmarks desde R2

node src/IA/db/backfillFromR2.js

Descarga imágenes de R2, extrae 21 puntos de mano con MediaPipe, calcula 9 features por mano y guarda todo en Neon.

Salida esperada:

Processing: dataset/A/img1.jpg
✓ Landmarks extraídos
✓ Guardado en Neon
...
Backfill completo: X señas con Y datasets

### Paso 3: Exportar CSV de entrenamiento

node src/IA/db/exportLetterDatasetFromNeon.js

Genera: src/IA/dataset/letter_training.csv

### Paso 4: Entrenar el modelo

Windows:
c:/2024505/SignTrack/.venv/Scripts/python.exe src/IA/model/train_model.py

Mac/Linux:
python src/IA/model/train_model.py

Genera: src/IA/model/sign_model.pkl

### Paso 5: Levantar la API

node src/IA/api/server.js

Servidor corriendo en http://localhost:3000

### Paso 6: Probar predicción

Con imagen:
curl -X POST http://localhost:3000/predict-letter -H "Content-Type: application/json" -d '{"imagePath":"./test_a.jpg"}'

Con features extraídas:
curl -X POST http://localhost:3000/predict-letter -H "Content-Type: application/json" -d '{"features":[0.12, 0.08, 0.11, 1.45, 1.39, 0.92, 1.23, 0.78, 0.95]}'

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| src/IA/recognition/extract_from_image.py | Extrae 21 landmarks + 9 features de una imagen |
| src/IA/db/backfillFromR2.js | Descarga R2 → extrae landmarks → guarda en Neon |
| src/IA/db/exportLetterDatasetFromNeon.js | Exporta features de Neon a CSV |
| src/IA/model/train_model.py | Entrena RandomForest sobre el CSV |
| src/IA/api/server.js | API de predicción en puerto 3000 |

## Arquitectura

| Capa | Tecnología |
|------|-----------|
| Almacenamiento de archivos | Cloudflare R2 (S3-compatible) |
| Metadata y features | Neon PostgreSQL |
| Procesamiento de mano | Python + MediaPipe |
| Modelo ML | scikit-learn RandomForest |
| API de predicción | Node.js Express (puerto 3000) |

## Tiempo Estimado

Con 20 imágenes por letra (26 letras = 520 imágenes total):

| Paso | Tiempo |
|------|--------|
| Backfill desde R2 | 10-15 min |
| Exportar CSV | ~1 min |
| Entrenar modelo | 2-5 min |
| Total | ~20 min |

## Solución de Errores Comunes

"relation 'signs' does not exist"
→ node src/IA/db/initSchema.js

"No landmarks extracted"
→ Verificar formato JPG/PNG, visibilidad de la mano y permisos del archivo

"ModuleNotFoundError: joblib"
→ ./.venv/Scripts/pip install joblib scikit-learn pandas numpy opencv-python mediapipe

"Dataset not found at sign_dataset.csv"
→ Ejecutar primero el Paso 2 y Paso 3

## Mejoras Futuras

- [ ] Reconocimiento de palabras con detección de secuencias
- [ ] Integración con Gemini para refinamiento de texto
- [ ] Prisma ORM para type safety
- [ ] UI en React para predicción en vivo
- [ ] Aumentación de datos para mejorar precisión del modelo
- [ ] Tests automatizados por endpoint