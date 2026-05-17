// Bridge for nitropack/types which re-exports NitroRuntimeConfig from an internal module.
// The standard Nuxt augmentation targets 'nitropack' but useRuntimeConfig() resolves
// its return type from 'nitropack/types'. We augment both so the properties are visible.
declare module 'nitropack' {
  interface NitroRuntimeConfig {
    haUrl: string
    haToken: string
    dataDir: string
    session: {
      name: string
      password: string
      cookie: { sameSite: string }
      maxAge: number
    }
    oidc: {
      clientId: string
      clientSecret: string
      issuer: string
    }
    maUrl: string
    maToken: string
  }
}

declare module 'nitropack/types' {
  interface NitroRuntimeConfig {
    haUrl: string
    haToken: string
    dataDir: string
    session: {
      name: string
      password: string
      cookie: { sameSite: string }
      maxAge: number
    }
    oidc: {
      clientId: string
      clientSecret: string
      issuer: string
    }
    maUrl: string
    maToken: string
  }
}
