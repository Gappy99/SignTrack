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
const PORT = Number(process.env.IA_TRANSLATION_PORT || 3103)

const TRANSLATION_SCRIPT = path.resolve(PROJECT_ROOT, "src", "IA", "translation", "run_translation.py")

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
                reject(new Error(`Invalid JSON from translation script: ${stdout}`))
            }
        })
    })

app.post("/translate", async (req, res) => {
    const sign = typeof req.body?.sign === "string" ? req.body.sign : ""
    const coherent = req.body?.coherent !== false

    try {
        const args = ["--sign", sign]
        if (coherent) {
            args.push("--coherent")
        }

        const result = await runPythonJson(TRANSLATION_SCRIPT, args)
        return res.status(result.success ? 200 : 422).json(result)
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Translation failed",
            error: error.message
        })
    }
})

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "ia-translation-service",
        pythonExecutable: PYTHON_EXECUTABLE
    })
})

app.listen(PORT, () => {
    console.log(`IA translation service listening on ${PORT}`)
})
