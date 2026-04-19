export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const issuer = config.keycloak?.issuer
    || process.env.NUXT_KEYCLOAK_ISSUER
    || process.env.KEYCLOAK_ISSUER
    || ''
  return {
    keycloakEnabled: !!(issuer),
  }
})
