<template>
  <div v-if="!connected" class="d-flex align-center justify-center" style="min-height:100vh">
    <div class="d-flex flex-column align-center ga-4">
      <v-progress-circular indeterminate color="primary" size="48" />
      <span class="text-body-2 text-medium-emphasis">{{ t('common.connecting') }}</span>
    </div>
  </div>

  <div v-else-if="dashboard" class="d-flex flex-column" :style="bgStyle" style="min-height:100vh">
    <AppToolbar
      :dashboard-name="dashboard.name"
      :dashboard-id="dashboard.id"
      :edit-mode="false"
      :hide-edit="!isAdmin"
      @toggle-edit="router.push(`/edit/${dashboard.id}`)"
    />
    <v-main>
      <div class="pa-4">
        <DashboardGrid :edit-mode="false" />
      </div>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import type { Dashboard } from '~/types/dashboard'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')
const dashboardStore = useDashboardStore()
const entityStore = useEntityStore()
const theme = useTheme()
const dashboard = computed(() => dashboardStore.dashboard)
const connected = computed(() => entityStore.connected)
const globalTheme = computed(() => import.meta.client ? (localStorage.getItem('ha-theme') ?? 'dark') : 'dark')

const bgStyle = computed(() => {
  const bg = dashboard.value?.background
  const base = { backgroundColor: 'rgb(var(--v-theme-background))' }
  if (!bg) return base
  if (bg.startsWith('http') || bg.startsWith('/')) {
    return {
      ...base,
      backgroundImage: `url(${bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  }
  return { ...base, background: bg }
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
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
</script>
