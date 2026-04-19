import { getDashboardAccessForUser } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  if (session.user.role !== 'admin') throw createError({ statusCode: 403 })
  const userId = getRouterParam(event, 'id')!
  const access = getDashboardAccessForUser(userId)
  return { dashboardIds: access } // null = unrestricted
})
