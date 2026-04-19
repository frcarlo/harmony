import { getUserByProviderId, createUser, updateUserRole } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { clientId, clientSecret, issuer } = config.keycloak
  if (!issuer || !clientId) throw createError({ statusCode: 501, statusMessage: 'Keycloak not configured' })

  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string

  // CSRF state check
  const session = await getUserSession(event) as any
  if (!state || state !== session?.oauth_state) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })
  }

  const redirectUri = getRequestURL(event).origin + '/api/auth/keycloak/callback'

  // Exchange code for tokens
  const tokenRes = await $fetch<{ access_token: string; id_token: string }>(
    `${issuer}/protocol/openid-connect/token`,
    {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }).toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  )

  // Get user info
  const userInfo = await $fetch<{ sub: string; preferred_username: string; email?: string }>(
    `${issuer}/protocol/openid-connect/userinfo`,
    { headers: { Authorization: `Bearer ${tokenRes.access_token}` } },
  )

  // Decode access token payload (JWT) to read realm_access — userinfo endpoint omits it by default
  const tokenPayload = JSON.parse(
    Buffer.from(tokenRes.access_token.split('.')[1], 'base64url').toString('utf-8'),
  ) as { realm_access?: { roles: string[] } }

  const keycloakRoles = tokenPayload.realm_access?.roles ?? []
  const role = keycloakRoles.includes('ha-dashboard-admin') ? 'admin' : 'user'

  // Find or create local user — update role on every login to stay in sync
  let dbUser = getUserByProviderId('keycloak', userInfo.sub)
  if (!dbUser) {
    dbUser = createUser({
      username: userInfo.preferred_username,
      email: userInfo.email,
      role,
      provider: 'keycloak',
      providerId: userInfo.sub,
    })
  } else if (dbUser.role !== role) {
    updateUserRole(dbUser.id, role)
    dbUser = { ...dbUser, role }
  }

  await setUserSession(event, { user: { id: dbUser.id, username: dbUser.username, role: dbUser.role } })
  return sendRedirect(event, '/dashboard')
})
