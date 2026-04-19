export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityId = query.entityId as string
  const period = (query.period as string) ?? '24h'

  if (!entityId) throw createError({ statusCode: 400, message: 'entityId required' })

  const periodMap: Record<string, number> = {
    '1h': 1, '6h': 6, '12h': 12, '24h': 24, '7d': 168, '30d': 720,
  }
  const match = period.match(/^(\d+)h$/)
  const hours = periodMap[period] ?? (match ? parseInt(match[1]) : 24)
  const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const data = await getHAHistory(entityId, startTime)
  const entityHistory = Array.isArray(data) ? (data as unknown[]).flat() : []
  return entityHistory
})
