import { deleteNotificationRule } from '~/server/utils/db'

export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')!
  const ok = deleteNotificationRule(id)
  if (!ok) throw createError({ statusCode: 404 })
  return { ok: true }
})
