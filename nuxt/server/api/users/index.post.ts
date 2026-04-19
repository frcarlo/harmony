import bcrypt from 'bcryptjs'
import { createUser, getUserByUsername } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readBody<{ username: string; password: string; role: 'admin' | 'user' }>(event)
  if (!body.username?.trim() || !body.password || body.password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password (min 8 chars) required' })
  }
  if (getUserByUsername(body.username.trim())) {
    throw createError({ statusCode: 409, statusMessage: 'Username already taken' })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  const newUser = createUser({ username: body.username.trim(), passwordHash, role: body.role ?? 'user' })
  const { password_hash: _, ...safe } = newUser
  addAuditLog({ user_id: user.id, username: user.username, action: 'user.create', target: newUser.username, detail: newUser.role })
  return safe
})
