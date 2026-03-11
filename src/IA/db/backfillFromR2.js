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
const EXTRACTOR_SCRIPT = path.resolve(__dirname, "..", "recognition", "extract_from_image.py")
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python"

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

const extractLandmarksFromBuffer = (buffer, imagePath) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [EXTRACTOR_SCRIPT, imagePath], {
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

const backfillFromR2 = async () => {
    console.log("Iniciando backfill de landmarks desde R2 a Neon...")

    const listCommand = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        Prefix: "Letra Z/",
    })

    let continuationToken = null
    let totalProcessed = 0
    let totalSkipped = 0

    do {
        const response = await s3Client.send(
            continuationToken
                ? new ListObjectsV2Command({
                      Bucket: process.env.R2_BUCKET,
                      Prefix: "Letra Z/",
                      ContinuationToken: continuationToken,
                  })
                : listCommand
        )

        if (!response.Contents || response.Contents.length === 0) {
            console.log("No hay objetos en R2 con prefix Letra Z/")
            break
        }

        for (const obj of response.Contents) {
            const key = obj.Key

            if (!key.match(/\.(jpg|jpeg|png|bmp|webp)$/i)) {
                console.warn(`Omitiendo (tipo no soportado): ${key}`)
                totalSkipped++
                continue
            }

            const parts = key.split("/")
            if (parts.length < 3) {
                console.warn(`Omitiendo (estructura invalida): ${key}`)
                totalSkipped++
                continue
            }

            const label = parts[1]

            if (label.length !== 1) {
                console.warn(`Omitiendo (no es letra): ${key}`)
                totalSkipped++
                continue
            }

            try {
                console.log(`Procesando: ${key}`)

                const signResult = await pool.query(
                    `INSERT INTO signs (label, type)
                     VALUES ($1, $2)
                     ON CONFLICT (label, type) DO UPDATE SET label = EXCLUDED.label
                     RETURNING id`,
                    [label, "letter"]
                )

                const signId = signResult.rows[0].id

                const datasetResult = await pool.query(
                    `INSERT INTO datasets (sign_id, file_url, file_type)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (sign_id, file_url) DO UPDATE SET file_type = EXCLUDED.file_type
                     RETURNING id`,
                    [signId, `${process.env.R2_PUBLIC_URL}/${key}`, "image"]
                )

                const datasetId = datasetResult.rows[0].id

                const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.jpg`)

                const buffer = await downloadFromR2(key)
                fs.writeFileSync(tempFile, buffer)

                const extraction = await extractLandmarksFromBuffer(buffer, tempFile)

                fs.unlinkSync(tempFile)

                if (!extraction.success) {
                    console.warn(`No landmarks detectados en ${key}: ${extraction.error}`)
                    totalSkipped++
                    continue
                }

                await pool.query(
                    `INSERT INTO landmarks (dataset_id, points)
                     VALUES ($1, $2)`,
                    [datasetId, JSON.stringify(extraction.landmarks)]
                )

                if (extraction.features && Array.isArray(extraction.features)) {
                    try {
                        await pool.query(
                            `INSERT INTO features (dataset_id, vector)
                             VALUES ($1, $2)`,
                            [datasetId, JSON.stringify(extraction.features)]
                        )
                    } catch (featureError) {
                        console.warn(`No se guardaron features para ${key}: ${featureError.message}`)
                    }
                }

                console.log(`✓ Procesado: ${key}`)
                totalProcessed++
            } catch (error) {
                console.error(`✗ Error procesando ${key}: ${error.message}`)
                totalSkipped++
            }
        }

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    console.log(`\nBackfill completado:`)
    console.log(`- Procesados: ${totalProcessed}`)
    console.log(`- Omitidos/Errores: ${totalSkipped}`)
}

backfillFromR2()
    .catch((error) => {
        console.error("Error en backfill:", error.message)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
