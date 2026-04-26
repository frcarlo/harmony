import { getHAHistory, getHAStatistics, downsampleHistory } from '~/server/utils/ha-api'

const MAX_POINTS: Record<string, number> = {
  '1h': 300, '6h': 400, '24h': 500, '7d': 500, '30d': 720,
}

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
  const maxPoints = MAX_POINTS[period] ?? 500

  if (period === '30d') {
    const stats = await getHAStatistics(entityId, startTime, 'hour')
    if (stats.length > 0) return downsampleHistory(stats, maxPoints)
  }

  const data = await getHAHistory(entityId, startTime)
  const raw = (Array.isArray(data) ? (data as unknown[]).flat() : []) as Array<{ last_changed: string; state: string }>
  return downsampleHistory(raw, maxPoints)
})
