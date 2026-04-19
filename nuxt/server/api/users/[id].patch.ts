import { updateUserRole, getUserById, listUsers } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const { role } = await readBody<{ role: 'admin' | 'user' }>(event)
  if (!['admin', 'user'].includes(role)) throw createError({ statusCode: 400, statusMessage: 'Invalid role' })

  if (role === 'user') {
    const target = getUserById(id)
    if (target?.role === 'admin') {
      const adminCount = listUsers().filter((u) => u.role === 'admin').length
      if (adminCount <= 1) throw createError({ statusCode: 409, statusMessage: 'Cannot remove the last admin' })
    }
  }

  if (!updateUserRole(id, role)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  const target = getUserById(id)
  addAuditLog({ user_id: user.id, username: user.username, action: 'user.role_change', target: target?.username, detail: `→ ${role}` })
  return { ok: true }
})
