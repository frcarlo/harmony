interface ServerConfig {
  haUrl: string
  haToken: string
  dataDir: string
  oidc: { clientId: string; clientSecret: string; issuer: string }
  maUrl: string
  maToken: string
}

export function getServerConfig(): ServerConfig {
  return useRuntimeConfig() as unknown as ServerConfig
}
