import { maRecentlyPlayed } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { limit } = getQuery(event) as { limit?: string }
  return maRecentlyPlayed(limit ? Number(limit) : 12)
})
