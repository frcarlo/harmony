<template>
  <div v-if="dashboard" class="d-flex flex-column dashboard-bg" :style="bgStyle" style="min-height:100vh">
    <AppToolbar
      :dashboard-name="dashboard.name"
      :dashboard-id="dashboard.id"
      :dashboard-icon="dashboard.icon"
      :dashboard-background="dashboard.background"
      :edit-mode="editMode"
      :saving="saving"
      @toggle-edit="handleToggleEdit"
      @add-widget="pickerOpen = true"
      @save="handleSave"
      @rename="dashboardStore.updateDashboardName($event)"
      @reicon="dashboardStore.updateDashboardIcon($event)"
      @rebackground="dashboardStore.updateDashboardBackground($event)"
    />
    <v-main>
      <div class="pa-4" style="min-width: 900px">
        <DashboardGrid :edit-mode="editMode" />
      </div>
    </v-main>

    <WidgetPicker :open="pickerOpen" @close="pickerOpen = false" />
    <WidgetConfigPanel :open="!!selectedWidgetId" @close="dashboardStore.setSelectedWidget(null)" />
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Dashboard } from '~/types/dashboard'

const route = useRoute()
const router = useRouter()
const dashboardStore = useDashboardStore()
const dashboard = computed(() => dashboardStore.dashboard)
const editMode = computed(() => dashboardStore.editMode)
const selectedWidgetId = computed(() => dashboardStore.selectedWidgetId)

const pickerOpen = ref(false)
const saving = ref(false)

const bgStyle = computed(() => {
  const bg = dashboard.value?.background
  if (!bg) return {}
  if (bg.startsWith('http') || bg.startsWith('/')) return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: bg }
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
  dashboardStore.setEditMode(true)
})

async function handleSave() {
  if (!dashboard.value) return
  saving.value = true
  try {
    await $fetch(`/api/dashboards/${dashboard.value.id}`, { method: 'PUT', body: dashboard.value })
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
