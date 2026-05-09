import { renderHATemplate } from '~/server/utils/ha-api'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ template?: string }>(event)
  const template = body?.template

  if (!template?.trim()) {
    throw createError({ statusCode: 400, message: 'Missing template' })
  }

  return {
    rendered: await renderHATemplate(template),
  }
})
