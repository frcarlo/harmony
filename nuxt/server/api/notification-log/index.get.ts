import { listNotificationLog } from '~/server/utils/db'

export default defineEventHandler(async () => {
  return listNotificationLog(100)
})
