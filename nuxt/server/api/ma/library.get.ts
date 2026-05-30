import { maLibraryItems } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { type, limit } = getQuery(event) as { type?: string; limit?: string }
  return maLibraryItems(type ?? 'playlist', limit ? Number(limit) : 200)
})
