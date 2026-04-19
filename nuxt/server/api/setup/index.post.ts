import bcrypt from 'bcryptjs'
import { countUsers, createUser } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  if (countUsers() > 0) {
    throw createError({ statusCode: 409, statusMessage: 'Setup already completed' })
  }

  const { username, password } = await readBody<{ username: string; password: string }>(event)
  if (!username?.trim() || !password || password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Username and password (min 8 chars) required' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = createUser({ username: username.trim(), passwordHash, role: 'admin' })

  await setUserSession(event, { user: { id: user.id, username: user.username, role: user.role } })
  return { ok: true }
})
