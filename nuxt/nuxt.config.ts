import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { resolve } from 'node:path'

const appManifestPath = resolve(__dirname, '.nuxt/manifest/meta/dev.json')

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  ssr: false,
  devtools: { enabled: false },

  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },

  alias: {
    '#app-manifest': appManifestPath,
  },

  build: {
    transpile: ['vuetify'],
  },

  components: {
    dirs: [{ path: '~/components', pathPrefix: false }],
  },
  experimental: {
    viteEnvironmentApi: true
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
        theme_color: '#1a2535',
        background_color: '#1a2535',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/dashboard',
        icons: [
          { src: '/icons/harmony/dark/icon/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/harmony/dark/icon/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/harmony/dark/icon/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: null,
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
      detectBrowserLanguage: false,
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
    build: {
      target: 'esnext',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('node_modules/vuetify') || id.includes('@mdi/font')) return 'vendor-ui'
            if (id.includes('node_modules/gridstack') || id.includes('node_modules/vuedraggable') || id.includes('node_modules/sortablejs')) return 'vendor-grid'
            if (id.includes('node_modules/echarts') || id.includes('node_modules/zrender')) return 'vendor-charts'
            if (id.includes('node_modules/dayjs') || id.includes('node_modules/@vueuse')) return 'vendor-utils'
            if (id.includes('node_modules/pinia') || id.includes('node_modules/vue-demi') || id.includes('node_modules/vue-sonner') || id.includes('node_modules/ws')) return 'vendor-app'
          },
        },
      },
    },
    plugins: [
      {
        name: 'harmony-app-manifest-alias',
        enforce: 'pre',
        resolveId(id) {
          if (id === '#app-manifest') return appManifestPath
        },
      },
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
    haUrl: process.env.NUXT_HA_URL ?? process.env.HA_URL ?? 'http://localhost:8123',
    haToken: process.env.NUXT_HA_TOKEN ?? process.env.HA_TOKEN ?? '',
    dataDir: process.env.NUXT_DATA_DIR ?? process.env.DATA_DIR ?? '/app/data',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD ?? '',
      maxAge: 60 * 60 * 24 * 7,
    },
    oidc: {
      clientId: process.env.NUXT_OIDC_CLIENT_ID ?? process.env.NUXT_KEYCLOAK_CLIENT_ID ?? '',
      clientSecret: process.env.NUXT_OIDC_CLIENT_SECRET ?? process.env.NUXT_KEYCLOAK_CLIENT_SECRET ?? '',
      issuer: process.env.NUXT_OIDC_ISSUER ?? process.env.NUXT_KEYCLOAK_ISSUER ?? '',
    },
    maUrl: process.env.NUXT_MA_URL ?? '',
    maToken: process.env.NUXT_MA_TOKEN ?? '',
    public: {
      keycloakEnabled: false,
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
        { name: 'theme-color', content: '#1a2535' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'HArmony' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/harmony/dark/icon/icon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/icons/harmony/dark/icon/icon-16.png' },
        { rel: 'icon', href: '/icons/harmony/dark/icon/icon-32.png', media: '(prefers-color-scheme: light)' },
        { rel: 'icon', href: '/icons/harmony/light/icon/icon-32.png', media: '(prefers-color-scheme: dark)' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/harmony/dark/icon/icon-180.png' },
      ],
      htmlAttrs: { lang: 'de' },
    },
  },

})
