<template>
  <v-app class="login-app">
    <v-main class="login-bg d-flex align-center justify-center" style="min-height: 100vh">
      <div class="login-blob login-blob-1" />
      <div class="login-blob login-blob-2" />
      <div class="login-blob login-blob-3" />
      <v-card width="400" rounded="xl" class="pa-2 login-card" style="position:relative;z-index:1">
        <v-card-text class="pa-6">
          <div class="text-center mb-6">
            <v-icon icon="mdi-home-assistant" size="48" color="#18BCF2" class="mb-3" />
            <div class="text-h6 font-weight-bold">HArmony</div>
            <div class="text-body-2 text-medium-emphasis mt-1">{{ t('setup.subtitle') }}</div>
          </div>

          <v-form @submit.prevent="submit">
            <v-text-field v-model="form.username" :label="t('login.username')" variant="outlined"
              density="compact" class="mb-3" autofocus :error-messages="errors.username" />
            <v-text-field v-model="form.password" :label="t('login.password')" type="password" variant="outlined"
              density="compact" class="mb-3" :error-messages="errors.password" />
            <v-text-field v-model="form.confirm" :label="t('setup.confirm_password')" type="password" variant="outlined"
              density="compact" class="mb-4" :error-messages="errors.confirm" />

            <v-alert v-if="apiError" type="error" density="compact" class="mb-4" :text="apiError" />

            <v-btn type="submit" color="primary" variant="flat" block :loading="loading">
              {{ t('setup.submit') }}
            </v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const { t } = useI18n()
const router = useRouter()
const loading = ref(false)
const apiError = ref('')
const form = reactive({ username: '', password: '', confirm: '' })
const errors = reactive({ username: '', password: '', confirm: '' })

function validate() {
  errors.username = form.username.trim() ? '' : t('setup.error_required')
  errors.password = form.password.length >= 8 ? '' : t('setup.error_min_length')
  errors.confirm = form.password === form.confirm ? '' : t('setup.error_mismatch')
  return !errors.username && !errors.password && !errors.confirm
}

async function submit() {
  apiError.value = ''
  if (!validate()) return
  loading.value = true
  try {
    await $fetch('/api/setup', { method: 'POST', body: { username: form.username.trim(), password: form.password } })
    await router.push('/dashboard')
  } catch (e: any) {
    apiError.value = e?.data?.statusMessage ?? t('setup.error_default')
  } finally {
    loading.value = false
  }
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
