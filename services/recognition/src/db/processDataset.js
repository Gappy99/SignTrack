import fs from "fs"
import path from "path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "url"
import pool from "./database.js"
import Uploader from "../storage/uploader.js"
import dotenv from "dotenv"

dotenv.config()

const uploader = new Uploader(
    process.env.R2_ACCESS_KEY,
    process.env.R2_SECRET_KEY,
    process.env.R2_ENDPOINT,
    process.env.R2_BUCKET,
    process.env.R2_PUBLIC_URL
)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATASET_PATH = path.resolve(__dirname, "..", "dataset")
const EXTRACTOR_SCRIPT_PATH = path.resolve(__dirname, "..", "recognition", "extract_from_image.py")
const WORD_EXTRACTOR_SCRIPT_PATH = path.resolve(__dirname, "..", "words", "video_feature_extractor.py")
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python"

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".avi", ".mkv", ".webm"])

const getFileType = (fileName) => {
    const extension = path.extname(fileName).toLowerCase()
    if (IMAGE_EXTENSIONS.has(extension)) return "image"
    if (VIDEO_EXTENSIONS.has(extension)) return "video"
    return "unsupported"
}

const runImageExtractor = (imagePath) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [EXTRACTOR_SCRIPT_PATH, imagePath], {
            stdio: ["ignore", "pipe", "pipe"]
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
                const result = JSON.parse(stdout.trim())
                resolve(result)
            } catch {
                reject(new Error(`Invalid extractor JSON response: ${stdout}`))
            }
        })
    })

const runVideoExtractor = (videoPath) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [WORD_EXTRACTOR_SCRIPT_PATH, videoPath], {
            stdio: ["ignore", "pipe", "pipe"]
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
                reject(new Error(`Video extractor error (${code}): ${stderr || stdout}`))
                return
            }

            try {
                const result = JSON.parse(stdout.trim())
                resolve(result)
            } catch {
                reject(new Error(`Invalid video extractor JSON response: ${stdout}`))
            }
        })
    })

const saveFeaturesIfAvailable = async (datasetId, features) => {
    try {
        await pool.query(
            `INSERT INTO features (dataset_id, vector)
             VALUES ($1,$2)`,
            [datasetId, JSON.stringify(features)]
        )
    } catch (error) {
        console.warn(`No se pudo guardar features para dataset ${datasetId}: ${error.message}`)
    }
}

const clearDatasetArtifacts = async (datasetId) => {
    await pool.query(
        `DELETE FROM landmarks
         WHERE dataset_id = $1`,
        [datasetId]
    )
    await pool.query(
        `DELETE FROM features
         WHERE dataset_id = $1`,
        [datasetId]
    )
}

async function processDataset() {

    const folders = fs.readdirSync(DATASET_PATH)

    for (const folder of folders) {
        const folderPath = path.join(DATASET_PATH, folder)
        if (!fs.statSync(folderPath).isDirectory()) {
            console.warn(`Entrada omitida (no es carpeta de etiqueta): ${folder}`)
            continue
        }

        const label = folder
        const type = label.length === 1 ? "letter" : "word"

        const signResult = await pool.query(
            `INSERT INTO signs (label, type)
             VALUES ($1,$2)
             ON CONFLICT (label, type)
             DO UPDATE SET label = EXCLUDED.label
             RETURNING id`,
            [label, type]
        )

        const signId = signResult.rows[0].id

        const files = fs.readdirSync(folderPath)

        for (const file of files) {
            const fileType = getFileType(file)
            if (fileType === "unsupported") {
                console.warn(`Archivo omitido por tipo no soportado: ${file}`)
                continue
            }

            const localPath = path.join(folderPath, file)
            const remotePath = `dataset/${label}/${file}`

            let extractionResult
            try {
                extractionResult =
                    fileType === "image"
                        ? await runImageExtractor(localPath)
                        : await runVideoExtractor(localPath)
            } catch (error) {
                console.error(`No se pudo extraer datos de ${file}: ${error.message}`)
                continue
            }

            if (!extractionResult.success) {
                console.warn(`No se detecto mano en ${file}: ${extractionResult.error}`)
                continue
            }

            const url = await uploader.uploadFile(localPath, remotePath)

            if (!url) continue

            const datasetResult = await pool.query(
                `INSERT INTO datasets (sign_id,file_url,file_type)
                 VALUES ($1,$2,$3)
                 ON CONFLICT (sign_id, file_url)
                 DO UPDATE SET file_type = EXCLUDED.file_type
                 RETURNING id`,
                [signId, url, fileType]
            )

            const datasetId = datasetResult.rows[0].id

            await clearDatasetArtifacts(datasetId)

            if (fileType === "image") {
                const landmarks = extractionResult.landmarks

                await pool.query(
                    `INSERT INTO landmarks (dataset_id,points)
                     VALUES ($1,$2)`,
                    [datasetId, JSON.stringify(landmarks)]
                )
            }

            await saveFeaturesIfAvailable(datasetId, extractionResult.features)

            console.log("Procesado:", file)
        }
    }

    console.log("Dataset procesado completamente")
}

processDataset()