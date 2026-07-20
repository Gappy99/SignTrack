/**
 * Descarga imágenes de R2 a dataset/ local (solo lectura en R2, sin Neon).
 * Uso: node syncR2ToLocalDataset.js [--limit N] [--prefix dataset/]
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import dotenv from "dotenv"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const LOCAL_DATASET_ROOT = path.resolve(__dirname, "..", "dataset")
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"])

const cliArgs = process.argv.slice(2)
const LIMIT = (() => {
    const idx = cliArgs.indexOf("--limit")
    if (idx !== -1) {
        const val = parseInt(cliArgs[idx + 1], 10)
        if (!isNaN(val) && val > 0) return val
    }
    return Infinity
})()
const PREFIX = (() => {
    const idx = cliArgs.indexOf("--prefix")
    if (idx !== -1) return cliArgs[idx + 1]
    return (process.env.R2_BACKFILL_PREFIX || "dataset/").trim()
})()

const required = ["R2_ENDPOINT", "R2_ACCESS_KEY", "R2_SECRET_KEY", "R2_BUCKET"]
for (const key of required) {
    if (!process.env[key]) {
        console.error(`Falta ${key} en .env`)
        process.exit(1)
    }
}

const s3Client = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
})

const letterFromKey = (key) => {
    const parts = key.split("/").filter(Boolean)
    if (parts.length < 2) return null
    const letter = parts[parts.length - 2].toUpperCase()
    if (letter.length === 1 && letter >= "A" && letter <= "Z") return letter
    return null
}

const downloadObject = async (key) => {
    const response = await s3Client.send(
        new GetObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
        }),
    )
    const chunks = []
    for await (const chunk of response.Body) {
        chunks.push(chunk)
    }
    return Buffer.concat(chunks)
}

const listAllKeys = async () => {
    const keys = []
    let continuationToken

    do {
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: process.env.R2_BUCKET,
                Prefix: PREFIX,
                ContinuationToken: continuationToken,
            }),
        )
        for (const obj of response.Contents || []) {
            const ext = path.extname(obj.Key).toLowerCase()
            if (IMAGE_EXTENSIONS.has(ext)) keys.push(obj.Key)
        }
        continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    return keys
}

const run = async () => {
    console.log(`Sync R2 → local (solo lectura R2, sin Neon)`)
    console.log(`  bucket: ${process.env.R2_BUCKET}`)
    console.log(`  prefix: ${PREFIX}`)
    console.log(`  dest:   ${LOCAL_DATASET_ROOT}\n`)

    const keys = await listAllKeys()
    const selected = keys.slice(0, LIMIT === Infinity ? keys.length : LIMIT)
    let downloaded = 0
    let skipped = 0

    for (const key of selected) {
        const letter = letterFromKey(key)
        if (!letter) {
            skipped += 1
            continue
        }

        const filename = path.basename(key)
        const destDir = path.join(LOCAL_DATASET_ROOT, letter)
        const destPath = path.join(destDir, filename)

        fs.mkdirSync(destDir, { recursive: true })
        if (fs.existsSync(destPath)) {
            skipped += 1
            continue
        }

        const buffer = await downloadObject(key)
        fs.writeFileSync(destPath, buffer)
        downloaded += 1
    }

    console.log(`✓ Descargadas: ${downloaded}`)
    console.log(`  Omitidas:    ${skipped}`)
    console.log("\nSiguiente (Plan A local, sin Neon):")
    console.log("  pnpm recognition:letter-dataset")
    console.log("  pnpm recognition:letter-train")
}

run().catch((err) => {
    console.error(err)
    process.exit(1)
})
