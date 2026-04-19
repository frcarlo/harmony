import { clearNotificationLog } from '~/server/utils/db'

export default defineEventHandler(async () => {
  clearNotificationLog()
  return { ok: true }
})
