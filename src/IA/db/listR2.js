import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3"
import dotenv from "dotenv"

dotenv.config()

const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY
    }
})

const listObjects = async () => {
    console.log("Listando objetos en R2...")
    
    try {
        const response = await s3.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET,
            MaxKeys: 1000
        }))

        if (!response.Contents || response.Contents.length === 0) {
            console.log("⚠️ Bucket vacío")
            return
        }

        console.log(`\n📦 Total de objetos: ${response.Contents.length}\n`)
        
        response.Contents.forEach(obj => {
            console.log(`  ${obj.Key} (${(obj.Size / 1024).toFixed(2)} KB)`)
        })

        // Group by folder
        const folders = new Map()
        response.Contents.forEach(obj => {
            const parts = obj.Key.split("/")
            const folder = parts[0]
            if (!folders.has(folder)) {
                folders.set(folder, [])
            }
            folders.get(folder).push(obj)
        })

        console.log("\n📂 Carpetas encontradas:")
        folders.forEach((items, folder) => {
            console.log(`  ${folder}/: ${items.length} archivos`)
        })

    } catch (error) {
        console.error("❌ Error:", error.message)
    }
}

listObjects()
