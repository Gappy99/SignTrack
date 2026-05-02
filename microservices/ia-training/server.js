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
const PORT = Number(process.env.IA_TRAINING_PORT || 3105)

const configuredPython = (process.env.PYTHON_EXECUTABLE || "").trim()
const fallbackPython = path.resolve(PROJECT_ROOT, ".venv", "Scripts", "python.exe")
const PYTHON_EXECUTABLE = configuredPython || (fs.existsSync(fallbackPython) ? fallbackPython : "python")

const SCRIPTS = {
    trainLetters: path.resolve(PROJECT_ROOT, "src", "IA", "model", "train_model.py"),
    trainWords: path.resolve(PROJECT_ROOT, "src", "IA", "words", "train_word_model.py"),
    evaluateLetters: path.resolve(PROJECT_ROOT, "src", "IA", "model", "evaluate_letters.py"),
    evaluateWords: path.resolve(PROJECT_ROOT, "src", "IA", "words", "evaluate_words.py")
}

app.use(express.json({ limit: "10mb" }))

const runPythonScript = (scriptPath) =>
    new Promise((resolve, reject) => {
        const child = spawn(PYTHON_EXECUTABLE, [scriptPath], {
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

            resolve({ stdout, stderr })
        })
    })

app.post("/train/letters", async (_req, res) => {
    try {
        const result = await runPythonScript(SCRIPTS.trainLetters)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Letter model training failed", error: error.message })
    }
})

app.post("/train/words", async (_req, res) => {
    try {
        const result = await runPythonScript(SCRIPTS.trainWords)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Word model training failed", error: error.message })
    }
})

app.post("/evaluate/letters", async (_req, res) => {
    try {
        const result = await runPythonScript(SCRIPTS.evaluateLetters)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Letter evaluation failed", error: error.message })
    }
})

app.post("/evaluate/words", async (_req, res) => {
    try {
        const result = await runPythonScript(SCRIPTS.evaluateWords)
        return res.status(200).json({ success: true, output: result.stdout })
    } catch (error) {
        return res.status(500).json({ success: false, message: "Word evaluation failed", error: error.message })
    }
})

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        service: "ia-training-service",
        pythonExecutable: PYTHON_EXECUTABLE
    })
})

app.listen(PORT, () => {
    console.log(`IA training service listening on ${PORT}`)
})
