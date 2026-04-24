import { getUserById } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const dbUser = getUserById(user.id)
  return {
    dashboardId: dbUser?.user_default_dashboard_id ?? null,
  }
})
