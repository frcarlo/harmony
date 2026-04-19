import { updateNotificationRule } from '~/server/utils/db'
import type { NotificationRule } from '~/types/dashboard'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody<Omit<NotificationRule, 'id' | 'created_at'>>(event)
  const ok = updateNotificationRule(id, body)
  if (!ok) throw createError({ statusCode: 404 })
  return { ok: true }
})
