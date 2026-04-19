import { listUsers } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  return listUsers()
})
