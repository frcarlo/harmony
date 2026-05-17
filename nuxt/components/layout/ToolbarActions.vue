<template>
  <ConnectionStatus class="mr-2" />

  <v-btn icon="mdi-bell-cog-outline" size="small" variant="text" @click="openDialog" />

  <!-- User menu (always visible, contains mobile extras) -->
  <v-menu>
    <template #activator="{ props: mp }">
      <v-btn icon="mdi-account-circle-outline" size="small" variant="text" v-bind="mp" />
    </template>
    <v-card rounded="lg" min-width="200" :class="{ 'theme-card-glass': glass }">
      <v-list density="compact" nav>
        <v-list-item :title="user?.username" :subtitle="t('toolbar.signed_in')" disabled />
        <v-divider class="my-1" />

        <!-- View settings — always in menu -->
        <v-list-item :prepend-icon="glass ? 'mdi-blur' : 'mdi-blur-off'"
          :title="t('toolbar.glass_effect')" :active="glass" :color="glass ? 'primary' : undefined"
          rounded="lg" @click="toggleGlass" />
        <v-list-item :prepend-icon="borders ? 'mdi-border-all' : 'mdi-border-none'"
          :title="t('toolbar.widget_borders')" :active="borders" :color="borders ? 'primary' : undefined"
          rounded="lg" @click="toggleBorders" />
        <v-list-item :prepend-icon="performanceMode ? 'mdi-speedometer' : 'mdi-speedometer-slow'"
          :title="t('toolbar.performance_mode')"
          :subtitle="forcedPerformanceMode != null ? t('toolbar.performance_mode_forced') : t('toolbar.performance_mode_hint')"
          :active="performanceMode" :color="performanceMode ? 'primary' : undefined"
          :disabled="forcedPerformanceMode != null"
          rounded="lg" @click="togglePerformanceMode" />
        <v-list-item v-if="!forcedKioskMode" :prepend-icon="kioskMode ? 'mdi-fullscreen' : 'mdi-fullscreen-exit'"
          :title="t('toolbar.kiosk_mode')" :subtitle="t('toolbar.kiosk_mode_hint')"
          :active="kioskMode" :color="kioskMode ? 'primary' : undefined"
          rounded="lg" @click="toggleKioskMode" />
        <v-list-item prepend-icon="mdi-monitor-cellphone" :title="t('toolbar.device_type')"
          :subtitle="forcedDeviceType ? t('toolbar.device_type_forced') : undefined" rounded="lg">
          <template #append>
            <div class="d-flex ga-1">
              <v-chip v-for="dt in deviceTypeOptions" :key="dt.value" size="x-small"
                :color="effectiveDeviceOverride === dt.value ? 'primary' : undefined"
                :variant="effectiveDeviceOverride === dt.value ? 'flat' : 'outlined'"
                :disabled="!!forcedDeviceType && dt.value !== 'auto'"
                @click.stop="!forcedDeviceType && setDeviceOverride(dt.value)">
                {{ dt.label }}
              </v-chip>
            </div>
          </template>
        </v-list-item>
        <v-list-item prepend-icon="mdi-palette" :title="t('toolbar.theme')" rounded="lg">
          <template #append>
            <ThemeToggle button-icon="mdi-chevron-down" :button-title="t('toolbar.theme')" />
          </template>
        </v-list-item>
        <v-list-item prepend-icon="mdi-translate" :title="locale.toUpperCase()" rounded="lg">
          <template #append>
            <div class="d-flex ga-1 flex-wrap justify-end" style="max-width:120px">
              <v-chip v-for="loc in availableLocales" :key="loc.code" size="x-small"
                :color="locale === loc.code ? 'primary' : undefined"
                :variant="locale === loc.code ? 'flat' : 'outlined'"
                @click.stop="changeLocale(loc.code)">
                {{ loc.code.toUpperCase() }}
              </v-chip>
            </div>
          </template>
        </v-list-item>
        <v-list-item
          v-if="canEdit"
          :prepend-icon="editMode ? 'mdi-pencil-off-outline' : 'mdi-pencil-outline'"
          :title="editMode ? t('toolbar.edit_mode_off') : t('toolbar.edit_mode_on')"
          :active="editMode"
          :color="editMode ? 'primary' : undefined"
          rounded="lg"
          @click="emit('toggle-edit')"
        />
        <v-divider class="my-1" />

        <v-list-item v-if="user?.role === 'admin'" prepend-icon="mdi-account-cog-outline"
          :title="t('toolbar.user_mgmt')" rounded="lg" to="/admin/users" />
        <v-list-item
          prepend-icon="mdi-lock-reset"
          :title="t('toolbar.change_password')"
          rounded="lg"
          @click="openChangePassword"
        />
        <v-list-item
          prepend-icon="mdi-broom"
          :title="t('toolbar.reset_local_settings')"
          :subtitle="t('toolbar.reset_local_settings_hint')"
          rounded="lg"
          @click="resetLocalSettings"
        />
        <v-list-item prepend-icon="mdi-logout" :title="t('toolbar.logout')" rounded="lg" @click="logout" />
        <v-divider class="my-1" />
        <v-list-item prepend-icon="mdi-github" title="GitHub" :subtitle="`v${config.public.appVersion}`"
          rounded="lg" :href="config.public.githubUrl" target="_blank" density="compact" />
      </v-list>
    </v-card>
  </v-menu>

  <!-- Self-service password change dialog -->
  <v-dialog v-model="changePwDialog" max-width="380">
    <v-card rounded="xl" :class="{ 'theme-card-glass': glass }">
      <v-card-text class="pa-6">
        <div class="text-subtitle-1 font-weight-bold mb-4">{{ t('toolbar.change_password') }}</div>
        <div class="d-flex flex-column ga-3">
          <v-text-field
            v-model="changePwForm.current_password"
            :label="t('users.current_password')"
            type="password"
            density="compact"
            variant="outlined"
            hide-details
            autofocus
          />
          <v-text-field
            v-model="changePwForm.new_password"
            :label="t('users.new_password')"
            type="password"
            density="compact"
            variant="outlined"
            hide-details="auto"
            :rules="[v => v.length >= 8 || t('login.error_min_length')]"
          />
          <v-alert v-if="changePwError" type="error" density="compact" :text="changePwError" />
        </div>
      </v-card-text>
      <v-card-actions class="px-6 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="changePwDialog = false">{{ t('common.cancel') }}</v-btn>
        <v-btn
          color="primary" variant="flat"
          :loading="changePwSaving"
          :disabled="!changePwForm.current_password || changePwForm.new_password.length < 8"
          @click="handleChangePassword"
        >{{ t('users.change_password') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTheme } from 'vuetify'
import type { DeviceOverride } from '~/composables/useDashboardDisplayMode'

const { t, locale, setLocale, locales } = useI18n()
type LocaleCode = 'de' | 'en' | 'es' | 'fr' | 'it' | 'nl'
const config = useRuntimeConfig()
const { glass, toggle: toggleGlass } = useGlassEffect()
const { borders, toggle: toggleBorders } = useWidgetBorders()
const { performanceMode, kioskMode, forcedKioskMode, forcedPerformanceMode, deviceOverride, forcedDeviceType, togglePerformanceMode, toggleKioskMode, setKioskMode, setDeviceOverride } = useDashboardDisplayMode()

const deviceTypeOptions: { value: DeviceOverride; label: string }[] = [
  { value: 'auto', label: t('toolbar.device_auto') },
  { value: 'desktop', label: t('toolbar.device_desktop') },
  { value: 'tablet', label: t('toolbar.device_tablet') },
  { value: 'mobile', label: t('toolbar.device_mobile') },
]
const effectiveDeviceOverride = computed(() => forcedDeviceType.value ?? deviceOverride.value)
const availableLocales = computed(() => (locales.value as { code: LocaleCode; name: string }[]))
const { openDialog } = useNotificationRulesDialog()
const theme = useTheme()
const dashboardStore = useDashboardStore()

const props = defineProps<{ editMode?: boolean; canEdit?: boolean }>()
const emit = defineEmits<{ 'toggle-edit': [] }>()

const { user, clear } = useUserSession()
const storage = useUserPreferenceStorage()

function changeLocale(code: LocaleCode) {
  setLocale(code)
  storage.write('ha-locale', code)
}

function resetLocalSettings() {
  if (!import.meta.client) return

  storage.clearCurrentUserSettings()

  glass.value = false
  borders.value = true
  if (forcedPerformanceMode.value == null) performanceMode.value = false
  setDeviceOverride('auto')
  void setKioskMode(forcedKioskMode.value, { fullscreen: false })

  const effectiveTheme = dashboardStore.dashboard?.theme_override ?? storage.read('ha-theme', 'dark') ?? 'dark'
  theme.change(effectiveTheme)

  toast.success(t('toolbar.local_settings_reset_done'))
}

async function logout() {
  let keycloakLogoutUrl: string | undefined
  try {
    const res = await $fetch<{ ok: boolean; keycloakLogoutUrl?: string }>('/api/auth/logout', { method: 'POST' })
    keycloakLogoutUrl = res.keycloakLogoutUrl
  } catch { /* ignore server errors — still clear client state */ }
  clear()
  if (keycloakLogoutUrl) {
    window.location.href = keycloakLogoutUrl
  } else {
    await navigateTo('/login')
  }
}

const changePwDialog = ref(false)
const changePwForm = reactive({ current_password: '', new_password: '' })
const changePwError = ref('')
const changePwSaving = ref(false)

function openChangePassword() {
  changePwForm.current_password = ''
  changePwForm.new_password = ''
  changePwError.value = ''
  changePwDialog.value = true
}

async function handleChangePassword() {
  changePwError.value = ''
  changePwSaving.value = true
  try {
    await $fetch('/api/users/me/password', {
      method: 'PUT',
      body: { current_password: changePwForm.current_password, new_password: changePwForm.new_password },
    })
    changePwDialog.value = false
    toast.success(t('users.password_changed'))
  } catch (e: any) {
    changePwError.value = e?.data?.statusMessage ?? t('users.error_default')
  } finally {
    changePwSaving.value = false
  }
}
</script>
