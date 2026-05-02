import express from "express"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = Number(process.env.IA_GATEWAY_PORT || 3000)
const IA_INFERENCE_URL = process.env.IA_INFERENCE_URL || "http://localhost:3101"
const IA_TRANSLATION_URL = process.env.IA_TRANSLATION_URL || "http://localhost:3103"

app.use(express.json({ limit: "10mb" }))

const proxyPost = async (url, payload) => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload || {})
    })

    const body = await response.json()
    return {
        status: response.status,
        body
    }
}

app.post("/predict-letter", async (req, res) => {
    try {
        const proxied = await proxyPost(`${IA_INFERENCE_URL}/predict-letter`, req.body)
        return res.status(proxied.status).json(proxied.body)
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: "Inference service unavailable",
            error: error.message
        })
    }
})

app.post("/predict-word", async (req, res) => {
    try {
        const proxied = await proxyPost(`${IA_INFERENCE_URL}/predict-word`, req.body)
        return res.status(proxied.status).json(proxied.body)
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: "Inference service unavailable",
            error: error.message
        })
    }
})

app.post("/translate", async (req, res) => {
    try {
        const proxied = await proxyPost(`${IA_TRANSLATION_URL}/translate`, req.body)
        return res.status(proxied.status).json(proxied.body)
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: "Translation service unavailable",
            error: error.message
        })
    }
})

app.get("/health", async (_req, res) => {
    const checks = {
        gateway: "ok",
        inference: "down",
        translation: "down"
    }

    try {
        const inferenceHealth = await fetch(`${IA_INFERENCE_URL}/health`)
        if (inferenceHealth.ok) checks.inference = "ok"
    } catch {
        checks.inference = "down"
    }

    try {
        const translationHealth = await fetch(`${IA_TRANSLATION_URL}/health`)
        if (translationHealth.ok) checks.translation = "ok"
    } catch {
        checks.translation = "down"
    }

    const success = checks.inference === "ok" && checks.translation === "ok"
    res.status(success ? 200 : 503).json({
        success,
        service: "ia-api-gateway",
        checks
    })
})

app.listen(PORT, () => {
    console.log(`IA gateway running on port ${PORT}`)
})