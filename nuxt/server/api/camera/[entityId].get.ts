export default defineEventHandler(async (event) => {
  const entityId = getRouterParam(event, 'entityId')!
  const haResponse = await getCameraSnapshot(entityId)

  if (!haResponse.ok) {
    throw createError({ statusCode: haResponse.status, message: 'Camera unavailable' })
  }

  const contentType = haResponse.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await haResponse.arrayBuffer()

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return new Uint8Array(buffer)
})
