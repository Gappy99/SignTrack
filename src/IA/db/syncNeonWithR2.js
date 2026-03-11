import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3"
import dotenv from "dotenv"
import pool from "./database.js"

dotenv.config()

const s3Client = new S3Client({
    endpoint: process.env.R2_ENDPOINT,
    region: "auto",
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
})

/**
 * Obtiene todas las URLs públicas de los objetos que existen actualmente en R2.
 * Maneja paginación para buckets con más de 1000 objetos.
 */
const getAllR2Urls = async () => {
    const existingUrls = new Set()
    let continuationToken = null

    do {
        const command = new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET,
            ...(continuationToken && { ContinuationToken: continuationToken }),
        })

        const response = await s3Client.send(command)

        if (response.Contents) {
            for (const obj of response.Contents) {
                existingUrls.add(`${process.env.R2_PUBLIC_URL}/${obj.Key}`)
            }
        }

        continuationToken = response.NextContinuationToken
    } while (continuationToken)

    return existingUrls
}

const syncNeonWithR2 = async (dryRun = false) => {
    if (dryRun) {
        console.log("🔍 MODO CONSULTA (dry-run) — no se eliminará nada\n")
    } else {
        console.log("Iniciando sincronización Neon ↔ R2...\n")
    }

    // 1. Obtener todas las URLs existentes en R2
    console.log("Listando objetos en R2...")
    const r2Urls = await getAllR2Urls()
    console.log(`  → ${r2Urls.size} objetos encontrados en R2\n`)

    // 2. Obtener todos los registros de datasets en Neon
    console.log("Consultando tabla datasets en Neon...")
    const { rows: datasets } = await pool.query(
        `SELECT id, file_url FROM datasets ORDER BY id`
    )
    console.log(`  → ${datasets.length} registros encontrados en Neon\n`)

    // 3. Detectar registros huérfanos (URL no existe en R2)
    const orphans = datasets.filter((row) => !r2Urls.has(row.file_url))

    if (orphans.length === 0) {
        console.log("✅ Neon está sincronizado con R2. No hay registros huérfanos.")
        return
    }

    console.log(`⚠️  Se encontraron ${orphans.length} registros huérfanos:`)
    orphans.forEach((row) => console.log(`   [id=${row.id}] ${row.file_url}`))

    if (dryRun) {
        console.log("\n✅ Consulta finalizada. Ejecuta sin --dry-run para eliminarlos.")
        return
    }

    // 4. Eliminar registros huérfanos (CASCADE borra landmarks y features)
    console.log("\nEliminando registros huérfanos de Neon...")
    const orphanIds = orphans.map((row) => row.id)

    const result = await pool.query(
        `DELETE FROM datasets WHERE id = ANY($1::bigint[]) RETURNING id`,
        [orphanIds]
    )

    console.log(`\n✅ Sincronización completada:`)
    console.log(`   - Registros eliminados de datasets: ${result.rowCount}`)
    console.log(`   - landmarks y features eliminados en cascada automáticamente`)
}

const dryRun = process.argv.includes("--dry-run")

syncNeonWithR2(dryRun)
    .catch((error) => {
        console.error("❌ Error en la sincronización:", error.message)
        process.exitCode = 1
    })
    .finally(async () => {
        await pool.end()
    })
