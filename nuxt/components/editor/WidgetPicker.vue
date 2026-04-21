<template>
  <UiSheet :open="open" side="left" width="280" @close="$emit('close')">
    <template #header>
      <p class="text-subtitle-1 font-weight-semibold mb-4">{{ t('widget.add_title') }}</p>
    </template>

    <v-list density="compact" nav>
      <v-list-item v-for="wt in widgetTypes" :key="wt.type" :prepend-icon="wt.icon" :title="wt.label"
        :subtitle="wt.description" rounded="lg" class="mb-1" @click="handleAdd(wt)" />
    </v-list>
  </UiSheet>
</template>

<script setup lang="ts">
import type { WidgetType } from '~/types/dashboard'

const { t } = useI18n()
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const dashboardStore = useDashboardStore()

const widgetTypes = computed(() => [
  { type: 'sensor' as WidgetType, label: t('widget.sensor.label'), icon: 'mdi-pulse', description: t('widget.sensor.description'), defaultW: 4, defaultH: 3 },
  { type: 'switch' as WidgetType, label: t('widget.switch.label'), icon: 'mdi-toggle-switch', description: t('widget.switch.description'), defaultW: 4, defaultH: 3 },
  { type: 'light' as WidgetType, label: t('widget.light.label'), icon: 'mdi-lightbulb', description: t('widget.light.description'), defaultW: 4, defaultH: 3 },
  { type: 'chart' as WidgetType, label: t('widget.chart.label'), icon: 'mdi-chart-line', description: t('widget.chart.description'), defaultW: 8, defaultH: 6 },
  { type: 'camera' as WidgetType, label: t('widget.camera.label'), icon: 'mdi-camera', description: t('widget.camera.description'), defaultW: 8, defaultH: 6 },
  { type: 'thermostat' as WidgetType, label: t('widget.thermostat.label'), icon: 'mdi-thermometer', description: t('widget.thermostat.description'), defaultW: 4, defaultH: 4 },
  { type: 'media_player' as WidgetType, label: t('widget.media_player.label'), icon: 'mdi-music', description: t('widget.media_player.description'), defaultW: 8, defaultH: 4 },
  { type: 'cover' as WidgetType, label: t('widget.cover.label'), icon: 'mdi-window-shutter', description: t('widget.cover.description'), defaultW: 4, defaultH: 4 },
  { type: 'cover_dial' as WidgetType, label: t('widget.cover_dial.label'), icon: 'mdi-window-shutter-open', description: t('widget.cover_dial.description'), defaultW: 4, defaultH: 4 },
  { type: 'cover_dial2' as WidgetType, label: t('widget.cover_dial2.label'), icon: 'mdi-window-shutter-open', description: t('widget.cover_dial2.description'), defaultW: 4, defaultH: 4 },
  { type: 'lock' as WidgetType, label: t('widget.lock.label'), icon: 'mdi-lock', description: t('widget.lock.description'), defaultW: 4, defaultH: 4 },
  { type: 'weather' as WidgetType, label: t('widget.weather.label'), icon: 'mdi-weather-partly-cloudy', description: t('widget.weather.description'), defaultW: 8, defaultH: 5 },
  { type: 'clock' as WidgetType, label: t('widget.clock.label'), icon: 'mdi-clock-outline', description: t('widget.clock.description'), defaultW: 4, defaultH: 3 },
  { type: 'label' as WidgetType, label: t('widget.label.label'), icon: 'mdi-format-text', description: t('widget.label.description'), defaultW: 6, defaultH: 1, minH: 1 },
  { type: 'room_card' as WidgetType, label: t('widget.room_card.label'), icon: 'mdi-home-outline', description: t('widget.room_card.description'), defaultW: 6, defaultH: 4 },
  { type: 'calendar' as WidgetType, label: t('widget.calendar.label'), icon: 'mdi-calendar-today', description: t('widget.calendar.description'), defaultW: 6, defaultH: 6 },
  { type: 'calendar_v2' as WidgetType, label: t('widget.calendar_v2.label'), icon: 'mdi-calendar-month-outline', description: t('widget.calendar_v2.description'), defaultW: 8, defaultH: 8 },
  { type: 'person' as WidgetType, label: t('widget.person.label'), icon: 'mdi-account-group-outline', description: t('widget.person.description'), defaultW: 4, defaultH: 4 },
  { type: 'energy' as WidgetType, label: t('widget.energy.label'), icon: 'mdi-lightning-bolt', description: t('widget.energy.description'), defaultW: 4, defaultH: 4 },
  { type: 'status_bar' as WidgetType, label: t('widget.status_bar.label'), icon: 'mdi-view-dashboard-variant', description: t('widget.status_bar.description'), defaultW: 6, defaultH: 1, minH: 1 },
])

const DEFAULT_CONFIGS: Record<WidgetType, object> = {
  sensor: { entity_id: '' }, switch: { entity_id: '' },
  light: { entity_id: '', show_brightness: true, border_width: 3 },
  chart: { entity_id: '', period: '24h', chart_type: 'area' },
  camera: { entity_id: '', refresh_interval: 5 },
  thermostat: { entity_id: '' }, media_player: { entity_id: '', show_album_art: true },
  cover: { entity_id: '' }, cover_dial: { entity_id: '' }, cover_dial2: { entity_id: '' }, lock: { entity_id: '', require_confirmation: true },
  weather: { entity_id: '', show_forecast: true, forecast_rows: 3 },
  clock: { format_24h: true, show_date: true },
  label: { text: 'Überschrift', font_size: 'lg' },
  room_card: { name: 'Raum', show_temp_control: true, status_entities: [] },
  calendar: { entity_id: '', show_time: true },
  calendar_v2: { calendars: [], view: 'month' },
  person: { persons: [] },
  energy: { grid_entity_id: '', solar_entity_id: '', battery_entity_id: '' },
  status_bar: { entries: [], show_labels: false },
}

type WTDef = { type: WidgetType; label: string; icon: string; description: string; defaultW: number; defaultH: number; minH?: number }
function handleAdd(wt: WTDef) {
  const id = crypto.randomUUID()
  const maxY = dashboardStore.dashboard?.widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0) ?? 0
  dashboardStore.addWidget({
    id, type: wt.type,
    layout: { x: 0, y: maxY, w: wt.defaultW, h: wt.defaultH, ...(wt.minH != null ? { minH: wt.minH } : {}) },
    config: DEFAULT_CONFIGS[wt.type as WidgetType] as never,
  })
  dashboardStore.setSelectedWidget(id)
}
</script>
