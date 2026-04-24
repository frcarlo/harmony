import { getDashboard, listDashboards, updateUserPersonalDefaultDashboard } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ dashboardId?: string | null }>(event)
  const dashboardId = body.dashboardId ?? null

  if (dashboardId) {
    if (!getDashboard(dashboardId)) {
      throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
    }
    const visibleDashboards = listDashboards(user.id, user.role)
    if (!visibleDashboards.some(d => d.id === dashboardId)) {
      throw createError({ statusCode: 403, statusMessage: 'Dashboard not allowed' })
    }
  }

  if (!updateUserPersonalDefaultDashboard(user.id, dashboardId)) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  addAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'user.self_default_dashboard_change',
    target: dashboardId ?? undefined,
    detail: dashboardId ? 'self default set' : 'self default cleared',
  })

  return { ok: true }
})
