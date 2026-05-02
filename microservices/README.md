# IA Microservices

Esta carpeta contiene la separacion de IA en microservicios independientes:

- ia-feature-extraction: extrae landmarks/features desde imagen o video.
- ia-inference: predice letras/palabras usando features.
- ia-translation: normaliza/coherencia de texto detectado.
- ia-dataset: jobs de procesamiento, backfill y export de datasets.
- ia-training: entrenamiento y evaluacion de modelos.

## Puertos por defecto

- ia-feature-extraction: 3102
- ia-inference: 3101
- ia-translation: 3103
- ia-dataset: 3104
- ia-training: 3105
- ia-api gateway (compatibilidad): 3000

## Flujo

1. Cliente llama al gateway en /predict-letter, /predict-word o /translate.
2. Gateway delega a ia-inference y ia-translation.
3. ia-inference llama a ia-feature-extraction cuando se envia imagePath o videoPath.

## Variables importantes

- PYTHON_EXECUTABLE: ruta al python de tu entorno virtual.
- IA_FEATURE_SERVICE_URL: URL del servicio de extraccion (default http://localhost:3102).
- IA_INFERENCE_URL: URL de inferencia para el gateway (default http://localhost:3101).
- IA_TRANSLATION_URL: URL de traduccion para el gateway (default http://localhost:3103).

## Env por servicio

Se agregaron archivos por servicio en `microservices/env/`:

- ia-feature-extraction.env.dev / ia-feature-extraction.env.prod
- ia-inference.env.dev / ia-inference.env.prod
- ia-translation.env.dev / ia-translation.env.prod
- ia-dataset.env.dev / ia-dataset.env.prod
- ia-training.env.dev / ia-training.env.prod
- ia-gateway.env.dev / ia-gateway.env.prod

El `docker-compose.yml` usa por defecto los `.env.dev`.
Para usar prod, cambia el `env_file` de cada servicio a su archivo `.env.prod`.

## Docker Compose completo

Servicios incluidos:

- postgres
- mongo
- ia-feature-extraction
- ia-inference
- ia-translation
- ia-dataset
- ia-training
- ia-gateway

Comandos:

1. Build de imagenes:

	docker compose build

2. Levantar todo:

	docker compose up -d

3. Ver logs de gateway IA:

	docker compose logs -f ia-gateway

4. Apagar todo:

	docker compose down

## Inicio rapido (Windows PowerShell)

En terminales separadas:

1. node microservices/ia-feature-extraction/server.js
2. node microservices/ia-inference/server.js
3. node microservices/ia-translation/server.js
4. node src/IA/api/server.js

Opcionales:

5. node microservices/ia-dataset/server.js
6. node microservices/ia-training/server.js
