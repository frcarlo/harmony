<template>
  <div v-if="!connected" class="d-flex align-center justify-center" style="min-height:100vh">
    <div class="d-flex flex-column align-center ga-4">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="text-body-2 text-medium-emphasis">{{ t('common.connecting') }}</span>
    </div>
  </div>

  <div v-else-if="dashboard" :style="bgBase" style="min-height:100vh;position:relative">
    <div v-if="bgImage" :style="bgImageStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
    <div class="d-flex flex-column" style="position:relative;z-index:1;min-height:100vh">
      <AppToolbar
        :dashboard-name="dashboard.name"
        :dashboard-id="dashboard.id"
        :dashboard-icon="dashboard.icon"
        :is-my-default-dashboard="dashboard.id === myDefaultDashboardId"
        :edit-mode="false"
        :hide-edit="!isAdmin"
        @back="goBack"
        @toggle-edit="router.push(`/edit/${dashboard.id}`)"
        @toggle-my-default="toggleMyDefaultDashboard"
      />
      <v-main>
        <div class="pa-4">
          <DashboardGrid :edit-mode="false" />
        </div>
      </v-main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { toast } from 'vue-sonner'
import type { Dashboard } from '~/types/dashboard'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const dashboardNavStack = useState<string[]>('dashboardNavStack', () => [])
const dashboardNavGoingBack = useState('dashboardNavGoingBack', () => false)

function goBack() {
  const stack = dashboardNavStack.value
  if (stack.length > 0) {
    dashboardNavGoingBack.value = true
    const target = stack[stack.length - 1]
    dashboardNavStack.value = stack.slice(0, -1)
    router.push(target)
  } else {
    router.push('/dashboard')
  }
}
const dashboardStore = useDashboardStore()
const entityStore = useEntityStore()
const theme = useTheme()
const storage = useUserPreferenceStorage()
const dashboard = computed(() => dashboardStore.dashboard)
const connected = computed(() => entityStore.connected)
const globalTheme = computed(() => storage.read('ha-theme', 'dark') ?? 'dark')
const myDefaultDashboardId = ref<string | null>(null)

const bgBase = computed(() => ({ backgroundColor: 'rgb(var(--v-theme-background))' }))

const bgImage = computed(() => {
  const bg = dashboard.value?.background
  if (!bg) return null
  if (bg.startsWith('url(')) return bg.slice(4, -1)
  if (bg.startsWith('http') || bg.startsWith('/api/')) return bg
  return null
})

const bgImageStyle = computed(() => {
  const size = dashboard.value?.bg_size ?? 'cover'
  const opacity = (dashboard.value?.bg_opacity ?? 100) / 100
  return {
    backgroundImage: `url(${bgImage.value})`,
    backgroundSize: size,
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity,
  }
})

const bgStyle = computed(() => {
  if (bgImage.value) return bgBase.value
  const bg = dashboard.value?.background
  const base = { backgroundColor: 'rgb(var(--v-theme-background))' }
  if (!bg) return base
  return { ...base, background: bg }
})

onBeforeMount(() => {
  dashboardStore.clearDashboard()
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
  const preference = await $fetch<{ dashboardId: string | null }>('/api/users/me/default-dashboard')
  myDefaultDashboardId.value = preference.dashboardId
})

watch(() => dashboard.value?.theme_override, (override) => {
  theme.change(override || globalTheme.value)
}, { immediate: true })

onBeforeRouteLeave((to) => {
  if (typeof to.path === 'string' && (to.path.startsWith('/dashboard/') || to.path.startsWith('/edit/'))) {
    return
  }
  theme.change(globalTheme.value)
})

async function toggleMyDefaultDashboard() {
  if (!dashboard.value) return
  const nextDashboardId = myDefaultDashboardId.value === dashboard.value.id ? null : dashboard.value.id
  try {
    await $fetch('/api/users/me/default-dashboard', {
      method: 'PUT',
      body: { dashboardId: nextDashboardId },
    })
    myDefaultDashboardId.value = nextDashboardId
    toast.success(nextDashboardId ? t('dashboard.my_default_set') : t('dashboard.my_default_cleared'))
  } catch {
    toast.error(t('dashboard.my_default_error'))
  }
}
</script>
