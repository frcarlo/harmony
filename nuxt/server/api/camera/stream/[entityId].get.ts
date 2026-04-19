export default defineEventHandler(async (event) => {
  const entityId = getRouterParam(event, 'entityId')!
  const config = useRuntimeConfig()
  const haUrl = config.haUrl ?? 'http://localhost:8123'
  const haToken = config.haToken

  const url = `${haUrl}/api/camera_proxy_stream/${entityId}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${haToken}` },
  })

  if (!response.ok || !response.body) {
    throw createError({ statusCode: response.status, message: 'Stream unavailable' })
  }

  const contentType = response.headers.get('content-type') ?? 'multipart/x-mixed-replace; boundary=--frameboundary'
  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Accel-Buffering', 'no')

  return sendStream(event, response.body)
})
