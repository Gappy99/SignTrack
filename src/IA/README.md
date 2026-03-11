# IA Module

Este directorio contiene toda la logica de reconocimiento y traduccion de lenguaje de senas.

## Estructura objetivo

- recognition/: pipeline de reconocimiento (letras y palabras)
- translation/: postproceso de texto detectado
- shared/: contratos y estructuras comunes
- api/: endpoints del modulo IA
- db/: integracion de Neon y carga de dataset
- storage/: integracion de Cloudflare R2
- vision/: captura y deteccion de mano (MediaPipe)
- features/: extraccion de caracteristicas
- model/: entrenamiento e inferencia de modelos

## Regla de trabajo

Todo codigo nuevo relacionado con reconocimiento o traduccion debe agregarse primero en:

- recognition/
- translation/

Los directorios vision/, features/ y model/ se mantienen como base tecnica y pueden ser integrados gradualmente al pipeline de recognition/.

## Pasos Minimos Para Reconocimiento De Letras

Hay 3 formas validas para construir el dataset de entrenamiento.

Opcion A: desde imagenes locales

1. Agrega imagenes por letra en carpetas:

- src/IA/dataset/A/*.jpg
- src/IA/dataset/B/*.jpg

2. Genera CSV de entrenamiento (features reales):

- c:/2024505/SignTrack/.venv/Scripts/python.exe src/IA/recognition/build_letter_dataset.py

Opcion B: desde Neon (recomendado cuando ya subiste archivos a R2 y features a Neon)

1. Exporta CSV desde Neon:

- node src/IA/db/exportLetterDatasetFromNeon.js

Opcion C: Backfill automatico desde R2 a Neon (recomendado para pipeline cloud completo)

1. Sube imagenes de letras a R2 en carpetas dataset/A/, dataset/B/, etc.

2. Ejecuta backfill para descargar, extraer landmarks y guardar en Neon:

- node src/IA/db/backfillFromR2.js

3. Exporta CSV desde Neon:

- node src/IA/db/exportLetterDatasetFromNeon.js

Paso Final: entrenar y servir

1. Entrena el modelo:

- c:/2024505/SignTrack/.venv/Scripts/python.exe src/IA/model/train_model.py

2. Levanta API de IA y predice:

- node src/IA/api/server.js
- POST /predict-letter con {"features": [...]} o {"imagePath": "ruta/a/imagen.jpg"}
