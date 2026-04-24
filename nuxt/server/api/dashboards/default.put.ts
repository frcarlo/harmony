import { getDashboard, setGlobalDefaultDashboard } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readBody<{ dashboardId?: string | null }>(event)
  const dashboardId = body.dashboardId ?? null

  if (dashboardId && !getDashboard(dashboardId)) {
    throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
  }

  setGlobalDefaultDashboard(dashboardId)
  addAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'dashboard.default_change',
    target: dashboardId ?? undefined,
    detail: dashboardId ? 'global default set' : 'global default cleared',
  })
  return { ok: true }
})
