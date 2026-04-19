export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readBody(event)
  if (!body?.name || typeof body.name !== 'string') {
    throw createError({ statusCode: 400, message: 'name required' })
  }
  const dashboard = createDashboard({ name: body.name, icon: body.icon })
  addAuditLog({ user_id: user.id, username: user.username, action: 'dashboard.create', target: dashboard.name })
  return dashboard
})
