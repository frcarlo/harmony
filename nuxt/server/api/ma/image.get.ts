import { getServerConfig } from '~/server/utils/config'

function getMaBaseUrl(config: ReturnType<typeof getServerConfig>): string {
  const explicit = config.maUrl as string | undefined
  if (explicit) return explicit
  try {
    const u = new URL((config.haUrl as string) || 'http://homeassistant.local:8123')
    u.port = '8095'
    u.pathname = ''
    return u.origin
  } catch {
    return 'http://homeassistant.local:8095'
  }
}

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event) as { path?: string }
  if (!path) throw createError({ statusCode: 400, statusMessage: 'path required' })

  const config = getServerConfig()
  const token = config.maToken as string | undefined

  const imageUrl = path.startsWith('http') ? path : `${getMaBaseUrl(config)}${path}`

  const headers: Record<string, string> = { Accept: 'image/*' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(imageUrl, { headers, signal: AbortSignal.timeout(8000) })
  } catch {
    throw createError({ statusCode: 502 })
  }

  if (!res.ok) throw createError({ statusCode: res.status })

  const contentType = res.headers.get('content-type') ?? 'image/jpeg'
  setHeader(event, 'content-type', contentType)
  setHeader(event, 'cache-control', 'public, max-age=86400, immutable')

  // Read body as buffer — more reliable than streaming in Nitro
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
})
