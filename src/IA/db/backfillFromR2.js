import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { spawn } from "node:child_process"
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import dotenv from "dotenv"
import pool from "./database.js"
import Uploader from "../storage/uploader.js"

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const IMAGE_EXTRACTOR_SCRIPT = path.resolve(__dirname, "..", "recognition", "extract_from_image.py")
const VIDEO_EXTRACTOR_SCRIPT = path.resolve(__dirname, "..", "words", "video_feature_extractor.py")
const PYTHON_EXECUTABLE_FROM_ENV = (process.env.PYTHON_EXECUTABLE || "").trim()
const PYTHON_EXECUTABLE =
    PYTHON_EXECUTABLE_FROM_ENV && fs.existsSync(PYTHON_EXECUTABLE_FROM_ENV)
        ? PYTHON_EXECUTABLE_FROM_ENV
        : "python"
const R2_PREFIX = (process.env.R2_BACKFILL_PREFIX || "").trim()
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"])

// CLI args: --limit N  --start-after KEY
const cliArgs = process.argv.slice(2)
const LIMIT = (() => {
    const idx = cliArgs.indexOf("--limit")
    if (idx !== -1) {
        const val = parseInt(cliArgs[idx + 1], 10)
        if (!isNaN(val) && val > 0) return val
    }
    return Infinity
})()
const START_AFTER = (() => {
    const idx = cliArgs.indexOf("--start-after")
    return idx !== -1 ? cliArgs[idx + 1] : undefined
})()
const CONCURRENCY = (() => {
    const idx = cliArgs.indexOf("--concurrency")
    if (idx !== -1) {
        const val = parseInt(cliArgs[idx + 1], 10)
        if (!isNaN(val) && val > 0) return val
    }
    return parseInt(process.env.BACKFILL_CONCURRENCY || "5", 10)
})()

const s3Client = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
})

const uploader = new Uploader(
    process.env.R2_ACCESS_KEY,
    process.env.R2_SECRET_KEY,
    process.env.R2_ENDPOINT,
    process.env.R2_BUCKET,
    process.env.R2_PUBLIC_URL
)

const downloadFromR2 = async (key) => {
    const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
    })

    const response = await s3Client.send(command)
    const chunks = []

    for await (const chunk of response.Body) {
        chunks.push(chunk)
    }

    return Buffer.concat(chunks)
}

const runExtractor = (scriptPath, filePath) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [scriptPath, filePath], {
            stdio: ["ignore", "pipe", "pipe"],
        })

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString()
        })

        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString()
        })

        child.on("error", (err) => {
            reject(new Error(`No se pudo ejecutar extractor: ${err.message}`))
        })

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Extractor error (${code}): ${stderr || stdout}`))
                return
            }

            try {
                resolve(JSON.parse(stdout.trim()))
            } catch {
                reject(new Error(`Invalid extractor response: ${stdout}`))
            }
        })
    })

const getFileType = (key) => {
    const extension = path.extname(key).toLowerCase()
    if (IMAGE_EXTENSIONS.has(extension)) return "image"
    if (VIDEO_EXTENSIONS.has(extension)) return "video"
    return "unsupported"
}

const saveFeaturesIfAvailable = async (datasetId, features, key) => {
    if (!features || !Array.isArray(features)) {
        return
    }

    try {
        await pool.query(
            `INSERT INTO features (dataset_id, vector)
             VALUES ($1,$2)`,
            [datasetId, JSON.stringify(features)]
        )
    } catch (featureError) {
        console.warn(`No se guardaron features para ${key}: ${featureError.message}`)
    }
}

const clearDatasetArtifacts = async (datasetId) => {
    await pool.query(`DELETE FROM landmarks WHERE dataset_id = $1`, [datasetId])
    await pool.query(`DELETE FROM features WHERE dataset_id = $1`, [datasetId])
}

const backfillFromR2 = async () => {
    console.log("Iniciando backfill de landmarks desde R2 a Neon...")
    console.log(`Prefix usado: ${R2_PREFIX || "(raiz del bucket)"}`)
    if (LIMIT !== Infinity) console.log(`Límite: ${LIMIT} archivos`)
    if (START_AFTER) console.log(`Iniciando después de: ${START_AFTER}`)
    console.log(`Concurrencia: ${CONCURRENCY} workers`)
    if (PYTHON_EXECUTABLE_FROM_ENV && PYTHON_EXECUTABLE === "python") {
        console.warn(`PYTHON_EXECUTABLE no encontrado (${PYTHON_EXECUTABLE_FROM_ENV}). Se usará 'python'.`)
    }

    // ── Fase 1: recolectar keys válidas (solo metadata, rápido) ─────────────
    console.log("\nFase 1: recolectando lista de archivos desde R2...")
    let filterSkipped = 0
    const keysToProcess = []
    let continuationToken = null
    const firstCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        Prefix: R2_PREFIX,
        ...(START_AFTER ? { StartAfter: START_AFTER } : {}),
    })

    outer: do {
        const response = await s3Client.send(
            continuationToken
                ? new ListObjectsV2Command({
                      Bucket: process.env.R2_BUCKET,
                      Prefix: R2_PREFIX,
                      ContinuationToken: continuationToken,
                  })
                : firstCommand
        )

        if (!response.Contents || response.Contents.length === 0) break

        for (const obj of response.Contents) {
            const key = obj.Key
            const fileType = getFileType(key)

            if (fileType === "unsupported") { filterSkipped++; continue }

            const parts = key.split("/").filter(Boolean)
            if (parts.length < 2 || !parts[0]) { filterSkipped++; continue }

            keysToProcess.push(key)
            if (keysToProcess.length >= LIMIT) break outer
        }

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    console.log(`→ ${keysToProcess.length} archivos para procesar, ${filterSkipped} omitidos por tipo/estructura`)

    if (keysToProcess.length === 0) {
        console.log("Nada que procesar.")
        return
    }

    // ── Fase 2: procesar en paralelo con pool de workers ─────────────────────
    console.log(`\nFase 2: procesando con ${CONCURRENCY} workers en paralelo...\n`)
    let totalProcessed = 0
    let totalErrors = 0

    const processKey = async (key) => {
        const fileType = getFileType(key)
        const parts = key.split("/").filter(Boolean)
        const label = parts[0]
        const signType = label.length === 1 ? "letter" : "word"

        try {
            const signResult = await pool.query(
                `INSERT INTO signs (label, type)
                 VALUES ($1, $2)
                 ON CONFLICT (label, type) DO UPDATE SET label = EXCLUDED.label
                 RETURNING id`,
                [label, signType]
            )
            const signId = signResult.rows[0].id

            const datasetResult = await pool.query(
                `INSERT INTO datasets (sign_id, file_url, file_type)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (sign_id, file_url) DO UPDATE SET file_type = EXCLUDED.file_type
                 RETURNING id`,
                [signId, `${process.env.R2_PUBLIC_URL}/${key}`, fileType]
            )
            const datasetId = datasetResult.rows[0].id

            const tempExtension = path.extname(key) || (fileType === "video" ? ".mp4" : ".jpg")
            const tempFile = path.join(
                os.tmpdir(),
                `bkfill_${Date.now()}_${Math.random().toString(36).slice(2)}${tempExtension}`
            )

            const buffer = await downloadFromR2(key)
            fs.writeFileSync(tempFile, buffer)

            let extraction
            try {
                extraction =
                    fileType === "image"
                        ? await runExtractor(IMAGE_EXTRACTOR_SCRIPT, tempFile)
                        : await runExtractor(VIDEO_EXTRACTOR_SCRIPT, tempFile)
            } finally {
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile)
            }

            if (!extraction || !extraction.success) {
                console.warn(`⚠ Sin extracción en ${key}: ${extraction?.error || "UNKNOWN_ERROR"}`)
                totalErrors++
                return
            }

            await clearDatasetArtifacts(datasetId)

            if (fileType === "image") {
                await pool.query(
                    `INSERT INTO landmarks (dataset_id, points)
                     VALUES ($1, $2)`,
                    [datasetId, JSON.stringify(extraction.landmarks)]
                )
            }

            await saveFeaturesIfAvailable(datasetId, extraction.features, key)

            totalProcessed++
            console.log(`✓ [${totalProcessed + totalErrors}/${keysToProcess.length}] ${key}`)
        } catch (error) {
            totalErrors++
            console.error(`✗ [${totalProcessed + totalErrors}/${keysToProcess.length}] ${key}: ${error.message}`)
        }
    }

    // Worker pool: cada worker toma keys del queue hasta vaciarlo
    const queue = [...keysToProcess]
    const worker = async () => {
        while (queue.length > 0) {
            const key = queue.shift()
            if (key !== undefined) await processKey(key)
        }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, keysToProcess.length) }, worker))

    const lastKey = keysToProcess.at(-1)
    console.log(`\nBackfill completado:`)
    console.log(`- Procesados OK:           ${totalProcessed}`)
    console.log(`- Errores/sin extracción:  ${totalErrors}`)
    console.log(`- Filtrados (tipo/struct):  ${filterSkipped}`)

    if (keysToProcess.length >= LIMIT && lastKey) {
        console.log(`\n→ Límite alcanzado. Para continuar desde aquí:`)
        console.log(`  node src/IA/db/backfillFromR2.js --start-after "${lastKey}" --limit ${LIMIT}`)
    }
}

backfillFromR2()
    .catch((error) => {
        console.error("Error en backfill:", error.message)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
