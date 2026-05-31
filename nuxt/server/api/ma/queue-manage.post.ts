import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { action, queue_id, queue_item_id, pos_shift } = await readBody(event) as {
    action: 'remove' | 'move'
    queue_id: string
    queue_item_id: string
    pos_shift?: number
  }
  if (!queue_id || !queue_item_id) throw createError({ statusCode: 400, statusMessage: 'queue_id and queue_item_id required' })

  if (action === 'remove') {
    await maCall('player_queues/delete_item', { queue_id, item_id_or_index: queue_item_id }, 5_000)
  } else if (action === 'move') {
    await maCall('player_queues/move_item', { queue_id, queue_item_id, pos_shift: pos_shift ?? -1 }, 5_000)
  }
  return { ok: true }
})
