import { createNotificationRule } from '~/server/utils/db'
import type { NotificationRule } from '~/types/dashboard'

export default defineEventHandler(async (event) => {
  const body = await readBody<Omit<NotificationRule, 'id' | 'created_at'>>(event)
  return createNotificationRule(body)
})
