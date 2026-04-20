import { maSearch } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { q, limit } = getQuery(event) as { q?: string; limit?: string }
  if (!q?.trim()) throw createError({ statusCode: 400, statusMessage: 'Missing query' })
  return maSearch(q.trim(), limit ? Number(limit) : 25)
})
