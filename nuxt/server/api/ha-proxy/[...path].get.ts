export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const haUrl = config.haUrl ?? 'http://localhost:8123'
  const haToken = config.haToken

  const path = getRouterParam(event, 'path') ?? ''
  const query = getQuery(event)
  const queryStr = Object.keys(query).length
    ? '?' + new URLSearchParams(query as Record<string, string>).toString()
    : ''

  const url = `${haUrl}/${path}${queryStr}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${haToken}` },
  })

  if (!response.ok || !response.body) {
    throw createError({ statusCode: response.status, message: `HA proxy error: ${response.status}` })
  }

  const contentType = response.headers.get('content-type') ?? 'application/octet-stream'
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'Access-Control-Allow-Origin', '*')

  return sendStream(event, response.body)
})
