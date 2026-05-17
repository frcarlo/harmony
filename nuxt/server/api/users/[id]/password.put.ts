import bcrypt from 'bcryptjs'
import { getUserById, updateUserPassword } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ new_password: string }>(event)

  if (!body.new_password || body.new_password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters' })
  }

  const target = getUserById(id)
  if (!target) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  if (!target.password_hash) throw createError({ statusCode: 400, statusMessage: 'Cannot change password for SSO accounts' })

  const hash = await bcrypt.hash(body.new_password, 12)
  updateUserPassword(id, hash)
  addAuditLog({ user_id: user.id, username: user.username, action: 'user.password_change', target: target.username })
  return { ok: true }
})
