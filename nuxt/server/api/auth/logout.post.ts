export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const session = await getUserSession(event) as any
  const idToken = session?.keycloak_id_token as string | undefined

  await clearUserSession(event)

  if (idToken && config.keycloak?.issuer) {
    const postLogoutUri = getRequestURL(event).origin + '/login'
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: postLogoutUri,
    })
    return { ok: true, keycloakLogoutUrl: `${config.keycloak.issuer}/protocol/openid-connect/logout?${params}` }
  }

  return { ok: true }
})
