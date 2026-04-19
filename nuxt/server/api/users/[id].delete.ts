import { deleteUser, getUserById, listUsers } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!

  // Prevent deleting yourself
  if (id === user.id) throw createError({ statusCode: 409, statusMessage: 'Cannot delete your own account' })

  // Prevent deleting the last admin
  const target = getUserById(id)
  if (target?.role === 'admin') {
    const adminCount = listUsers().filter((u) => u.role === 'admin').length
    if (adminCount <= 1) throw createError({ statusCode: 409, statusMessage: 'Cannot delete the last admin' })
  }

  const targetName = target?.username
  if (!deleteUser(id)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  addAuditLog({ user_id: user.id, username: user.username, action: 'user.delete', target: targetName })
  return { ok: true }
})
