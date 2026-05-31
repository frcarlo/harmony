import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { queue_id, index } = await readBody(event) as { queue_id: string; index: number }
  if (!queue_id) throw createError({ statusCode: 400, statusMessage: 'queue_id required' })
  await maCall('player_queues/play_index', { queue_id, index }, 8_000)
  return { ok: true }
})
