import bcrypt from 'bcryptjs'
import { getUserByUsername } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody<{ username: string; password: string }>(event)
  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password required' })
  }

  const user = getUserByUsername(username.trim())
  if (!user || !user.password_hash) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, { user: { id: user.id, username: user.username, role: user.role } })
  return { ok: true }
})
