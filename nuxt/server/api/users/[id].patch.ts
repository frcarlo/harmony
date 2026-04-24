import { updateUserRole, getUserById, listUsers, updateUserDefaultDashboard, getDashboard } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ role?: 'admin' | 'user'; default_dashboard_id?: string | null }>(event)

  if (body.role != null) {
    const role = body.role
    if (!['admin', 'user'].includes(role)) throw createError({ statusCode: 400, statusMessage: 'Invalid role' })

    if (role === 'user') {
      const target = getUserById(id)
      if (target?.role === 'admin') {
        const adminCount = listUsers().filter((u) => u.role === 'admin').length
        if (adminCount <= 1) throw createError({ statusCode: 409, statusMessage: 'Cannot remove the last admin' })
      }
    }

    if (!updateUserRole(id, role)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    const target = getUserById(id)
    addAuditLog({ user_id: user.id, username: user.username, action: 'user.role_change', target: target?.username, detail: `→ ${role}` })
  }

  if (body.default_dashboard_id !== undefined) {
    if (body.default_dashboard_id && !getDashboard(body.default_dashboard_id)) {
      throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
    }
    if (!updateUserDefaultDashboard(id, body.default_dashboard_id ?? null)) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    const target = getUserById(id)
    addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'user.default_dashboard_change',
      target: target?.username,
      detail: body.default_dashboard_id ?? 'cleared',
    })
  }

  return { ok: true }
})
