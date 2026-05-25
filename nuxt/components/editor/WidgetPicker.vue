<template>
  <UiSheet :open="open" side="left" width="280" @close="$emit('close')">
    <template #header>
      <p class="text-subtitle-1 font-weight-semibold mb-4">{{ t('widget.add_title') }}</p>
    </template>

    <v-list density="compact" nav>
      <v-list-item v-for="wt in widgetTypes" :key="wt.key" :prepend-icon="wt.icon" :title="wt.label"
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

const widgetTypes = computed(() => ([
  { key: 'sensor', type: 'sensor' as WidgetType, label: t('widget.sensor.label'), icon: 'mdi-pulse', description: t('widget.sensor.description'), defaultW: 4, defaultH: 3 },
  { key: 'gauge', type: 'gauge' as WidgetType, label: t('widget.gauge.label'), icon: 'mdi-gauge', description: t('widget.gauge.description'), defaultW: 5, defaultH: 3 },
  { key: 'template', type: 'template' as WidgetType, label: t('widget.template.label'), icon: 'mdi-code-braces', description: t('widget.template.description'), defaultW: 6, defaultH: 4 },
  { key: 'switch', type: 'switch' as WidgetType, label: t('widget.switch.label'), icon: 'mdi-toggle-switch', description: t('widget.switch.description'), defaultW: 4, defaultH: 3 },
  { key: 'button', type: 'button' as WidgetType, label: t('widget.button.label'), icon: 'mdi-gesture-tap-button', description: t('widget.button.description'), defaultW: 4, defaultH: 3 },
  { key: 'select', type: 'select' as WidgetType, label: t('widget.select.label'), icon: 'mdi-form-dropdown', description: t('widget.select.description'), defaultW: 4, defaultH: 3 },
  { key: 'light', type: 'light' as WidgetType, label: t('widget.light.label'), icon: 'mdi-lightbulb', description: t('widget.light.description'), defaultW: 4, defaultH: 3 },
  { key: 'chart', type: 'chart' as WidgetType, label: t('widget.chart.label'), icon: 'mdi-chart-line', description: t('widget.chart.description'), defaultW: 8, defaultH: 6 },
  { key: 'camera', type: 'camera' as WidgetType, label: t('widget.camera.label'), icon: 'mdi-camera', description: t('widget.camera.description'), defaultW: 8, defaultH: 6 },
  { key: 'thermostat', type: 'thermostat' as WidgetType, label: t('widget.thermostat.label'), icon: 'mdi-thermometer', description: t('widget.thermostat.description'), defaultW: 4, defaultH: 4 },
  { key: 'media_player', type: 'media_player' as WidgetType, label: t('widget.media_player.label'), icon: 'mdi-music', description: t('widget.media_player.description'), defaultW: 8, defaultH: 4 },
  { key: 'cover', type: 'cover' as WidgetType, label: t('widget.cover.label'), icon: 'mdi-window-shutter-open', description: t('widget.cover.description'), defaultW: 4, defaultH: 4 },
  { key: 'lock', type: 'lock' as WidgetType, label: t('widget.lock.label'), icon: 'mdi-lock', description: t('widget.lock.description'), defaultW: 4, defaultH: 4 },
  { key: 'weather', type: 'weather' as WidgetType, label: t('widget.weather.label'), icon: 'mdi-weather-partly-cloudy', description: t('widget.weather.description'), defaultW: 8, defaultH: 5 },
  { key: 'clock', type: 'clock' as WidgetType, label: t('widget.clock.label'), icon: 'mdi-clock-outline', description: t('widget.clock.description'), defaultW: 4, defaultH: 3 },
  { key: 'label', type: 'label' as WidgetType, label: t('widget.label.label'), icon: 'mdi-format-text', description: t('widget.label.description'), defaultW: 6, defaultH: 1, minH: 1 },
  { key: 'room_card', type: 'room_card' as WidgetType, label: t('widget.room_card.label'), icon: 'mdi-home-outline', description: t('widget.room_card.description'), defaultW: 6, defaultH: 4 },
  { key: 'calendar', type: 'calendar' as WidgetType, label: t('widget.calendar.label'), icon: 'mdi-calendar-today', description: t('widget.calendar.description'), defaultW: 6, defaultH: 6 },
  { key: 'calendar_v2', type: 'calendar_v2' as WidgetType, label: t('widget.calendar_v2.label'), icon: 'mdi-calendar-month-outline', description: t('widget.calendar_v2.description'), defaultW: 8, defaultH: 8 },
  { key: 'person', type: 'person' as WidgetType, label: t('widget.person.label'), icon: 'mdi-account-group-outline', description: t('widget.person.description'), defaultW: 4, defaultH: 4 },
  { key: 'energy', type: 'energy' as WidgetType, label: t('widget.energy.label'), icon: 'mdi-lightning-bolt', description: t('widget.energy.description'), defaultW: 4, defaultH: 4 },
  { key: 'appliance-dishwasher', type: 'appliance' as WidgetType, label: 'Geschirrspüler', icon: 'mdi-dishwasher', description: t('widget.appliance.description'), defaultW: 6, defaultH: 3, preset: 'dishwasher' as const },
  { key: 'appliance-dryer', type: 'appliance' as WidgetType, label: 'Dryer', icon: 'mdi-tumble-dryer', description: t('widget.appliance.description'), defaultW: 6, defaultH: 3, preset: 'dryer' as const },
  { key: 'appliance-washing-machine', type: 'appliance' as WidgetType, label: 'Washing Machine', icon: 'mdi-washing-machine', description: t('widget.appliance.description'), defaultW: 6, defaultH: 3, preset: 'washing_machine' as const },
  { key: 'alarm', type: 'alarm' as WidgetType, label: t('widget.alarm.label'), icon: 'mdi-shield-home-outline', description: t('widget.alarm.description'), defaultW: 6, defaultH: 2 },
  { key: 'problem_overview', type: 'problem_overview' as WidgetType, label: t('widget.problem_overview.label'), icon: 'mdi-home-alert-outline', description: t('widget.problem_overview.description'), defaultW: 6, defaultH: 4 },
  { key: 'status_bar', type: 'status_bar' as WidgetType, label: t('widget.status_bar.label'), icon: 'mdi-view-dashboard-variant', description: t('widget.status_bar.description'), defaultW: 6, defaultH: 1, minH: 1 },
  { key: 'vacuum', type: 'vacuum' as WidgetType, label: t('widget.vacuum.label'), icon: 'mdi-robot-vacuum', description: t('widget.vacuum.description'), defaultW: 4, defaultH: 4 },
  { key: 'fan', type: 'fan' as WidgetType, label: t('widget.fan.label'), icon: 'mdi-fan', description: t('widget.fan.description'), defaultW: 4, defaultH: 4 },
  { key: 'scene', type: 'scene' as WidgetType, label: t('widget.scene.label'), icon: 'mdi-play-box-multiple-outline', description: t('widget.scene.description'), defaultW: 4, defaultH: 4 },
  { key: 'timer', type: 'timer' as WidgetType, label: t('widget.timer.label'), icon: 'mdi-timer-outline', description: t('widget.timer.description'), defaultW: 4, defaultH: 3 },
  { key: 'camera_status', type: 'camera_status' as WidgetType, label: t('widget.camera_status.label'), icon: 'mdi-cctv', description: t('widget.camera_status.description'), defaultW: 4, defaultH: 3 },
]).sort((a, b) => a.key.localeCompare(b.key)))

const DEFAULT_CONFIGS: Partial<Record<WidgetType, object>> = {
  sensor: { entity_id: '' }, switch: { entity_id: '', icon: '', sensor_entity_id: '', show_sensor_trend: false },
  button: { entity_id: '', icon: 'mdi-gesture-tap-button' },
  select: { entity_id: '', icon: 'mdi-form-dropdown' },
  gauge: { entity_id: '', min: 0, max: 100, yellow_from: 70, red_from: 90, decimal_places: 0, value_position: 'top', severity_direction: 'high_bad', card_click_action: 'open_detail' },
  template: {
    name: 'Template Beispiel',
    refresh_interval: 30,
    template: `{% set lights_on = states.light | selectattr('state', 'eq', 'on') | list | count %}
{% set unavailable = states | selectattr('state', 'eq', 'unavailable') | list | count %}

| Wert | Status |
| --- | --- |
| Lichter an | **{{ lights_on }}** |
| Nicht verfügbar | **{{ unavailable }}** |

Aktualisiert: **{{ now().strftime('%H:%M') }}**`,
  },
  light: {
    entity_id: '',
    show_brightness: true,
    border_width: 3,
    card_click_action: 'none',
    card_double_click_action: 'toggle',
  },
  chart: { entity_id: '', period: '24h', chart_type: 'area' },
  camera: { entity_id: '', refresh_interval: 5 },
  thermostat: { entity_id: '' }, media_player: { entity_id: '', show_album_art: true },
  cover: { entity_id: '' }, lock: { entity_id: '', require_confirmation: true },
  weather: { entity_id: '', show_forecast: true, forecast_rows: 3, warning_entity_id: '' },
  clock: { format_24h: true, show_seconds: true, show_date: true },
  label: { text: 'Überschrift', font_size: 'lg' },
  room_card: {
    name: 'Raum',
    show_temp_control: true,
    light_entities: [],
    sensor_entities: [],
    status_entities: [],
    auto_status_entities: true,
    card_click_action: 'none',
    card_double_click_action: 'toggle_light',
  },
  calendar: { entity_id: '', show_time: true },
  calendar_v2: { calendars: [], view: 'month' },
  person: { persons: [] },
  energy: { grid_entity_id: '', solar_entity_id: '', battery_entity_id: '' },
  appliance: {
    name: 'Geschirrspüler',
    status_entity_id: 'sensor.geschirrspuler_betriebszustand',
    progress_entity_id: 'sensor.geschirrspuler_programm_fortschritt',
    end_time_entity_id: 'sensor.geschirrspuler_programm_endzeit',
    countdown_entity_id: '',
    time_remaining_entity_id: '',
    program_entity_id: 'select.geschirrspuler_aktives_programm',
    power_entity_id: 'switch.geschirrspuler_einschalter',
    door_entity_id: 'sensor.geschirrspuler_tur',
    icon: 'mdi-dishwasher',
    running_state: 'run',
    compact: false,
  },
  alarm: {
    entity_id: 'alarm_control_panel.home_alarm',
    name: 'Alarm',
    icon: 'mdi-shield-home-outline',
    code: '',
    prompt_for_code: false,
    use_keypad: true,
    use_keypad_on_mobile: true,
    code_length: 4,
    actions_align: 'start',
  },
  problem_overview: {
    name: 'Probleme',
    battery_threshold: 20,
    max_items: 8,
    show_batteries: true,
    show_unavailable: true,
    show_openings: true,
    show_updates: true,
    show_alerts: true,
    show_repairs: true,
    show_system: true,
    ignored_offline_platforms: ['music_assistant', 'device_pulse', 'better_thermostat', 'fritz_profiles'],
    ignored_offline_domains: ['button'],
  },
  status_bar: { entries: [], show_labels: false },
  vacuum: { entity_id: '' },
  fan: { entity_id: '', show_speed: true },
  scene: { entries: [], columns: 2 },
  timer: { timers: [] },
  camera_status: { camera_entity_id: '', sensor_entity_id: '' },
}

const APPLIANCE_PRESETS = {
  dishwasher: DEFAULT_CONFIGS.appliance,
  dryer: {
    name: 'Dryer',
    status_entity_id: 'sensor.dryer_state',
    progress_entity_id: 'sensor.dryer_progress',
    end_time_entity_id: '',
    countdown_entity_id: '',
    time_remaining_entity_id: 'sensor.dryer_time_remaining',
    program_entity_id: 'sensor.dryer_program',
    power_entity_id: 'sensor.dryer_current_power',
    door_entity_id: '',
    icon: 'mdi-tumble-dryer',
    running_state: 'on',
    compact: false,
  },
  washing_machine: {
    name: 'Washing Machine',
    status_entity_id: 'sensor.washing_machine_state',
    progress_entity_id: 'sensor.washing_machine_progress',
    end_time_entity_id: '',
    countdown_entity_id: '',
    time_remaining_entity_id: 'sensor.washing_machine_time_remaining',
    program_entity_id: 'sensor.washing_machine_program',
    power_entity_id: 'sensor.washing_machine_current_power',
    door_entity_id: '',
    icon: 'mdi-washing-machine',
    running_state: 'on',
    compact: false,
  },
} as const

type WTDef = {
  key: string
  type: WidgetType
  label: string
  icon: string
  description: string
  defaultW: number
  defaultH: number
  minH?: number
  preset?: keyof typeof APPLIANCE_PRESETS
}
function handleAdd(wt: WTDef) {
  const id = crypto.randomUUID()
  const maxY = dashboardStore.dashboard?.widgets.reduce((m, w) => Math.max(m, w.layout.y + w.layout.h), 0) ?? 0
  const baseConfig = (wt.type === 'appliance' && wt.preset)
    ? APPLIANCE_PRESETS[wt.preset]
    : (DEFAULT_CONFIGS[wt.type] ?? {})

  dashboardStore.addWidget({
    id, type: wt.type,
    layout: { x: 0, y: maxY, w: wt.defaultW, h: wt.defaultH, ...(wt.minH != null ? { minH: wt.minH } : {}) },
    config: JSON.parse(JSON.stringify(baseConfig)) as never,
  })
  dashboardStore.setSelectedWidget(id)
}
</script>
