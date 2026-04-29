import { setGlobalSetting } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readBody<{ background?: string | null; bg_opacity?: number | null; bg_size?: string | null }>(event)

  if ('background' in body) setGlobalSetting('home_background', body.background ?? null)
  if ('bg_opacity' in body) setGlobalSetting('home_bg_opacity', body.bg_opacity != null ? String(body.bg_opacity) : null)
  if ('bg_size' in body) setGlobalSetting('home_bg_size', body.bg_size ?? null)

  return { ok: true }
})
