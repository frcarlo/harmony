export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const existing = getDashboard(id)
  if (!existing) throw createError({ statusCode: 404, message: 'Not found' })

  const body = await readBody(event)
  saveDashboard({ ...existing, ...body, id })
  addAuditLog({ user_id: user.id, username: user.username, action: 'dashboard.save', target: existing.name })
  return getDashboard(id)
})
