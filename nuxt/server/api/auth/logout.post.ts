let _endSessionEndpoint: string | null = null

async function getEndSessionEndpoint(issuer: string): Promise<string | null> {
  if (_endSessionEndpoint) return _endSessionEndpoint
  try {
    const discovery = await $fetch<{ end_session_endpoint?: string }>(`${issuer}/.well-known/openid-configuration`)
    _endSessionEndpoint = discovery.end_session_endpoint ?? null
  } catch {
    _endSessionEndpoint = null
  }
  return _endSessionEndpoint
}

export default defineEventHandler(async (event) => {
  const config = getServerConfig()
  const session = await getUserSession(event) as any
  const idToken = session?.keycloak_id_token as string | undefined

  await clearUserSession(event)

  if (idToken && config.oidc?.issuer) {
    const endSessionEndpoint = await getEndSessionEndpoint(config.oidc.issuer)
    if (endSessionEndpoint) {
      const postLogoutUri = getRequestURL(event).origin + '/login'
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: postLogoutUri,
      })
      return { ok: true, keycloakLogoutUrl: `${endSessionEndpoint}?${params}` }
    }
  }

  return { ok: true }
})
