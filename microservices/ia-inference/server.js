import express from "express"
import path from "path"
import fs from "fs"
import { spawn } from "node:child_process"
import { fileURLToPath } from "url"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, "..", "..")

const PREDICT_LETTER_SCRIPT = path.resolve(PROJECT_ROOT, "src", "IA", "recognition", "predict_letter.py")
const PREDICT_WORD_SCRIPT = path.resolve(PROJECT_ROOT, "src", "IA", "words", "predict_word.py")
const FEATURE_SERVICE_URL = process.env.IA_FEATURE_SERVICE_URL || "http://localhost:3102"
const PORT = Number(process.env.IA_INFERENCE_PORT || 3101)

const configuredPython = (process.env.PYTHON_EXECUTABLE || "").trim()
const fallbackPython = path.resolve(PROJECT_ROOT, ".venv", "Scripts", "python.exe")
const PYTHON_EXECUTABLE = configuredPython || (fs.existsSync(fallbackPython) ? fallbackPython : "python")

app.use(express.json({ limit: "10mb" }))

const runPythonJson = (scriptPath, args = []) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [scriptPath, ...args], {
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
            reject(new Error(`Failed to execute Python process: ${error.message}`))
        })

        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(stderr || stdout || `Process exited with code ${code}`))
                return
            }

            try {
                resolve(JSON.parse(stdout.trim()))
            } catch {
                reject(new Error(`Invalid JSON from script ${scriptPath}: ${stdout}`))
            }
        })
    })

const fetchFeatures = async (endpoint, payload) => {
    const response = await fetch(`${FEATURE_SERVICE_URL}${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
    })

    const body = await response.json()
    if (!response.ok || !body?.success) {
        const error = body?.error || body?.message || `Feature extraction failed (${response.status})`
        throw new Error(error)
    }

    return body
}

app.post("/predict-letter", async (req, res) => {
    const { features, imagePath } = req.body || {}

    if (!Array.isArray(features) && (!imagePath || typeof imagePath !== "string")) {
        return res.status(400).json({
            success: false,
            message: "Provide either features (array) or imagePath (string)"
        })
    }

    try {
        const finalFeatures = Array.isArray(features)
            ? features
            : (await fetchFeatures("/extract/image", { imagePath })).features

        const result = await runPythonJson(PREDICT_LETTER_SCRIPT, [
            "--features-json",
            JSON.stringify(finalFeatures)
        ])

        return res.status(result.success ? 200 : 422).json(result)
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Prediction failed",
            error: error.message
        })
    }
})

app.post("/predict-word", async (req, res) => {
    const { features, videoPath } = req.body || {}

    if (!Array.isArray(features) && (!videoPath || typeof videoPath !== "string")) {
        return res.status(400).json({
            success: false,
            message: "Provide either features (array) or videoPath (string)"
        })
    }

    try {
        const finalFeatures = Array.isArray(features)
            ? features
            : (await fetchFeatures("/extract/video", { videoPath })).features

        const result = await runPythonJson(PREDICT_WORD_SCRIPT, [
            "--features-json",
            JSON.stringify(finalFeatures)
        ])

        return res.status(result.success ? 200 : 422).json(result)
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Word prediction failed",
            error: error.message
        })
    }
})

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "ia-inference-service",
        pythonExecutable: PYTHON_EXECUTABLE
    })
})

app.listen(PORT, () => {
    console.log(`IA inference service listening on ${PORT}`)
})
