<template>
  <v-card :to="`/dashboard/${dashboard.id}`" hover :class="{ 'widget-glass': glass }"
    class="border-md border-primary rounded-lg dashboard-card" :style="cardPreviewStyle">
    <div v-if="themeMeta" class="dashboard-theme-bar" />
    <v-card-item>
      <template v-if="isAdmin && editMode" #prepend>
        <v-icon class="drag-handle card-drag-handle" icon="mdi-drag-vertical" color="medium-emphasis" size="18" @click.prevent />
      </template>
      <v-card-title class="text-body-1 d-flex align-center ga-2">
        <v-icon :icon="dashboard.icon || 'mdi-view-dashboard-outline'" color="medium-emphasis" size="18" />
        {{ dashboard.name }}
        <v-chip v-if="currentDefaultLabel" size="x-small" color="warning" variant="tonal">
          {{ currentDefaultLabel }}
        </v-chip>
        <v-chip v-else-if="dashboard.is_default" size="x-small" color="warning" variant="outlined">
          {{ t('dashboard.global_default_badge') }}
        </v-chip>
      </v-card-title>
      <v-card-subtitle class="d-flex align-center ga-2 flex-wrap">
        <span>{{ t('dashboard.edited', { date: formatDate(dashboard.updated_at) }) }}</span>
        <v-chip v-if="themeMeta" size="x-small" rounded="pill" variant="outlined" class="dashboard-theme-chip">
          <span class="dashboard-theme-chip__swatch" />
          {{ themeMeta.name }}
        </v-chip>
      </v-card-subtitle>
      <template v-if="isAdmin && editMode" #append>
        <div class="card-actions d-flex ga-1">
          <v-btn icon="mdi-pencil-outline" size="x-small" variant="plain" :to="`/edit/${dashboard.id}`"
            @click.stop />
          <v-btn icon="mdi-content-copy" size="x-small" variant="plain" :loading="cloning"
            :title="t('dashboard.clone')" @click.stop.prevent="handleClone" />
          <v-btn icon="mdi-export-variant" size="x-small" variant="plain" :loading="exporting"
            :title="t('dashboard.export')" @click.stop.prevent="handleExport" />
          <v-btn
            :icon="dashboard.is_default ? 'mdi-star' : 'mdi-star-outline'"
            size="x-small"
            variant="plain"
            color="warning"
            :title="t('dashboard.set_global_default')"
            @click.stop.prevent="handleSetGlobalDefault"
          />
          <v-btn icon="mdi-trash-can-outline" size="x-small" variant="plain" color="error"
            @click.stop.prevent="confirmOpen = true" />
        </div>
      </template>
    </v-card-item>
  </v-card>

  <v-dialog v-model="confirmOpen" max-width="340">
    <v-card rounded="lg">
      <v-card-text class="pt-5 pb-2">
        <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('dashboard.delete_title', { name: dashboard.name }) }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ t('dashboard.delete_confirm') }}</div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="confirmOpen = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" :loading="deleting" @click="handleDelete">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/it'
import 'dayjs/locale/nl'
import type { DashboardListItem } from '~/types/dashboard'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const { glass } = useGlassEffect()
const { getThemeOption } = useDashboardThemes()
const props = defineProps<{
  dashboard: DashboardListItem
  isAdmin?: boolean
  editMode?: boolean
  currentDefaultLabel?: string | null
}>()
const emit = defineEmits<{ deleted: [] }>()

const now = useNow({ interval: 60_000 })
const confirmOpen = ref(false)
const deleting = ref(false)
const exporting = ref(false)
const cloning = ref(false)
const themeMeta = computed(() => getThemeOption(props.dashboard.theme_override))
const cardPreviewStyle = computed(() => {
  if (!themeMeta.value) return {}
  return {
    '--dashboard-theme-bg': themeMeta.value.bg,
    '--dashboard-theme-primary': themeMeta.value.primary,
  }
})

function formatDate(iso: string) {
  void now.value
  return dayjs(iso).locale(locale.value).fromNow()
}

async function handleClone() {
  cloning.value = true
  try {
    const full = await $fetch<Record<string, unknown>>(`/api/dashboards/${props.dashboard.id}`)
    const cloneName = `${full.name} (Kopie)`
    const created = await $fetch<{ id: string }>('/api/dashboards', {
      method: 'POST',
      body: { name: cloneName, icon: full.icon, theme_override: full.theme_override },
    })
    const widgets = Array.isArray(full.widgets)
      ? (full.widgets as Record<string, unknown>[]).map(w => ({ ...w, id: crypto.randomUUID() }))
      : []
    await $fetch(`/api/dashboards/${created.id}`, {
      method: 'PUT',
      body: { ...full, id: created.id, name: cloneName, widgets },
    })
    toast.success(t('dashboard.cloned', { name: cloneName }))
    emit('deleted') // reused to trigger list reload
  } catch {
    toast.error(t('dashboard.clone_error'))
  } finally {
    cloning.value = false
  }
}

async function handleExport() {
  exporting.value = true
  try {
    const full = await $fetch<object>(`/api/dashboards/${props.dashboard.id}`)
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.dashboard.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error(t('dashboard.export_error'))
  } finally {
    exporting.value = false
  }
}

async function handleSetGlobalDefault() {
  try {
    await $fetch('/api/dashboards/default', {
      method: 'PUT',
      body: { dashboardId: props.dashboard.is_default ? null : props.dashboard.id },
    })
    toast.success(props.dashboard.is_default ? t('dashboard.global_default_cleared') : t('dashboard.global_default_set'))
    emit('deleted')
  } catch {
    toast.error(t('dashboard.global_default_error'))
  }
}

async function handleDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/dashboards/${props.dashboard.id}`, { method: 'DELETE' as any })
    toast.success(t('dashboard.deleted', { name: props.dashboard.name }))
    confirmOpen.value = false
    emit('deleted')
  } catch {
    toast.error(t('dashboard.delete_error'))
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}

.dashboard-card {
  position: relative;
  overflow: hidden;
}

.dashboard-theme-bar {
  height: 5px;
  background: linear-gradient(90deg, var(--dashboard-theme-primary), var(--dashboard-theme-bg));
}

.dashboard-theme-chip {
  backdrop-filter: blur(10px);
}

.dashboard-theme-chip__swatch {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--dashboard-theme-primary);
  display: inline-block;
  margin-right: 6px;
}
</style>
