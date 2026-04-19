export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')!
  const dashboard = getDashboard(id)
  if (!dashboard) throw createError({ statusCode: 404, message: 'Not found' })
  return dashboard
})
