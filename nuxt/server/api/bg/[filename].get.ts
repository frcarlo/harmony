import { createReadStream, existsSync } from 'node:fs'
import { join, basename } from 'node:path'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const filename = getRouterParam(event, 'filename')!

  // Prevent path traversal
  if (filename.includes('/') || filename.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid filename' })
  }

  const filePath = join(config.dataDir ?? '/app/data', 'backgrounds', basename(filename))
  if (!existsSync(filePath)) throw createError({ statusCode: 404, message: 'Not found' })

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg'
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
  }
  setResponseHeader(event, 'Content-Type', mimeMap[ext] ?? 'application/octet-stream')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(filePath))
})
