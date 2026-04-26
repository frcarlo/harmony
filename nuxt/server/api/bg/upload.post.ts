import { randomBytes } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const bgDir = join(config.dataDir ?? '/app/data', 'backgrounds')
  mkdirSync(bgDir, { recursive: true })

  const form = await readMultipartFormData(event)
  const file = form?.find(f => f.name === 'file')
  if (!file?.data || !file.type) throw createError({ statusCode: 400, message: 'No file provided' })
  if (!ALLOWED_TYPES.includes(file.type)) throw createError({ statusCode: 400, message: 'Unsupported file type' })
  if (file.data.length > MAX_SIZE) throw createError({ statusCode: 413, message: 'File too large (max 10 MB)' })

  const ext = extname(file.filename ?? '') || '.' + file.type.split('/')[1]
  const filename = randomBytes(12).toString('hex') + ext
  writeFileSync(join(bgDir, filename), file.data)

  return { url: `/api/bg/${filename}` }
})
