import { randomBytes } from 'node:crypto'

let _discovery: { authorization_endpoint: string } | null = null

async function getDiscovery(issuer: string) {
  if (!_discovery)
    _discovery = await $fetch(`${issuer}/.well-known/openid-configuration`)
  return _discovery!
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { clientId, issuer } = config.oidc as { clientId: string; issuer: string }
  if (!issuer || !clientId) throw createError({ statusCode: 501, statusMessage: 'OIDC not configured' })

  const discovery = await getDiscovery(issuer)
  const state = randomBytes(16).toString('hex')
  const redirectUri = getRequestURL(event).origin + '/api/auth/keycloak/callback'

  await setUserSession(event, { oauth_state: state } as any)

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state,
  })

  return sendRedirect(event, `${discovery.authorization_endpoint}?${params}`)
})
