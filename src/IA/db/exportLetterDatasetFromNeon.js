import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "./database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const OUTPUT_CSV_PATH = path.resolve(__dirname, "..", "dataset", "sign_dataset.csv")
const EXPECTED_FEATURE_COUNT = 18

const toNumberArray = (value) => {
    if (Array.isArray(value)) return value.map(Number)
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) return parsed.map(Number)
        } catch {
            return null
        }
    }
    return null
}

async function exportLetterDatasetFromNeon() {
    const query = `
        SELECT
            s.label,
            f.vector
        FROM features f
        INNER JOIN datasets d ON d.id = f.dataset_id
        INNER JOIN signs s ON s.id = d.sign_id
        WHERE s.type = 'letter'
                    AND d.file_type = 'image'
        ORDER BY s.label, d.id
    `

    const result = await pool.query(query)

    if (!result.rows.length) {
        console.log("No hay registros de letras con features en Neon.")
        console.log("Asegurate de tener datos en signs/datasets/features.")
        return
    }

    const parsedRows = []
    for (const row of result.rows) {
        const vector = toNumberArray(row.vector)
        if (!vector || !vector.length || vector.some((n) => Number.isNaN(n))) {
            console.warn(`Fila omitida por vector invalido para label ${row.label}`)
            continue
        }

        if (vector.length !== EXPECTED_FEATURE_COUNT) {
            console.warn(
                `Fila omitida para label ${row.label}: se esperaban ${EXPECTED_FEATURE_COUNT} features y llegaron ${vector.length}`
            )
            continue
        }

        parsedRows.push({ label: row.label, vector })
    }

    if (!parsedRows.length) {
        console.log("No se pudo construir dataset: todos los vectores fueron invalidos.")
        return
    }

    const header = ["label", ...Array.from({ length: EXPECTED_FEATURE_COUNT }, (_, i) => `f${i + 1}`)]

    const lines = [header.join(",")]
    for (const row of parsedRows) {
        lines.push([row.label, ...row.vector].join(","))
    }

    fs.mkdirSync(path.dirname(OUTPUT_CSV_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_CSV_PATH, `${lines.join("\n")}\n`, "utf8")

    console.log(`CSV exportado: ${OUTPUT_CSV_PATH}`)
    console.log(`Muestras exportadas: ${parsedRows.length}`)
}

exportLetterDatasetFromNeon()
    .catch((error) => {
        console.error("Error exportando dataset desde Neon:", error.message)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
