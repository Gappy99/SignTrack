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

const EXTRACT_IMAGE_SCRIPT = path.resolve(PROJECT_ROOT, "src", "IA", "recognition", "extract_from_image.py")
const EXTRACT_VIDEO_SCRIPT = path.resolve(PROJECT_ROOT, "src", "IA", "words", "video_feature_extractor.py")
const PORT = Number(process.env.IA_FEATURE_PORT || 3102)

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

app.post("/extract/image", async (req, res) => {
    const imagePath = req.body?.imagePath

    if (!imagePath || typeof imagePath !== "string") {
        return res.status(400).json({ success: false, message: "imagePath is required" })
    }

    try {
        const result = await runPythonJson(EXTRACT_IMAGE_SCRIPT, [imagePath])
        return res.status(result.success ? 200 : 422).json(result)
    } catch (error) {
        return res.status(500).json({ success: false, message: "Image extraction failed", error: error.message })
    }
})

app.post("/extract/video", async (req, res) => {
    const videoPath = req.body?.videoPath

    if (!videoPath || typeof videoPath !== "string") {
        return res.status(400).json({ success: false, message: "videoPath is required" })
    }

    try {
        const result = await runPythonJson(EXTRACT_VIDEO_SCRIPT, [videoPath])
        return res.status(result.success ? 200 : 422).json(result)
    } catch (error) {
        return res.status(500).json({ success: false, message: "Video extraction failed", error: error.message })
    }
})

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "ia-feature-extraction-service",
        pythonExecutable: PYTHON_EXECUTABLE
    })
})

app.listen(PORT, () => {
    console.log(`IA feature extraction service listening on ${PORT}`)
})
