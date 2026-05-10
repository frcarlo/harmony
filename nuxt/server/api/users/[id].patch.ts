import { updateUserRole, updateUserAllowedAreas, updateUserForceKiosk, updateUserForceDeviceType, getUserById, listUsers, updateUserDefaultDashboard, getDashboard } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const id = getRouterParam(event, 'id')!
  const body = await readBody<{
    role?: 'admin' | 'editor' | 'user'
    force_kiosk?: boolean
    force_device_type?: string | null
    allowed_areas?: string[] | null
    default_dashboard_id?: string | null
  }>(event)

  if (body.role != null) {
    const role = body.role
    if (!['admin', 'editor', 'user'].includes(role)) throw createError({ statusCode: 400, statusMessage: 'Invalid role' })

    if (role !== 'admin') {
      const target = getUserById(id)
      if (target?.role === 'admin') {
        const adminCount = listUsers().filter((u) => u.role === 'admin').length
        if (adminCount <= 1) throw createError({ statusCode: 409, statusMessage: 'Cannot remove the last admin' })
      }
    }

    if (!updateUserRole(id, role)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    const target = getUserById(id)
    addAuditLog({ user_id: user.id, username: user.username, action: 'user.role_change', target: target?.username, detail: `→ ${role}` })
  }

  if ('allowed_areas' in body) {
    updateUserAllowedAreas(id, body.allowed_areas ?? null)
  }

  if (body.force_kiosk !== undefined) {
    if (!updateUserForceKiosk(id, !!body.force_kiosk)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    const target = getUserById(id)
    if (user.id === id && target) {
      const currentSession = await getUserSession(event) as Record<string, unknown>
      await setUserSession(event, {
        ...currentSession,
        user: {
          id: target.id,
          username: target.username,
          role: target.role,
          force_kiosk: target.force_kiosk,
          force_device_type: target.force_device_type,
          allowed_areas: target.allowed_areas ?? undefined,
        },
      })
    }
    addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'user.force_kiosk_change',
      target: target?.username,
      detail: body.force_kiosk ? 'enabled' : 'disabled',
    })
  }

  if ('force_device_type' in body) {
    const allowed = ['desktop', 'tablet', 'mobile', null]
    if (!allowed.includes(body.force_device_type ?? null)) throw createError({ statusCode: 400, statusMessage: 'Invalid device type' })
    if (!updateUserForceDeviceType(id, body.force_device_type ?? null)) throw createError({ statusCode: 404, statusMessage: 'User not found' })
    const target = getUserById(id)
    if (user.id === id && target) {
      const currentSession = await getUserSession(event) as Record<string, unknown>
      await setUserSession(event, {
        ...currentSession,
        user: {
          id: target.id,
          username: target.username,
          role: target.role,
          force_kiosk: target.force_kiosk,
          force_device_type: target.force_device_type,
          allowed_areas: target.allowed_areas ?? undefined,
        },
      })
    }
    addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'user.force_device_type_change',
      target: target?.username,
      detail: body.force_device_type ?? 'auto',
    })
  }

  if (body.default_dashboard_id !== undefined) {
    if (body.default_dashboard_id && !getDashboard(body.default_dashboard_id)) {
      throw createError({ statusCode: 404, statusMessage: 'Dashboard not found' })
    }
    if (!updateUserDefaultDashboard(id, body.default_dashboard_id ?? null)) {
      throw createError({ statusCode: 404, statusMessage: 'User not found' })
    }
    const target = getUserById(id)
    addAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'user.default_dashboard_change',
      target: target?.username,
      detail: body.default_dashboard_id ?? 'cleared',
    })
  }

  return { ok: true }
})
