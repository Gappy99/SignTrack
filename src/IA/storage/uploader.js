import { readFile } from 'node:fs/promises'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import mime from 'mime-types'; 

class Uploader {
    constructor(accessKey, secretKey, endpointUrl, bucketName, publicUrl) {
        this.bucketName = bucketName
        this.publicUrl = publicUrl

        this.client = new S3Client({
            endpoint: endpointUrl,
            region: 'auto',
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey
            }
        })
    }

    async uploadFile(localPath, remotePath) {
        try {
            const body = await readFile(localPath)
            const cleanRemotePath = remotePath.replace(/^\/+/, '')

            const contentType = mime.lookup(localPath) || 'application/octet-stream'

            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: cleanRemotePath,
                    Body: body, 
                    ContentType: contentType
                })
            )

            const baseUrl = this.publicUrl.replace(/\/+$/, '')
            const url = `${baseUrl}/${cleanRemotePath}`

            console.log(`Archivo subido: ${url}`)
            return url
        } catch (error) {
            console.error('Error subiendo archivo:', error)
            return null
        }
    }
}

export default Uploader