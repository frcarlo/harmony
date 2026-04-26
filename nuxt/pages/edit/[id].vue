<template>
  <div v-if="dashboard" :style="bgBase" style="min-height:100vh;position:relative">
    <div v-if="bgImage" :style="bgImageStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
    <div class="d-flex flex-column dashboard-bg" style="position:relative;z-index:1;min-height:100vh">
    <AppToolbar
      :dashboard-name="dashboard.name"
      :dashboard-id="dashboard.id"
      :dashboard-icon="dashboard.icon"
      :dashboard-background="dashboard.background"
      :dashboard-bg-opacity="dashboard.bg_opacity"
      :dashboard-bg-size="dashboard.bg_size"
      :dashboard-theme-override="dashboard.theme_override"
      :dashboard-grid-config="dashboard.grid_config"
      :edit-mode="editMode"
      :saving="saving"
      @back="router.push(`/dashboard/${route.params.id}`)"
      @toggle-edit="handleToggleEdit"
      @add-widget="pickerOpen = true"
      @save="handleSave"
      @rename="dashboardStore.updateDashboardName($event)"
      @reicon="dashboardStore.updateDashboardIcon($event)"
      @rebackground="dashboardStore.updateDashboardBackground($event)"
      @rebgopacity="dashboardStore.updateDashboardBgOpacity($event)"
      @rebgsize="dashboardStore.updateDashboardBgSize($event)"
      @retheme="dashboardStore.updateDashboardTheme($event)"
      @regrid="dashboardStore.updateGridConfig($event)"
    />
    <v-main>
      <div class="pa-4" style="min-width: 900px">
        <DashboardGrid :edit-mode="editMode" />
      </div>
    </v-main>

    <WidgetPicker :open="pickerOpen" @close="pickerOpen = false" />
    <WidgetConfigPanel :open="!!selectedWidgetId" @close="dashboardStore.setSelectedWidget(null)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTheme } from 'vuetify'
import type { Dashboard } from '~/types/dashboard'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()
const theme = useTheme()
const storage = useUserPreferenceStorage()
const dashboard = computed(() => dashboardStore.dashboard)
const editMode = computed(() => dashboardStore.editMode)
const selectedWidgetId = computed(() => dashboardStore.selectedWidgetId)

const pickerOpen = ref(false)
const saving = ref(false)
const globalTheme = computed(() => storage.read('ha-theme', 'dark') ?? 'dark')

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

onBeforeMount(() => {
  dashboardStore.clearDashboard()
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
  dashboardStore.setEditMode(true)
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

async function handleSave() {
  if (!dashboard.value) return
  saving.value = true
  try {
    await $fetch(`/api/dashboards/${dashboard.value.id}`, {
      method: 'PUT',
      body: {
        ...dashboard.value,
        icon: dashboard.value.icon ?? null,
        background: dashboard.value.background ?? null,
        bg_opacity: dashboard.value.bg_opacity ?? null,
        bg_size: dashboard.value.bg_size ?? null,
        theme_override: dashboard.value.theme_override ?? null,
      },
    })
    toast.success('Dashboard gespeichert')
  } catch {
    toast.error('Speichern fehlgeschlagen')
  } finally {
    saving.value = false
  }
}

async function handleToggleEdit() {
  if (editMode.value) {
    await handleSave()
    dashboardStore.setEditMode(false)
    router.push(`/dashboard/${dashboard.value!.id}`)
  } else {
    dashboardStore.setEditMode(true)
  }
}

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
  }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})
</script>
