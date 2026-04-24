import { resolveDefaultDashboardForUserWithSource } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  const resolved = resolveDefaultDashboardForUserWithSource(session.user.id, session.user.role)
  return { dashboardId: resolved.dashboardId, source: resolved.source }
})
