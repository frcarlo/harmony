<template>
  <div :style="dashboard ? bgBase : undefined" style="min-height:100vh;position:relative">
    <template v-if="dashboard">
    <div v-if="bgImage" :style="bgImageStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
    <div v-if="bgImage" :style="bgOverlayStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
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
      :can-undo="dashboardStore.canUndo"
      :can-redo="dashboardStore.canRedo"
      @back="router.push(`/dashboard/${route.params.id}`)"
      @toggle-edit="handleToggleEdit"
      @add-widget="pickerOpen = true"
      @save="handleSave"
      @undo="dashboardStore.undo()"
      @redo="dashboardStore.redo()"
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

    <LazyWidgetPicker v-if="pickerOpen" :open="pickerOpen" @close="pickerOpen = false" />
    <LazyWidgetConfigPanel v-if="selectedWidgetId" :open="!!selectedWidgetId"
      @close="dashboardStore.commitUndoGroup(); dashboardStore.setSelectedWidget(null)" />

    <v-dialog v-model="leaveDialogOpen" max-width="380" persistent>
      <v-card rounded="lg">
        <v-card-text class="pt-5 pb-2">
          <div class="d-flex align-center ga-3 mb-3">
            <v-icon icon="mdi-alert-circle-outline" color="warning" size="28" />
            <span class="text-subtitle-1 font-weight-bold">{{ t('dashboard.unsaved_changes_title') }}</span>
          </div>
          <div class="text-body-2 text-medium-emphasis">{{ t('dashboard.unsaved_changes_body') }}</div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4 ga-2">
          <v-btn variant="tonal" class="flex-grow-1" @click="leaveDialogOpen = false">
            {{ t('dashboard.unsaved_changes_stay') }}
          </v-btn>
          <v-btn color="warning" variant="flat" class="flex-grow-1" @click="confirmLeave">
            {{ t('dashboard.unsaved_changes_leave') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTheme } from 'vuetify'
import type { Dashboard } from '~/types/dashboard'

const { t } = useI18n()
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
const leaveDialogOpen = ref(false)
const pendingNavTarget = ref<string | null>(null)
const globalTheme = computed(() => storage.read('ha-theme', 'dark') ?? 'dark')

let savedSnapshot = ''
const isDirty = computed(() => !!dashboard.value && JSON.stringify(dashboard.value) !== savedSnapshot)

const bgBase = computed(() => {
  const bg = dashboard.value?.background
  if (!bg) return { backgroundColor: 'rgb(var(--v-theme-background))' }
  if (bg.startsWith('url(') || bg.startsWith('http') || bg.startsWith('/api/')) {
    return { backgroundColor: 'rgb(var(--v-theme-background))' }
  }
  return { background: bg }
})

const bgImage = computed(() => {
  const bg = dashboard.value?.background
  if (!bg) return null
  if (bg.startsWith('url(')) return bg.slice(4, -1)
  if (bg.startsWith('http') || bg.startsWith('/api/')) return bg
  return null
})

const bgImageStyle = computed(() => ({
  backgroundImage: `url(${bgImage.value})`,
  backgroundSize: dashboard.value?.bg_size ?? 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}))

const bgOverlayStyle = computed(() => {
  const dim = 1 - (dashboard.value?.bg_opacity ?? 100) / 100
  return { background: `rgba(0,0,0,${dim.toFixed(2)})` }
})

onBeforeMount(() => {
  dashboardStore.clearDashboard()
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
  savedSnapshot = JSON.stringify(data)
  dashboardStore.setEditMode(true)
})

watch(() => dashboard.value?.theme_override, (override) => {
  theme.change(override || globalTheme.value)
}, { immediate: true })

onBeforeRouteLeave((to) => {
  if (typeof to.path === 'string' && to.path.startsWith('/edit/')) {
    return
  }
  if (isDirty.value) {
    pendingNavTarget.value = to.fullPath
    leaveDialogOpen.value = true
    return false
  }
  theme.change(globalTheme.value)
})

function confirmLeave() {
  leaveDialogOpen.value = false
  theme.change(globalTheme.value)
  savedSnapshot = JSON.stringify(dashboard.value)
  if (pendingNavTarget.value) router.push(pendingNavTarget.value)
}

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
    savedSnapshot = JSON.stringify(dashboard.value)
    toast.success(t('dashboard.saved'))
  } catch {
    toast.error(t('dashboard.save_failed'))
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

watch(selectedWidgetId, (newId, oldId) => {
  if (newId !== null && oldId === null) dashboardStore.beginUndoGroup()
})

onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); dashboardStore.undo() }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); dashboardStore.redo() }
  }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})
</script>
