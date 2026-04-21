<template>
  <v-card height="100%" class="overflow-hidden position-relative widget-card" :style="cardStyle"
    :class="{
      'ring-selected': isSelected,
      'widget-glass': glass && !appearance.bg_color && !hasActiveBackground,
      'widget-glass-blur': glass && (!!appearance.bg_color || hasActiveBackground),
    }">
    <!-- Drag handle -->
    <div v-if="editMode" class="drag-handle">
      <v-icon icon="mdi-drag-horizontal" size="16" color="medium-emphasis" />
    </div>

    <!-- Edit controls -->
    <div v-if="editMode" class="widget-edit-controls">
      <v-btn icon="mdi-cog" size="x-small" variant="tonal" density="comfortable"
        :color="isSelected ? 'primary' : undefined" :title="t('widget.configure')"
        @click="dashboardStore.setSelectedWidget(isSelected ? null : widget.id)" />
      <v-btn icon="mdi-content-copy" size="x-small" variant="tonal" density="comfortable"
        :title="t('widget.clone')" @click="dashboardStore.cloneWidget(widget.id)" />
      <v-btn icon="mdi-close" size="x-small" variant="tonal" density="comfortable" color="error"
        :title="t('widget.remove')" @click="dashboardStore.removeWidget(widget.id)" />
    </div>

    <!-- Widget content -->
    <div class="h-100" :style="{ pointerEvents: editMode ? 'none' : undefined }">
      <SensorWidget v-if="widget.type === 'sensor'" :config="widget.config as any" :appearance="widget.appearance" />
      <SwitchWidget v-else-if="widget.type === 'switch'" :config="widget.config as any"
        :appearance="widget.appearance" />
      <LightWidget v-else-if="widget.type === 'light'" :config="widget.config as any" :appearance="widget.appearance" />
      <ChartWidget v-else-if="widget.type === 'chart'" :config="widget.config as any" />
      <CameraWidget v-else-if="widget.type === 'camera'" :config="widget.config as any" />
      <ThermostatWidget v-else-if="widget.type === 'thermostat'" :config="widget.config as any"
        :appearance="widget.appearance" />
      <MediaPlayerWidget v-else-if="widget.type === 'media_player'" :config="widget.config as any" />
      <CoverWidget v-else-if="widget.type === 'cover'" :config="widget.config as any" />
      <CoverDialWidget v-else-if="widget.type === 'cover_dial'" :config="widget.config as any" />
      <CoverDial2Widget v-else-if="widget.type === 'cover_dial2'" :config="widget.config as any" />
      <LockWidget v-else-if="widget.type === 'lock'" :config="widget.config as any" :appearance="widget.appearance" />
      <WeatherWidget v-else-if="widget.type === 'weather'" :config="widget.config as any" />
      <ClockWidget v-else-if="widget.type === 'clock'" :config="widget.config as any" />
      <LabelWidget v-else-if="widget.type === 'label'" :config="widget.config as any" />
      <RoomCardWidget v-else-if="widget.type === 'room_card'" :config="widget.config as any" />
      <CalendarWidget v-else-if="widget.type === 'calendar'" :config="widget.config as any" />
      <CalendarV2Widget v-else-if="widget.type === 'calendar_v2'" :config="widget.config as any" />
      <PersonWidget v-else-if="widget.type === 'person'" :config="widget.config as any" />
      <EnergyWidget v-else-if="widget.type === 'energy'" :config="widget.config as any" />
      <StatusBarWidget v-else-if="widget.type === 'status_bar'" :config="widget.config as any" />
      <div v-else class="pa-4 text-medium-emphasis text-body-2">{{ t('widget.unknown_type') }}</div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Widget } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ widget: Widget; editMode: boolean }>()

const dashboardStore = useDashboardStore()
const entityStore = useEntityStore()
const { glass } = useGlassEffect()

const isSelected = computed(() => dashboardStore.selectedWidgetId === props.widget.id)

const entityId = computed(() => {
  const c = props.widget.config as Record<string, unknown>
  if (props.widget.type === 'room_card') return c?.light_entity as string | undefined
  return c?.entity_id as string | undefined
})
const entityState = computed(() => entityId.value ? entityStore.entities[entityId.value]?.state : undefined)
const isActive = computed(() => {
  const s = entityState.value
  return s === 'on' || s === 'open' || s === 'unlocked' || s === 'playing'
})

const appearance = computed(() => props.widget.appearance ?? {})

const hasActiveBackground = computed(() =>
  isActive.value && (appearance.value.active_color != null || props.widget.type === 'room_card'),
)

function toSemiTransparent(color: string, alpha = 0.55): string {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

const cardStyle = computed(() => {
  const a = appearance.value
  const style: Record<string, string> = {}
  if (a.bg_color === 'transparent') style.backgroundColor = 'transparent'
  else if (a.bg_color) style.backgroundColor = glass.value ? toSemiTransparent(a.bg_color) : a.bg_color
  else if (isActive.value) {
    const activeColor = a.active_color ?? (props.widget.type === 'room_card' ? '#f59e0b' : undefined)
    if (activeColor) style.backgroundColor = glass.value ? toSemiTransparent(activeColor, 0.22) : activeColor + '28'
  }
  if (a.text_color) style.color = a.text_color
  const bw = a.border_width ?? 0
  if (bw > 0) {
    const customColor = (isActive.value && a.active_color) ? a.active_color : a.border_color
    style.borderColor = customColor ?? 'rgb(var(--v-theme-primary))'
    style.borderWidth = `${bw}px`
    style.borderStyle = 'solid'
  } else {
    style.border = 'none'
  }
  if (isSelected.value) style.outline = '2px solid rgb(var(--v-theme-primary))'
  return style
})
</script>

<style scoped>
.ring-selected {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 0;
}
</style>
