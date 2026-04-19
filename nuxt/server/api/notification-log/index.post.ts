import { addNotificationLog } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  addNotificationLog({
    rule_id: body.rule_id,
    rule_name: body.rule_name,
    entity_id: body.entity_id,
    entity_state: body.entity_state,
    triggered_at: body.triggered_at ?? new Date().toISOString(),
  })
  return { ok: true }
})
