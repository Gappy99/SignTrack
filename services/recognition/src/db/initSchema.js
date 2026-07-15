import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import pool from "./database.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.resolve(__dirname, "schema.sql")

async function initSchema() {
    try {
        const sql = fs.readFileSync(schemaPath, "utf8")
        await pool.query(sql)
        console.log("Esquema IA creado/verificado correctamente")
    } catch (error) {
        console.error("Error inicializando esquema IA:", error.message)
        process.exitCode = 1
    } finally {
        await pool.end()
    }
}

initSchema()
