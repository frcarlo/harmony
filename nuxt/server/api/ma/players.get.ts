import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async () => {
  const result = await maCall('players/all')
  return result
})
