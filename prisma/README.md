# Prisma IA Schema

## Models

- Sign: label, type (letter/word)
- Dataset: sign_id, file_url (R2), file_type
- Landmark: dataset_id, points (JSONB)
- Feature: dataset_id, vector (JSONB)

## Enums

- SignType: letter | word
- FileType: image | video

## Usage

```javascript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Create sign
const sign = await prisma.sign.create({
  data: { label: 'A', type: 'letter' }
})

// Create dataset
const dataset = await prisma.dataset.create({
  data: {
    signId: sign.id,
    fileUrl: 'https://r2.dev/A/img1.jpg',
    fileType: 'image'
  }
})

// Create landmark
await prisma.landmark.create({
  data: {
    datasetId: dataset.id,
    points: [[0.1, 0.2, 0.3], ...]
  }
})

// Create feature
await prisma.feature.create({
  data: {
    datasetId: dataset.id,
    vector: [0.12, 0.08, 0.11, 1.45, 1.39]
  }
})
```

Luego ejecutar:

npx prisma db push
npx prisma generate
