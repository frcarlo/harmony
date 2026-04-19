export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  return {
    keycloakEnabled: !!(config.keycloak?.issuer),
  }
})
