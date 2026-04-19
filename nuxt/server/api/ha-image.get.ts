export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const imagePath = query.path as string
  if (!imagePath) throw createError({ statusCode: 400, message: 'path required' })

  const haResponse = await getHAImageProxy(imagePath)
  if (!haResponse.ok) throw createError({ statusCode: haResponse.status, message: 'Image unavailable' })

  const contentType = haResponse.headers.get('content-type') ?? 'image/jpeg'
  const buffer = await haResponse.arrayBuffer()

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return new Uint8Array(buffer)
})
