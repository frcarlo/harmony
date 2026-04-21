export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityId = query.entityId as string
  if (!entityId) throw createError({ statusCode: 400, message: 'entityId required' })
  const start = query.start as string
  const end = query.end as string
  if (!start || !end) throw createError({ statusCode: 400, message: 'start and end required' })
  return getHACalendarEvents(entityId, start, end)
})
