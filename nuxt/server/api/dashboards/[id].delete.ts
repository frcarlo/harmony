export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const existing = getDashboard(id)
  const deleted = deleteDashboard(id)
  if (!deleted) throw createError({ statusCode: 404, message: 'Not found' })
  addAuditLog({ user_id: user.id, username: user.username, action: 'dashboard.delete', target: existing?.name ?? id })
  return { success: true }
})
