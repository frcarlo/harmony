import { randomBytes } from 'node:crypto'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { clientId, issuer } = config.keycloak
  if (!issuer || !clientId) throw createError({ statusCode: 501, statusMessage: 'Keycloak not configured' })

  const state = randomBytes(16).toString('hex')
  const redirectUri = getRequestURL(event).origin + '/api/auth/keycloak/callback'

  // Store state in session for CSRF check
  await setUserSession(event, { oauth_state: state } as any)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  })

  return sendRedirect(event, `${issuer}/protocol/openid-connect/auth?${params}`)
})
