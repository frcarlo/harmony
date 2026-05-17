import bcrypt from 'bcryptjs'
import { getUserById, updateUserPassword } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ current_password: string; new_password: string }>(event)

  if (!body.current_password || !body.new_password) {
    throw createError({ statusCode: 400, statusMessage: 'current_password and new_password required' })
  }
  if (body.new_password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }

  const dbUser = getUserById(user.id)
  if (!dbUser || !dbUser.password_hash) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot change password for SSO accounts' })
  }

  const valid = await bcrypt.compare(body.current_password, dbUser.password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Current password is incorrect' })
  }

  const hash = await bcrypt.hash(body.new_password, 12)
  updateUserPassword(user.id, hash)
  return { ok: true }
})
