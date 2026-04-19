// Protect all /api/* routes except auth and setup endpoints
const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/setup',
  '/api/app-config',
  '/api/_hub/',       // nuxt-auth-utils internal
  '/_nuxt/',
  '/__nuxt_devtools__',
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return

  const session = await getUserSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
