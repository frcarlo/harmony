export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityId = query.entityId as string
  if (!entityId) throw createError({ statusCode: 400, message: 'entityId required' })

  const base = query.date ? new Date(query.date as string) : new Date()
  const days = Math.min(parseInt(query.days as string ?? '1') || 1, 31)
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate()).toISOString()
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days).toISOString()

  return getHACalendarEvents(entityId, start, end)
})
