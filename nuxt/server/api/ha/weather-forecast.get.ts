export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const entityId = query.entityId as string
  if (!entityId) throw createError({ statusCode: 400, message: 'entityId required' })
  return getWeatherForecast(entityId, 'daily')
})
