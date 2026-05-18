<template>
  <v-card :to="`/dashboard/${dashboard.id}`" :class="{ 'widget-glass': glass, 'dashboard-card--edit': editMode }"
    class="dashboard-card" :style="cardPreviewStyle">

    <!-- Shimmer sweep on hover -->
    <div class="dashboard-card__shimmer" />

    <div class="dashboard-card__header" :style="headerStyle">
      <div class="dashboard-card__header-overlay" />
      <!-- Dot grid pattern -->
      <div class="dashboard-card__header-pattern" />

      <!-- Default chip top-left -->
      <v-chip v-if="currentDefaultLabel" size="x-small" color="warning" variant="flat"
        class="dashboard-card__default-chip">
        {{ currentDefaultLabel }}
      </v-chip>
      <v-chip v-else-if="dashboard.is_default" size="x-small" color="warning" variant="tonal"
        class="dashboard-card__default-chip">
        {{ t('dashboard.global_default_badge') }}
      </v-chip>

      <!-- Drag handle -->
      <div v-if="isAdmin && editMode" class="dashboard-card__drag" @click.prevent @mousedown.stop>
        <v-icon icon="mdi-drag-vertical" size="18" style="color: rgba(255,255,255,0.7);" />
      </div>


      <!-- Centered icon badge -->
      <div class="dashboard-card__icon-badge">
        <v-icon :icon="dashboard.icon || 'mdi-view-dashboard-outline'" class="dashboard-card__header-icon" />
      </div>
    </div>

    <div class="dashboard-card__body">
      <div class="dashboard-card__title">{{ dashboard.name }}</div>
      <div class="dashboard-card__meta">
        <span class="dashboard-card__edited">
          <v-icon icon="mdi-clock-outline" size="10" style="opacity:0.45;margin-right:3px;vertical-align:middle" />
          {{ formatDate(dashboard.updated_at) }}
        </span>
        <v-chip v-if="themeMeta" size="x-small" rounded="pill" variant="outlined" class="dashboard-theme-chip">
          <span class="dashboard-theme-chip__swatch" />
          {{ themeMeta.name }}
        </v-chip>
      </div>
    </div>

    <!-- Hover arrow -->
    <div class="dashboard-card__arrow">
      <v-icon icon="mdi-arrow-right" size="14" />
    </div>

    <div v-if="isAdmin" class="dashboard-card__actions" :class="{ 'dashboard-card__actions--edit': editMode }">
      <v-btn icon="mdi-pencil-outline" size="x-small" variant="text" :to="`/edit/${dashboard.id}`"
        :title="t('common.edit')" @click.stop />
      <v-btn icon="mdi-content-copy" size="x-small" variant="text" :loading="cloning" :title="t('dashboard.clone')"
        @click.stop.prevent="handleClone" />
      <v-btn icon="mdi-export-variant" size="x-small" variant="text" :loading="exporting" :title="t('dashboard.export')"
        @click.stop.prevent="handleExport" />
      <v-btn :icon="dashboard.is_default ? 'mdi-star' : 'mdi-star-outline'" size="x-small" variant="text"
        color="warning" :title="t('dashboard.set_global_default')" @click.stop.prevent="handleSetGlobalDefault" />
      <v-btn icon="mdi-trash-can-outline" size="x-small" variant="text" color="error"
        @click.stop.prevent="confirmOpen = true" />
    </div>
  </v-card>

  <v-dialog v-model="confirmOpen" max-width="340">
    <v-card rounded="lg">
      <v-card-text class="pt-5 pb-2">
        <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('dashboard.delete_title', { name: dashboard.name }) }}
        </div>
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
const emit = defineEmits<{ deleted: [], updated: [] }>()

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
    return { background: `linear-gradient(155deg, ${themeMeta.value.bg} 0%, color-mix(in srgb, ${themeMeta.value.primary} 55%, ${themeMeta.value.bg}) 100%)` }
  }
  return { background: 'linear-gradient(155deg, rgba(var(--v-theme-primary), 0.35) 0%, rgba(var(--v-theme-surface-variant), 0.7) 100%)' }
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
    emit('updated')
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
    emit('updated')
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
.dashboard-card__drag {
  cursor: grab;
}

.dashboard-card__drag:active {
  cursor: grabbing;
}

/* ── Card shell ─────────────────────────────────── */
.dashboard-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px !important;
  min-height: 196px;
  background: rgba(var(--v-theme-surface), 0.72);
  backdrop-filter: blur(12px);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07) !important;
  display: flex;
  flex-direction: column;
}

.dashboard-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.3) !important;
  border-color: rgba(var(--v-theme-primary), 0.32) !important;
}

.dashboard-card--edit {
  border-color: rgba(var(--v-theme-primary), 0.22) !important;
}

/* ── Shimmer sweep ──────────────────────────────── */
.dashboard-card__shimmer {
  position: absolute;
  top: 0;
  left: -80%;
  width: 50%;
  height: 110px;
  /* covers header */
  background: linear-gradient(105deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
  z-index: 3;
  pointer-events: none;
  transition: left 0.65s ease;
}

.dashboard-card:hover .dashboard-card__shimmer {
  left: 160%;
}

/* ── Header ─────────────────────────────────────── */
.dashboard-card__header {
  position: relative;
  height: 110px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dashboard-card__header-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom,
      rgba(0, 0, 0, 0.04) 0%,
      rgba(0, 0, 0, 0.5) 100%);
}

/* Dot grid pattern overlay */
.dashboard-card__header-pattern {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
  background-size: 18px 18px;
  opacity: 0.35;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 100% 100% at 50% 50%, black 0%, transparent 85%);
}

.dashboard-card__default-chip {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 2;
  font-weight: 700;
}

.dashboard-card__drag {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  color: rgba(255, 255, 255, 0.7) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  opacity: 1 !important;
}

/* ── Centered circular icon badge ───────────────── */
.dashboard-card__icon-badge {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.28),
    0 6px 24px rgba(0, 0, 0, 0.32),
    0 0 0 6px rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.dashboard-card:hover .dashboard-card__icon-badge {
  transform: scale(1.08);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.36),
    0 10px 32px rgba(0, 0, 0, 0.38),
    0 0 0 8px rgba(255, 255, 255, 0.08);
}

.dashboard-card__header-icon {
  font-size: 28px;
  color: rgba(255, 255, 255, 0.95) !important;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
}

/* ── Body ───────────────────────────────────────── */
.dashboard-card__body {
  padding: 13px 16px 38px;
  flex-grow: 1;
}

.dashboard-card__title {
  font-size: 1.05rem;
  line-height: 1.25;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.015em;
}

.dashboard-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 20px;
  margin-top: 4px;
}

.dashboard-card__edited {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.42);
  display: flex;
  align-items: center;
}

/* ── Hover arrow ────────────────────────────────── */
.dashboard-card__arrow {
  position: absolute;
  right: 14px;
  bottom: 14px;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  color: rgba(var(--v-theme-on-surface), 0.35);
}

.dashboard-card:hover .dashboard-card__arrow {
  opacity: 1;
  transform: translateX(0);
}

/* ── Admin action buttons ───────────────────────── */
.dashboard-card__actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  align-items: center;
  gap: 1px;
  opacity: 0;
  transform: translateY(5px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  padding: 3px;
  border-radius: 10px;
  background: rgba(var(--v-theme-surface), 0.82);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  z-index: 4;
}

.dashboard-card:hover .dashboard-card__actions,
.dashboard-card__actions--edit {
  opacity: 1;
  transform: translateY(0);
}

/* Hide hover arrow when actions are visible */
.dashboard-card:hover .dashboard-card__arrow {
  opacity: 0;
}

/* ── Theme chip ─────────────────────────────────── */
.dashboard-theme-chip {
  backdrop-filter: blur(10px);
  background: rgba(var(--v-theme-surface), 0.34);
  font-size: 0.68rem;
}

.dashboard-theme-chip__swatch {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--dashboard-theme-primary);
  display: inline-block;
  margin-right: 5px;
}
</style>
