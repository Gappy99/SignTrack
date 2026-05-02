# Dataset Service Jobs

Endpoints:

- POST /dataset/process
- POST /dataset/backfill
- POST /dataset/export/letters
- POST /dataset/export/words

Body para /dataset/backfill (opcional):

{
  "limit": 100,
  "startAfter": "dataset/A/file.jpg",
  "concurrency": 5
}
