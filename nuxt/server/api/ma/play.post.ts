import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ player_id: string; uri: string; media_type: string }>(event)
  await maCall('player_queues/play_media', {
    queue_id: body.player_id,
    item: body.uri,
    option: 'replace',
  })
  return { ok: true }
})
