import { setDashboardAccessForUser } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (session.user.role !== 'admin') throw createError({ statusCode: 403 })
  const userId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  // dashboardIds: string[] | null (null = no restriction)
  setDashboardAccessForUser(userId, body.dashboardIds ?? [])
  return { ok: true }
})
