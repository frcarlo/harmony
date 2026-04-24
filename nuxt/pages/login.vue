<template>
  <v-app class="login-app">
    <v-main class="login-bg d-flex align-center justify-center" style="min-height: 100vh">
      <div class="login-blob login-blob-1" />
      <div class="login-blob login-blob-2" />
      <div class="login-blob login-blob-3" />

      <v-card width="420" rounded="xl" class="login-card" style="position:relative;z-index:1">
        <v-card-text class="pa-8">

          <!-- Header -->
          <div class="mb-7">
            <div class="d-flex align-center ga-3 mb-1">
              <v-icon icon="mdi-home-assistant" size="28" color="#18BCF2" />
              <span class="text-h6 font-weight-bold">{{ t('login.sign_in_to') }} HArmony</span>
            </div>
            <p class="text-body-2 text-medium-emphasis ml-1">{{ t('login.subtitle') }}</p>
          </div>

          <!-- HA nicht erreichbar -->
          <v-alert v-if="appConfig && !appConfig.haReachable" type="warning" density="compact"
            rounded="lg" class="mb-5" prepend-icon="mdi-lan-disconnect" :text="t('login.ha_unreachable')" />

          <!-- Keycloak Button (oben wie Social Login) -->
          <div v-if="keycloakEnabled && appConfig?.haReachable" class="mb-5">
            <v-btn variant="outlined" block size="large" rounded="lg" prepend-icon="mdi-shield-key-outline"
              class="keycloak-btn" @click="loginKeycloak">
              {{ t('login.keycloak_btn') }}
            </v-btn>

            <div class="divider-row my-5">
              <v-divider />
              <span class="divider-text text-caption text-medium-emphasis px-3">{{ t('login.or') }}</span>
              <v-divider />
            </div>
          </div>

          <!-- Formular -->
          <v-form @submit.prevent="submitLocal">
            <v-text-field v-model="form.username" :label="t('login.username')" variant="outlined"
              rounded="lg" density="comfortable" class="mb-3" autofocus
              :disabled="!appConfig?.haReachable" />
            <v-text-field v-model="form.password" :label="t('login.password')" type="password"
              variant="outlined" rounded="lg" density="comfortable" class="mb-5"
              :disabled="!appConfig?.haReachable" />

            <v-alert v-if="loginError" type="error" density="compact" rounded="lg" class="mb-4" :text="loginError" />

            <v-btn type="submit" color="primary" variant="flat" block size="large" rounded="lg"
              :loading="loading" :disabled="!appConfig?.haReachable">
              {{ t('login.submit') }}
            </v-btn>
          </v-form>

          <!-- Version -->
          <div class="text-center mt-5">
            <span class="text-caption text-disabled">v{{ config.public.appVersion }}</span>
          </div>

        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
const config = useRuntimeConfig()
const { data: appConfig } = await useFetch('/api/app-config')
const keycloakEnabled = computed(() => appConfig.value?.keycloakEnabled ?? false)
const { fetch: refreshSession } = useUserSession()

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
.login-app :deep(.v-application__wrap) {
  background: #0d1117;
}

.login-bg {
  position: relative;
  overflow: hidden;
  background: #0d1117;
}

.login-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}

.login-blob-1 {
  width: 500px;
  height: 500px;
  background: #18BCF2;
  opacity: 0.2;
  top: 50%;
  left: 50%;
  transform: translate(-70%, -65%);
}

.login-blob-2 {
  width: 400px;
  height: 400px;
  background: #7c3aed;
  opacity: 0.18;
  top: 50%;
  left: 50%;
  transform: translate(-30%, -35%);
}

.login-blob-3 {
  width: 300px;
  height: 300px;
  background: #06b6d4;
  opacity: 0.15;
  top: 50%;
  left: 50%;
  transform: translate(-55%, 5%);
}

.login-card {
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  background: rgba(255, 255, 255, 0.07) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}

.keycloak-btn {
  border-color: rgba(255, 255, 255, 0.2) !important;
  letter-spacing: 0 !important;
  font-weight: 500 !important;
}

.divider-row {
  display: flex;
  align-items: center;
}
</style>
