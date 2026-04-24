<template>
  <v-card :to="`/dashboard/${dashboard.id}`" :class="{ 'widget-glass': glass }"
    class="rounded-xl dashboard-card" :style="cardPreviewStyle">

    <!-- Header preview with dashboard background -->
    <div class="dashboard-card__header" :style="headerStyle">
      <div class="dashboard-card__header-overlay" />
      <v-icon :icon="dashboard.icon || 'mdi-view-dashboard-outline'"
        class="dashboard-card__header-icon" />
      <v-icon v-if="isAdmin && editMode"
        class="drag-handle dashboard-card__drag"
        icon="mdi-drag-vertical" size="18"
        @click.prevent />
    </div>

    <!-- Card body -->
    <v-card-item class="pt-3 pb-1">
      <v-card-title class="text-body-1 font-weight-bold d-flex align-center ga-2 flex-wrap">
        {{ dashboard.name }}
        <v-chip v-if="currentDefaultLabel" size="x-small" color="warning" variant="tonal">
          {{ currentDefaultLabel }}
        </v-chip>
        <v-chip v-else-if="dashboard.is_default" size="x-small" color="warning" variant="outlined">
          {{ t('dashboard.global_default_badge') }}
        </v-chip>
      </v-card-title>
      <v-card-subtitle class="d-flex align-center ga-2 flex-wrap mt-1">
        <span>{{ t('dashboard.edited', { date: formatDate(dashboard.updated_at) }) }}</span>
        <v-chip v-if="themeMeta" size="x-small" rounded="pill" variant="outlined" class="dashboard-theme-chip">
          <span class="dashboard-theme-chip__swatch" />
          {{ themeMeta.name }}
        </v-chip>
      </v-card-subtitle>
    </v-card-item>

    <!-- Edit actions -->
    <div v-if="isAdmin && editMode" class="d-flex justify-end ga-1 px-2 pb-2">
      <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" :to="`/edit/${dashboard.id}`"
        @click.stop />
      <v-btn icon="mdi-content-copy" size="x-small" variant="text" :loading="cloning"
        :title="t('dashboard.clone')" @click.stop.prevent="handleClone" />
      <v-btn icon="mdi-export-variant" size="x-small" variant="text" :loading="exporting"
        :title="t('dashboard.export')" @click.stop.prevent="handleExport" />
      <v-btn
        :icon="dashboard.is_default ? 'mdi-star' : 'mdi-star-outline'"
        size="x-small" variant="text" color="warning"
        :title="t('dashboard.set_global_default')"
        @click.stop.prevent="handleSetGlobalDefault"
      />
      <v-btn icon="mdi-trash-can-outline" size="x-small" variant="text" color="error"
        @click.stop.prevent="confirmOpen = true" />
    </div>
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

const headerStyle = computed(() => {
  const bg = props.dashboard.background
  if (bg?.startsWith('http') || bg?.startsWith('/')) {
    return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  }
  if (bg) return { background: bg }
  if (themeMeta.value) {
    return { background: `linear-gradient(135deg, ${themeMeta.value.bg} 0%, color-mix(in srgb, ${themeMeta.value.primary} 40%, ${themeMeta.value.bg}) 100%)` }
  }
  return { background: 'linear-gradient(135deg, rgba(var(--v-theme-primary), 0.18) 0%, rgba(var(--v-theme-surface-variant), 0.6) 100%)' }
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
    emit('deleted')
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
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.dashboard-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22) !important;
}

.dashboard-card__header {
  position: relative;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dashboard-card__header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%);
}

.dashboard-card__header-icon {
  font-size: 36px;
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.92) !important;
  filter: drop-shadow(0 1px 4px rgba(0,0,0,0.4));
}

.dashboard-card__drag {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  color: rgba(255,255,255,0.7) !important;
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
