<template>
  <v-main>
    <v-app-bar color="transparent" border="b" elevation="0">
      <template #prepend>
        <v-icon icon="mdi-home-assistant" class="ml-4" color="#18BCF2" />
      </template>
      <v-app-bar-title class="text-body-1 font-weight-semibold">HArmony</v-app-bar-title>
      <template #append>
        <v-btn v-if="isAdmin" icon="mdi-import" size="small" variant="text" :title="t('dashboard.import')"
          :loading="importing" @click="importInput?.click()" />
        <input ref="importInput" type="file" accept=".json,application/json" class="d-none" @change="handleImport" />
        <ToolbarActions :edit-mode="listEditMode" :can-edit="isAdmin" @toggle-edit="listEditMode = !listEditMode" />
      </template>
    </v-app-bar>

    <v-container fluid class="pa-6">

      <draggable v-if="dashboards.length > 0" v-model="dashboards" item-key="id"
        handle=".drag-handle" :animation="150" :disabled="!isAdmin || !listEditMode"
        class="v-row" @end="saveOrder">
        <template #item="{ element }">
          <v-col cols="12" sm="6" lg="4" xl="3">
            <DashboardCard :dashboard="element" :is-admin="isAdmin" :edit-mode="listEditMode" @deleted="loadDashboards" />
          </v-col>
        </template>
      </draggable>

      <div v-else class="d-flex flex-column align-center justify-center py-16 text-center">
        <v-icon icon="mdi-view-grid-outline" size="64" color="medium-emphasis" class="mb-4" style="opacity:0.3" />
        <h3 class="text-h6 font-weight-medium mb-2">{{ t('dashboard.empty_title') }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-6" style="max-width:340px">
          {{ t('dashboard.empty_description') }}
        </p>
      </div>
    </v-container>

    <CreateDashboardButton v-if="isAdmin" @created="loadDashboards" />
  </v-main>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { toast } from 'vue-sonner'
import type { DashboardListItem } from '~/types/dashboard'

const { t } = useI18n()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const dashboards = ref<DashboardListItem[]>([])
const listEditMode = ref(false)
const importing = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

async function loadDashboards() {
  dashboards.value = await $fetch<DashboardListItem[]>('/api/dashboards')
}

onMounted(loadDashboards)

async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!importInput.value) return
  importInput.value.value = ''
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.name || !Array.isArray(data.widgets)) {
      toast.error(t('dashboard.import_error'))
      return
    }

    const idExists = dashboards.value.some(d => d.id === data.id)
    let importName = data.name
    if (idExists) {
      importName = `${data.name} (Kopie)`
      toast.info(t('dashboard.import_exists', { name: data.name }))
    }

    const created = await $fetch<{ id: string }>('/api/dashboards', {
      method: 'POST',
      body: { name: importName, icon: data.icon, theme_override: data.theme_override },
    })
    const widgets = Array.isArray(data.widgets)
      ? data.widgets.map((w: Record<string, unknown>) => ({ ...w, id: crypto.randomUUID() }))
      : []
    await $fetch(`/api/dashboards/${created.id}`, {
      method: 'PUT',
      body: { ...data, id: created.id, name: importName, widgets },
    })

    toast.success(t('dashboard.imported', { name: importName }))
    await loadDashboards()
  } catch {
    toast.error(t('dashboard.import_error'))
  } finally {
    importing.value = false
  }
}

async function saveOrder() {
  if (!isAdmin.value) return
  await $fetch('/api/dashboards/reorder', {
    method: 'PUT',
    body: { ids: dashboards.value.map((d) => d.id) },
  })
}
</script>
