import express from "express"
import path from "path"
import fs from "node:fs"
import os from "node:os"
import { randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PREDICT_SCRIPT = path.resolve(__dirname, "..", "recognition", "predict_letter.py")
const WORD_PREDICT_SCRIPT = path.resolve(__dirname, "..", "words", "predict_word.py")
const TRANSLATE_SCRIPT = path.resolve(__dirname, "..", "translation", "translate_cli.py")
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python"
const HYBRID_DEFAULT =
    String(process.env.GEMINI_HYBRID_ENABLED || "").trim().toLowerCase() === "true" ||
    String(process.env.GEMINI_HYBRID_ENABLED || "").trim() === "1"

app.use(express.json({ limit: "3mb" }))

const runPythonScript = (scriptPath, args) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [scriptPath, ...args], {
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
                reject(new Error(stderr || stdout || `Python exited with code ${code}`))
                return
            }

            try {
                resolve(JSON.parse(stdout.trim()))
            } catch {
                reject(new Error(`Invalid Python response: ${stdout}`))
            }
        })
    })

const runPythonPrediction = ({ features, imagePath, hybrid }) =>
    new Promise((resolve, reject) => {
        const args = []

        if (Array.isArray(features)) {
            args.push("--features-json", JSON.stringify(features))
        }

        if (typeof imagePath === "string" && imagePath.trim().length > 0) {
            args.push("--image-path", imagePath)
        }

        if (hybrid) {
            args.push("--hybrid")
        }

        runPythonScript(PREDICT_SCRIPT, args).then(resolve).catch(reject)
    })

const runPythonWordPrediction = ({ features, videoPath }) =>
    new Promise((resolve, reject) => {
        const args = [WORD_PREDICT_SCRIPT]

        if (Array.isArray(features)) {
            args.push("--features-json", JSON.stringify(features))
        }

        if (typeof videoPath === "string" && videoPath.trim().length > 0) {
            args.push("--video-path", videoPath)
        }

        const child = spawn(PYTHON_EXECUTABLE, args, {
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
                reject(new Error(stderr || stdout || `Word predictor exited with code ${code}`))
                return
            }

            try {
                resolve(JSON.parse(stdout.trim()))
            } catch {
                reject(new Error(`Invalid word predictor response: ${stdout}`))
            }
        })
    })

app.post("/predict-letter", async (req, res) => {
    let { features, imagePath, imageBase64, hybrid } = req.body
    const useHybrid = typeof hybrid === "boolean" ? hybrid : HYBRID_DEFAULT
    let tempFile = null

    if (!Array.isArray(features) && !imagePath && !imageBase64) {
        return res.status(400).json({
            success: false,
            message: "Provide features (array), imagePath (string) or imageBase64 (string)"
        })
    }

    try {
        if (typeof imageBase64 === "string" && imageBase64.trim().length > 0) {
            const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
            const buffer = Buffer.from(base64Data, "base64")
            tempFile = path.join(os.tmpdir(), `signtrack-${randomUUID()}.jpg`)
            fs.writeFileSync(tempFile, buffer)
            imagePath = tempFile
        }

        const result = await runPythonPrediction({ features, imagePath, hybrid: useHybrid })

        if (!result.success) {
            return res.status(422).json(result)
        }

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Prediction failed",
            error: error.message
        })
    } finally {
        if (tempFile && fs.existsSync(tempFile)) {
            try {
                fs.unlinkSync(tempFile)
            } catch {
                /* ignore */
            }
        }
    }
})

app.post("/predict-word", async (req, res) => {
    const { features, videoPath } = req.body

    if (!Array.isArray(features) && (!videoPath || typeof videoPath !== "string")) {
        return res.status(400).json({
            success: false,
            message: "Provide either features (array) or videoPath (string)"
        })
    }

    try {
        const result = await runPythonWordPrediction({ features, videoPath })

        if (!result.success) {
            return res.status(422).json(result)
        }

        return res.status(200).json(result)
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Word prediction failed",
            error: error.message
        })
    }
})

app.post("/translate", async (req, res) => {
    const rawText = String(req.body.sign || req.body.raw_text || "").trim()

    if (!rawText) {
        return res.status(400).json({
            success: false,
            message: "Provide sign or raw_text"
        })
    }

    try {
        const result = await runPythonScript(TRANSLATE_SCRIPT, ["--text", rawText])
        return res.status(200).json({
            success: true,
            text: result.text || rawText,
            provider: result.provider || "local",
            changes_applied: result.changes_applied || [],
            error: result.error || null
        })
    } catch (error) {
        return res.status(200).json({
            success: true,
            text: rawText,
            provider: "local",
            changes_applied: [],
            error: error.message
        })
    }
})

app.get("/health", (_req, res) => {
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && String(process.env.GEMINI_API_KEY).trim())
    res.status(200).json({
        success: true,
        service: "SignTrack.Recognition",
        hybrid_enabled: HYBRID_DEFAULT,
        gemini_configured: hasGemini
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`SignTrack.Recognition API running on http://localhost:${PORT}`)
})
