export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const issuer = config.oidc?.issuer
    || process.env.NUXT_OIDC_ISSUER
    || process.env.NUXT_KEYCLOAK_ISSUER
    || ''

  const haUrl = config.haUrl || process.env.NUXT_HA_URL || process.env.HA_URL || ''
  const haToken = config.haToken || process.env.NUXT_HA_TOKEN || process.env.HA_TOKEN || ''

  let haReachable = false
  if (haUrl && haToken) {
    try {
      const res = await fetch(`${haUrl}/api/`, {
        headers: { Authorization: `Bearer ${haToken}` },
        signal: AbortSignal.timeout(5000),
      })
      haReachable = res.ok
    } catch {
      haReachable = false
    }
  }

  return {
    keycloakEnabled: !!(issuer),
    haReachable,
  }
})
