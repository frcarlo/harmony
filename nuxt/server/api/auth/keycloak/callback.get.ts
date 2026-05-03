import { getUserByProviderId, getUserByUsername, linkUserProvider, createUser, updateUserRole, updateUserAllowedAreas, resolveDefaultDashboardForUser } from '~/server/utils/db'

interface OidcDiscovery {
  token_endpoint: string
  userinfo_endpoint: string
}

interface UserInfo {
  sub: string
  preferred_username: string
  email?: string
  groups?: string[]
}

let _discovery: OidcDiscovery | null = null

async function getDiscovery(issuer: string): Promise<OidcDiscovery> {
  if (!_discovery)
    _discovery = await $fetch(`${issuer}/.well-known/openid-configuration`)
  return _discovery!
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const { clientId, clientSecret, issuer } = config.oidc as { clientId: string; clientSecret: string; issuer: string }
  if (!issuer || !clientId) throw createError({ statusCode: 501, statusMessage: 'OIDC not configured' })

  const query = getQuery(event)
  const code = query.code as string
  const state = query.state as string

  const session = await getUserSession(event) as any
  if (!state || state !== session?.oauth_state)
    throw createError({ statusCode: 400, statusMessage: 'Invalid OAuth state' })

  const redirectUri = getRequestURL(event).origin + '/api/auth/keycloak/callback'
  const discovery = await getDiscovery(issuer)

  const tokenRes = await $fetch<{ access_token: string; id_token: string }>(
    discovery.token_endpoint,
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

  const userInfo = await $fetch<UserInfo>(
    discovery.userinfo_endpoint,
    { headers: { Authorization: `Bearer ${tokenRes.access_token}` } },
  )

  const tokenPayload = JSON.parse(
    Buffer.from(tokenRes.access_token.split('.')[1], 'base64url').toString('utf-8'),
  ) as { realm_access?: { roles: string[] }; groups?: string[] }

  // Support Authentik (groups claim) and Keycloak (realm_access.roles)
  const groups = userInfo.groups ?? tokenPayload.groups ?? []
  const roles = tokenPayload.realm_access?.roles ?? []
  const allClaims = [...groups, ...roles]
  const isAdmin = allClaims.includes('ha-dashboard-admin')
  const ssoAreas = allClaims
    .filter(g => g.startsWith('ha-area-'))
    .map(g => g.slice('ha-area-'.length))
  // ha-area-* groups imply editor even without explicit ha-dashboard-editor claim
  const isEditor = allClaims.includes('ha-dashboard-editor') || ssoAreas.length > 0
  const role: 'admin' | 'editor' | 'user' = isAdmin ? 'admin' : isEditor ? 'editor' : 'user'
  const allowedAreas = isEditor && ssoAreas.length > 0 ? ssoAreas : null

  let dbUser = getUserByProviderId('keycloak', userInfo.sub)
  if (!dbUser) {
    dbUser = getUserByUsername(userInfo.preferred_username)
    if (dbUser) {
      linkUserProvider(dbUser.id, 'keycloak', userInfo.sub)
      dbUser = { ...dbUser, provider: 'keycloak', provider_id: userInfo.sub }
    }
    else {
      dbUser = createUser({
        username: userInfo.preferred_username,
        email: userInfo.email,
        role,
        provider: 'keycloak',
        providerId: userInfo.sub,
      })
    }
  }
  if (dbUser.role !== role) {
    updateUserRole(dbUser.id, role)
    dbUser = { ...dbUser, role }
  }
  // Sync SSO-derived areas to DB so admin UI reflects current IdP state
  if (isEditor) {
    updateUserAllowedAreas(dbUser.id, allowedAreas)
    dbUser = { ...dbUser, allowed_areas: allowedAreas }
  }

  await setUserSession(event, {
    user: {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      force_kiosk: dbUser.force_kiosk,
      allowed_areas: dbUser.allowed_areas ?? undefined,
    },
    keycloak_id_token: tokenRes.id_token,
  } as any)
  const defaultDashboard = resolveDefaultDashboardForUser(dbUser.id, dbUser.role)
  return sendRedirect(event, defaultDashboard ? `/dashboard/${defaultDashboard.id}` : '/dashboard')
})
