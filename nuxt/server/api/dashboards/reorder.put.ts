import { reorderDashboards } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const { ids } = await readBody<{ ids: string[] }>(event)
  if (!Array.isArray(ids)) throw createError({ statusCode: 400, message: 'ids must be an array' })
  reorderDashboards(ids)
  return { ok: true }
})
