<template>
  <v-app class="login-app">
    <div class="login-bg">
      <!-- Architectural dot grid -->
      <div class="login-bg__grid" />
      <!-- Single focal glow -->
      <div class="login-bg__glow" />

      <!-- Card scene -->
      <div class="login-scene">
        <div class="login-frame">
          <!-- HUD corner brackets -->
          <span class="login-corner login-corner--tl" />
          <span class="login-corner login-corner--tr" />
          <span class="login-corner login-corner--bl" />
          <span class="login-corner login-corner--br" />

          <div class="login-card">

            <!-- Status strip -->
            <div class="login-status">
              <span class="login-status__dot" :class="appConfig?.haReachable === false ? 'login-status__dot--error' : ''" />
              <span class="login-status__text">HArmony</span>
              <span class="login-status__version">v{{ config.public.appVersion }}</span>
            </div>

            <!-- Logo + subtitle -->
            <div class="login-header">
              <AppBrandLogo :size="88" class="login-logo" />
              <p class="login-subtitle">{{ t('login.subtitle') }}</p>
            </div>

            <!-- HA unreachable -->
            <v-alert v-if="appConfig && !appConfig.haReachable" type="warning" density="compact"
              rounded="lg" class="mb-5 login-alert" prepend-icon="mdi-lan-disconnect"
              :text="t('login.ha_unreachable')" />

            <!-- Keycloak SSO -->
            <div v-if="keycloakEnabled && appConfig?.haReachable" class="mb-4">
              <v-btn variant="outlined" block size="large" rounded="lg" prepend-icon="mdi-shield-key-outline"
                class="login-sso-btn" @click="loginKeycloak">
                {{ t('login.keycloak_btn') }}
              </v-btn>

              <div class="login-divider my-5">
                <span class="login-divider__line" />
                <span class="login-divider__text">{{ t('login.or') }}</span>
                <span class="login-divider__line" />
              </div>
            </div>

            <!-- Credentials form -->
            <v-form @submit.prevent="submitLocal">
              <v-text-field
                v-model="form.username"
                :label="t('login.username')"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-3 login-field"
                autofocus
                :disabled="!appConfig?.haReachable"
              />
              <v-text-field
                v-model="form.password"
                :label="t('login.password')"
                type="password"
                variant="outlined"
                rounded="lg"
                density="comfortable"
                class="mb-5 login-field"
                :disabled="!appConfig?.haReachable"
              />

              <v-alert v-if="loginError" type="error" density="compact" rounded="lg"
                class="mb-4 login-alert" :text="loginError" />

              <v-btn
                type="submit"
                color="primary"
                variant="flat"
                block
                size="large"
                rounded="lg"
                :loading="loading"
                :disabled="!appConfig?.haReachable"
                class="login-submit"
              >
                {{ t('login.submit') }}
              </v-btn>
            </v-form>

          </div>
        </div>
      </div>
    </div>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
const config = useRuntimeConfig()
const { data: appConfig, refresh: refreshAppConfig } = useFetch('/api/app-config')
const keycloakEnabled = computed(() => appConfig.value?.keycloakEnabled ?? false)
const { fetch: refreshSession } = useUserSession()

let retryTimer: ReturnType<typeof setTimeout> | null = null
watch(() => appConfig.value?.haReachable, (reachable) => {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  if (!reachable) retryTimer = setTimeout(refreshAppConfig, 5000)
}, { immediate: true })
onUnmounted(() => { if (retryTimer) clearTimeout(retryTimer) })

const loading = ref(false)
const loginError = ref('')
const form = reactive({ username: '', password: '' })

async function submitLocal() {
  loginError.value = ''
  if (!form.username || !form.password) return
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: { username: form.username, password: form.password } })
    await refreshSession()
    const { dashboardId } = await $fetch<{ dashboardId: string | null }>('/api/dashboards/default')
    await navigateTo(dashboardId ? `/dashboard/${dashboardId}` : '/dashboard')
  } catch (e: any) {
    loginError.value = e?.data?.statusMessage ?? t('login.error_default')
  } finally {
    loading.value = false
  }
}

function loginKeycloak() {
  window.location.href = '/api/auth/keycloak'
}
</script>

<style scoped>
/* ── App shell ───────────────────────────────────── */
.login-app :deep(.v-application__wrap) {
  min-height: 100vh;
  background: #07090f;
}

/* ── Full-page background ────────────────────────── */
.login-bg {
  min-height: 100vh;
  background: #07090f;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Dot-grid texture */
.login-bg__grid {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.14) 1px, transparent 1px);
  background-size: 28px 28px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 85%);
}

/* Single centered glow — not blobs */
.login-bg__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 65% 55% at 50% 50%, rgba(24, 188, 242, 0.1) 0%, transparent 65%);
  pointer-events: none;
}

/* ── Scene + frame ───────────────────────────────── */
.login-scene {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 430px;
  padding: 24px 16px;
}

.login-frame {
  position: relative;
}

/* HUD corner brackets */
.login-corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border-color: rgba(24, 188, 242, 0.52);
  border-style: solid;
  border-width: 0;
  z-index: 10;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.login-corner--tl { top: -7px; left: -7px; border-top-width: 2px; border-left-width: 2px; border-radius: 2px 0 0 0; }
.login-corner--tr { top: -7px; right: -7px; border-top-width: 2px; border-right-width: 2px; border-radius: 0 2px 0 0; }
.login-corner--bl { bottom: -7px; left: -7px; border-bottom-width: 2px; border-left-width: 2px; border-radius: 0 0 0 2px; }
.login-corner--br { bottom: -7px; right: -7px; border-bottom-width: 2px; border-right-width: 2px; border-radius: 0 0 2px 0; }

/* ── Card ────────────────────────────────────────── */
.login-card {
  background: rgba(7, 10, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-top: 2px solid rgba(24, 188, 242, 0.6);
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(24, 188, 242, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border-radius: 18px;
  padding: 26px 30px 32px;
  animation: login-rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes login-rise {
  from { opacity: 0; transform: translateY(22px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Status strip ────────────────────────────────── */
.login-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 26px;
}

.login-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
  animation: dot-pulse 2.4s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
}

.login-status__dot--error {
  background: #f59e0b;
  animation: dot-pulse-warn 1.4s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5);
}

@keyframes dot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
  60%  { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

@keyframes dot-pulse-warn {
  0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.45); }
  60%  { box-shadow: 0 0 0 5px rgba(245, 158, 11, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
}

.login-status__text {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
  flex: 1;
}

.login-status__version {
  font-size: 0.65rem;
  color: rgba(255, 255, 255, 0.2);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

/* ── Header ──────────────────────────────────────── */
.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.login-logo {
  filter: drop-shadow(0 0 28px rgba(24, 188, 242, 0.28));
  animation: logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both;
}

@keyframes logo-in {
  from { opacity: 0; transform: scale(0.88); filter: drop-shadow(0 0 0 rgba(24, 188, 242, 0)); }
  to   { opacity: 1; transform: scale(1);    filter: drop-shadow(0 0 28px rgba(24, 188, 242, 0.28)); }
}

.login-subtitle {
  font-size: 0.83rem;
  color: rgba(255, 255, 255, 0.38);
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

/* ── SSO button ──────────────────────────────────── */
.login-sso-btn {
  border-color: rgba(255, 255, 255, 0.14) !important;
  color: rgba(255, 255, 255, 0.72) !important;
  letter-spacing: 0 !important;
  font-weight: 500 !important;
  background: rgba(255, 255, 255, 0.04) !important;
}
.login-sso-btn:hover {
  border-color: rgba(24, 188, 242, 0.32) !important;
  background: rgba(24, 188, 242, 0.06) !important;
}

/* ── OR divider ──────────────────────────────────── */
.login-divider {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-divider__line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
}

.login-divider__text {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.22);
}

/* ── Form fields: subtle dark tint ───────────────── */
.login-field :deep(.v-field) {
  background: rgba(255, 255, 255, 0.04) !important;
  transition: background 0.2s ease;
}
.login-field :deep(.v-field--focused) {
  background: rgba(24, 188, 242, 0.07) !important;
}
.login-field :deep(.v-field__outline) {
  --v-field-border-opacity: 0.14;
}
.login-field :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 0.55;
}
.login-field :deep(.v-label) {
  color: rgba(255, 255, 255, 0.45) !important;
}

/* ── Submit button ───────────────────────────────── */
.login-submit {
  letter-spacing: 0.02em !important;
  font-weight: 600 !important;
  box-shadow: 0 8px 24px rgba(24, 188, 242, 0.22) !important;
  transition: box-shadow 0.2s ease, transform 0.15s ease !important;
}
.login-submit:hover {
  box-shadow: 0 12px 32px rgba(24, 188, 242, 0.32) !important;
  transform: translateY(-1px);
}
.login-submit:active {
  transform: translateY(0);
}

/* ── Alert overrides ─────────────────────────────── */
.login-alert {
  font-size: 0.82rem !important;
}

/* ── Mobile ──────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    padding: 22px 20px 28px;
    border-radius: 16px;
  }
}
</style>
