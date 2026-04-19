import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  devtools: { enabled: true },

  build: {
    transpile: ['vuetify'],
  },

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },

  modules: [
    '@vueuse/nuxt',
    '@pinia/nuxt',
    ['@vite-pwa/nuxt', {
      registerType: 'autoUpdate',
      injectRegister: 'script',
      strategies: 'generateSW',
      manifest: {
        id: '/dashboard',
        name: 'HArmony',
        short_name: 'HArmony',
        description: 'Home Assistant Dashboard Builder',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/dashboard',
        navigateFallbackDenylist: [/^\/api\//, /^\/login/, /^\/setup/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          { urlPattern: /^\/api\/ha\//, handler: 'NetworkOnly' },
          { urlPattern: /^\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api-cache', networkTimeoutSeconds: 5 } },
        ],
      },
      client: { installPrompt: true },
      devOptions: { enabled: false },
    }],
    ['@nuxtjs/i18n', {
      locales: [
        { code: 'de', language: 'de-DE', file: 'de.json', name: 'Deutsch' },
        { code: 'en', language: 'en-US', file: 'en.json', name: 'English' },
        { code: 'es', language: 'es-ES', file: 'es.json', name: 'Español' },
        { code: 'fr', language: 'fr-FR', file: 'fr.json', name: 'Français' },
        { code: 'it', language: 'it-IT', file: 'it.json', name: 'Italiano' },
        { code: 'nl', language: 'nl-NL', file: 'nl.json', name: 'Nederlands' },
      ],
      defaultLocale: 'de',
      langDir: 'locales/',
      strategy: 'no_prefix',
    }],
    'nuxt-auth-utils',
  ],

  css: [
    '~/assets/css/main.css',
  ],

  vite: {
    vue: {
      template: { transformAssetUrls },
    },
    plugins: [
      vuetify({ autoImport: true }),
    ],
  },

  nitro: {
    experimental: {
      websocket: true,
    },
    externals: {
      external: ['node:sqlite'],
    },
  },

  runtimeConfig: {
    haUrl: process.env.HA_URL ?? 'http://localhost:8123',
    haToken: process.env.HA_TOKEN ?? '',
    dataDir: process.env.DATA_DIR ?? './data',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 7,
    },
    keycloak: {
      clientId: process.env.KEYCLOAK_CLIENT_ID ?? '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET ?? '',
      issuer: process.env.KEYCLOAK_ISSUER ?? '',
    },
    public: {
      keycloakEnabled: !!(process.env.KEYCLOAK_ISSUER),
      appVersion: process.env.npm_package_version ?? '1.0.0',
      githubUrl: 'https://github.com/frcarlo/harmony',
    },
  },

  routeRules: {
    '/': { redirect: '/dashboard' },
  },

  app: {
    head: {
      title: 'HArmony',
      meta: [
        { name: 'description', content: 'Home Assistant Dashboard Builder' },
        { name: 'theme-color', content: '#0d1117' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'HArmony' },
      ],
      link: [
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      ],
      htmlAttrs: { lang: 'de' },
    },
  },

})
