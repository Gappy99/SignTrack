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
const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python"

app.use(express.json({ limit: "3mb" }))

const runPythonPrediction = ({ features, imagePath }) =>
    new Promise((resolve, reject) => {
        const args = [PREDICT_SCRIPT]

        if (Array.isArray(features)) {
            args.push("--features-json", JSON.stringify(features))
        }

        if (typeof imagePath === "string" && imagePath.trim().length > 0) {
            args.push("--image-path", imagePath)
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
                reject(new Error(stderr || stdout || `Predictor exited with code ${code}`))
                return
            }

            try {
                resolve(JSON.parse(stdout.trim()))
            } catch {
                reject(new Error(`Invalid predictor response: ${stdout}`))
            }
        })
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
    let { features, imagePath, imageBase64 } = req.body
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

        const result = await runPythonPrediction({ features, imagePath })

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

app.post("/translate", (req, res) => {

    const sign = req.body.sign || ""

    res.json({
        text: String(sign).trim()
    })

})

app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, service: "SignTrack.Recognition" })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`SignTrack.Recognition API running on http://localhost:${PORT}`)
})
