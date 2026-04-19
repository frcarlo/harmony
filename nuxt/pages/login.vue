<template>
  <v-app class="login-app">
    <v-main class="login-bg d-flex align-center justify-center" style="min-height: 100vh">
      <div class="login-blob login-blob-1" />
      <div class="login-blob login-blob-2" />
      <div class="login-blob login-blob-3" />
      <v-card width="420" rounded="xl" class="pa-2 login-card" style="position:relative;z-index:1">
        <v-card-text class="pa-6">
          <div class="text-center mb-6">
            <v-icon icon="mdi-home-assistant" size="48" color="#18BCF2" class="mb-3" />
            <div class="text-h6 font-weight-bold">HArmony</div>
          </div>

          <v-tabs v-if="keycloakEnabled" v-model="tab" grow class="mb-5">
            <v-tab value="local">{{ t('login.tab_local') }}</v-tab>
            <v-tab value="keycloak">{{ t('login.tab_keycloak') }}</v-tab>
          </v-tabs>

          <!-- Local login -->
          <v-form v-if="!keycloakEnabled || tab === 'local'" @submit.prevent="submitLocal">
            <v-text-field v-model="form.username" :label="t('login.username')" variant="outlined"
              density="compact" class="mb-3" autofocus />
            <v-text-field v-model="form.password" :label="t('login.password')" type="password" variant="outlined"
              density="compact" class="mb-4" />

            <v-alert v-if="loginError" type="error" density="compact" class="mb-4" :text="loginError" />

            <v-btn type="submit" color="primary" variant="flat" block :loading="loading">
              {{ t('login.submit') }}
            </v-btn>
          </v-form>

          <!-- Keycloak login -->
          <div v-else class="text-center">
            <v-btn color="primary" variant="flat" prepend-icon="mdi-shield-key-outline"
              size="large" @click="loginKeycloak">
              {{ t('login.keycloak_btn') }}
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
const { data: appConfig } = await useFetch('/api/app-config')
const keycloakEnabled = computed(() => appConfig.value?.keycloakEnabled ?? false)
const { fetch: refreshSession } = useUserSession()

const tab = ref<'local' | 'keycloak'>('local')
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
    await navigateTo('/dashboard')
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
  background: rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
}
</style>
