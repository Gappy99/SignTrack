import express from "express"
import path from "path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "..", "..")
const PORT = Number(process.env.IA_DATASET_PORT || 3104)

const SCRIPTS = {
    processDataset: path.resolve(PROJECT_ROOT, "src", "IA", "db", "processDataset.js"),
    backfillFromR2: path.resolve(PROJECT_ROOT, "src", "IA", "db", "backfillFromR2.js"),
    exportLetters: path.resolve(PROJECT_ROOT, "src", "IA", "db", "exportLetterDatasetFromNeon.js"),
    exportWords: path.resolve(PROJECT_ROOT, "src", "IA", "db", "exportWordDatasetFromNeon.js")
}

app.use(express.json({ limit: "10mb" }))

const runNodeScript = (scriptPath, args = []) =>
    new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...args], {
            cwd: PROJECT_ROOT,
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

        child.on("error", (error) => {
            reject(new Error(`Failed to execute node process: ${error.message}`))
        })

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(stderr || stdout || `Process exited with code ${code}`))
                return
            }

            resolve({ stdout, stderr })
        })
    })

app.post("/dataset/process", async (_req, res) => {
    try {
        const result = await runNodeScript(SCRIPTS.processDataset)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Dataset processing failed", error: error.message })
    }
})

app.post("/dataset/backfill", async (req, res) => {
    const { limit, startAfter, concurrency } = req.body || {}
    const args = []

    if (Number.isInteger(limit) && limit > 0) {
        args.push("--limit", String(limit))
    }

    if (typeof startAfter === "string" && startAfter.trim().length > 0) {
        args.push("--start-after", startAfter.trim())
    }

    if (Number.isInteger(concurrency) && concurrency > 0) {
        args.push("--concurrency", String(concurrency))
    }

    try {
        const result = await runNodeScript(SCRIPTS.backfillFromR2, args)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Backfill failed", error: error.message })
    }
})

app.post("/dataset/export/letters", async (_req, res) => {
    try {
        const result = await runNodeScript(SCRIPTS.exportLetters)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Letter export failed", error: error.message })
    }
})

app.post("/dataset/export/words", async (_req, res) => {
    try {
        const result = await runNodeScript(SCRIPTS.exportWords)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Word export failed", error: error.message })
    }
})

app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, service: "ia-dataset-service" })
})

app.listen(PORT, () => {
    console.log(`IA dataset service listening on ${PORT}`)
})
