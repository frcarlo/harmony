<template>
  <UiSheet :open="open" side="right" width="320" @close="$emit('close')">
    <template #header>
      <p class="text-subtitle-1 font-weight-semibold mb-2">{{ t('widget.config_title') }}</p>
    </template>

    <div v-if="widget" class="d-flex flex-column ga-4">
      <!-- Entity -->
      <div
        v-if="widget.type !== 'clock' && widget.type !== 'label' && widget.type !== 'room_card' && widget.type !== 'calendar' && widget.type !== 'person' && widget.type !== 'energy' && widget.type !== 'status_bar'">
        <p class="text-caption text-medium-emphasis mb-1 text-uppercase font-weight-medium">{{ t('config.entity') }}</p>
        <EntityPicker v-model="cfg.entity_id" :domain="ENTITY_DOMAINS[widget.type]" />
      </div>

      <!-- Name -->
      <v-text-field v-if="widget.type !== 'clock' && widget.type !== 'room_card' && widget.type !== 'status_bar'" v-model="cfg.name"
        :label="t('config.display_name')" :placeholder="t('config.display_name_hint')" />

      <!-- Sensor -->
      <template v-if="widget.type === 'sensor'">
        <v-text-field v-model="cfg.unit" :label="t('config.unit')" :placeholder="t('config.unit_auto')" />
        <v-text-field v-model.number="cfg.decimal_places" :label="t('config.decimal_places')" type="number" min="0"
          max="5" :placeholder="t('config.unit_auto')" />
      </template>

      <!-- Light -->
      <v-checkbox v-if="widget.type === 'light'" v-model="cfg.show_brightness" :label="t('config.show_brightness')" />

      <!-- Chart -->
      <template v-if="widget.type === 'chart'">
        <v-select v-model="cfg.period" :label="t('config.period')" :items="periodItems" />
        <v-select v-model="cfg.chart_type" :label="t('config.chart_type')" :items="chartTypeItems" />
        <UiColorPicker v-model="cfg.color" :label="t('config.line_color')" />
        <UiColorPicker v-if="cfg.chart_type === 'area'" v-model="cfg.area_color" :label="t('config.area_color')"
          clearable />
      </template>

      <!-- Cover Dial -->
      <template v-if="widget.type === 'cover_dial' || widget.type === 'cover_dial2'">
        <UiColorPicker v-model="cfg.dial_color" :label="t('config.dial_color')" clearable />
        <UiColorPicker v-model="cfg.dial_bg_color" :label="t('config.dial_bg_color')" clearable />
      </template>

      <!-- Camera -->
      <v-text-field v-if="widget.type === 'camera'" v-model.number="cfg.refresh_interval"
        :label="t('config.refresh_interval')" type="number" min="1" />

      <!-- Lock -->
      <template v-if="widget.type === 'lock'">
        <v-checkbox v-model="cfg.require_confirmation" :label="t('config.require_confirmation')" />
        <v-checkbox :model-value="cfg.show_door_button !== false" :label="t('config.show_door_button')"
          @update:model-value="cfg.show_door_button = $event ? undefined : false" />
        <EntityPicker v-model="cfg.door_sensor_entity" domain="binary_sensor" :label="t('lock.door_sensor')" />
      </template>

      <!-- Weather -->
      <template v-if="widget.type === 'weather'">
        <div>
          <p class="text-caption text-medium-emphasis mb-1">{{ t('config.forecast_rows', { n: cfg.forecast_rows ?? 3 })
            }}</p>
          <v-slider v-model="cfg.forecast_rows" min="0" max="5" step="1" thumb-label />
        </div>
      </template>

      <!-- Clock -->
      <template v-if="widget.type === 'clock'">
        <v-checkbox v-model="cfg.format_24h" :label="t('config.format_24h')" />
        <v-checkbox v-model="cfg.show_date" :label="t('config.show_date')" />
      </template>

      <!-- Label -->
      <template v-if="widget.type === 'label'">
        <v-text-field v-model="cfg.text" :label="t('config.text')" :placeholder="t('config.text_placeholder')" />
        <v-select v-model="cfg.font_size" :label="t('config.font_size')" :items="fontSizeItems" />
      </template>

      <!-- Media Player -->
      <v-checkbox v-if="widget.type === 'media_player'" v-model="cfg.show_album_art"
        :label="t('config.show_album_art')" />

      <!-- Calendar -->
      <template v-if="widget.type === 'calendar'">
        <EntityPicker v-model="cfg.entity_id" domain="calendar" />
        <v-select v-model="cfg.days" :label="t('config.days')" :items="dayItems" />
        <v-checkbox v-model="cfg.show_time" :label="t('config.show_time')" />
      </template>

      <!-- Person Widget -->
      <template v-if="widget.type === 'person'">
        <v-text-field v-model="cfg.name" :label="t('config.display_name')" :placeholder="t('widget.person.label')"
          density="compact" hide-details clearable class="mb-2" />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('person.persons') }}</p>
        <div v-for="(p, idx) in cfg.persons" :key="idx" class="d-flex align-center ga-1 mb-1">
          <EntityPicker v-model="p.entity_id" domain="person" class="flex-grow-1" />
          <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="cfg.persons.splice(idx, 1)" />
        </div>
        <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="mt-1"
          @click="cfg.persons = [...(cfg.persons ?? []), { entity_id: '' }]">
          {{ t('person.add_person') }}
        </v-btn>
      </template>

      <!-- Energy Widget -->
      <template v-if="widget.type === 'energy'">
        <v-text-field v-model="cfg.name" :label="t('config.display_name')" :placeholder="t('widget.energy.label')"
          density="compact" hide-details clearable class="mb-2" />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.grid') }}</p>
        <EntityPicker v-model="cfg.grid_entity_id" domain="sensor" />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.solar') }}</p>
        <EntityPicker v-model="cfg.solar_entity_id" domain="sensor" />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium mb-1">{{ t('energy.battery') }}</p>
        <EntityPicker v-model="cfg.battery_entity_id" domain="sensor" />
      </template>

      <!-- Room Card -->
      <template v-if="widget.type === 'room_card'">
        <v-text-field v-model="cfg.name" :label="t('config.room_name')" />
        <EntityPicker v-model="cfg.climate_entity" domain="climate" />
        <v-checkbox v-model="cfg.show_temp_control" :label="t('config.show_temp_control')" />
        <EntityPicker v-model="cfg.light_entity" domain="light" />
        <v-divider />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{
          t('config.sensor_no_thermostat') }}</p>
        <EntityPicker v-model="cfg.sensor_entity" domain="sensor" />
        <UiIconPicker v-if="cfg.sensor_entity" v-model="cfg.sensor_icon" :label="t('config.icon_field')" placeholder="mdi-eye" />
        <p v-if="cfg.light_entity" class="text-caption text-medium-emphasis">{{ t('config.light_dblclick_hint') }}</p>
        <v-divider />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.status_entities') }}
        </p>
        <template v-for="(slot, idx) in roomStatusEntities" :key="idx">
          <div class="d-flex align-center ga-1">
            <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeStatusSlot(idx)" />
          </div>
          <EntityPicker v-model="slot.entity_id" :placeholder="`Entity ${idx + 1}`" />
          <div v-if="slot.entity_id" class="d-flex flex-column ga-2">
            <UiIconPicker v-model="slot.icon" :label="t('config.icon_field')" placeholder="mdi-fire" />
            <UiColorPicker v-model="slot.active_color" :label="t('config.active_color')" clearable />
            <UiColorPicker v-model="slot.inactive_color" :label="t('config.inactive_color')" clearable />
            <v-text-field v-model="slot.active_state" :label="t('config.active_state')"
              :placeholder="t('config.active_state_hint')" density="compact" clearable hide-details />
          </div>
        </template>
        <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="mt-1" @click="addStatusSlot">
          {{ t('config.add_status') }}
        </v-btn>
      </template>

      <!-- Status Bar -->
      <template v-if="widget.type === 'status_bar'">
        <v-checkbox v-model="cfg.show_labels" :label="t('config.show_labels')" hide-details density="compact" />
        <v-divider />
        <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.status_entities') }}</p>
        <template v-for="(entry, idx) in statusBarEntries" :key="idx">
          <div class="d-flex align-center ga-1">
            <span class="text-caption text-medium-emphasis flex-grow-1">{{ idx + 1 }}.</span>
            <v-btn icon="mdi-delete" size="x-small" variant="text" color="error" @click="removeStatusBarEntry(idx)" />
          </div>
          <EntityPicker v-model="entry.entity_id" :placeholder="`Entity ${idx + 1}`" />
          <div v-if="entry.entity_id" class="d-flex flex-column ga-2">
            <UiIconPicker v-model="entry.icon" :label="t('config.icon_field')" placeholder="mdi-circle" />
            <v-text-field v-model="entry.label" :label="t('config.display_name')" density="compact" hide-details clearable />
            <v-text-field v-model="entry.active_state" :label="t('config.active_state')"
              :placeholder="t('config.active_state_hint')" density="compact" hide-details clearable />
            <UiColorPicker v-model="entry.active_color" :label="t('config.active_color')" clearable />
            <UiColorPicker v-model="entry.inactive_color" :label="t('config.inactive_color')" clearable />
          </div>
        </template>
        <v-btn prepend-icon="mdi-plus" variant="tonal" size="small" class="mt-1" @click="addStatusBarEntry">
          {{ t('config.add_status') }}
        </v-btn>
      </template>

      <!-- Appearance -->
      <v-divider />
      <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.appearance') }}</p>

      <UiColorPicker v-model="appearance.bg_color" :label="t('config.bg_color')" clearable />
      <UiColorPicker v-model="appearance.border_color" :label="t('config.border_color')" clearable />
      <UiColorPicker v-model="appearance.active_color" :label="t('config.active_color')" clearable />
      <UiColorPicker v-model="appearance.text_color" :label="t('config.text_color')" clearable />

      <div>
        <p class="text-caption text-medium-emphasis mb-1">{{ t('config.border_width', {
          n: appearance.border_width ??
          '–' })
          }}</p>
        <v-slider v-model="appearance.border_width" min="0" max="8" step="1" thumb-label />
      </div>

      <v-text-field v-model.number="appearance.min_width" :label="t('config.min_width')"
        :hint="currentWidgetWidth ? t('config.min_width_hint', { n: currentWidgetWidth }) : undefined" persistent-hint
        type="number" min="0" placeholder="–" clearable />
    </div>

    <p v-else class="text-medium-emphasis text-body-2">{{ t('widget.none_selected') }}</p>
  </UiSheet>
</template>

<script setup lang="ts">
import type { WidgetType, WidgetAppearance } from '~/types/dashboard'

const { t } = useI18n()
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const dashboardStore = useDashboardStore()
const widget = computed(() => dashboardStore.dashboard?.widgets.find((w) => w.id === dashboardStore.selectedWidgetId))

const currentWidgetWidth = ref<number | null>(null)
watch(() => dashboardStore.selectedWidgetId, async (id) => {
  if (!id) { currentWidgetWidth.value = null; return }
  await nextTick()
  const el = document.querySelector(`[gs-id="${id}"] .grid-stack-item-content`)
  currentWidgetWidth.value = el ? Math.round(el.getBoundingClientRect().width) : null
}, { immediate: true })
const cfg = computed(() => (widget.value?.config ?? {}) as Record<string, unknown>)

watch(widget, (w) => { if (w && !w.appearance) w.appearance = {} }, { immediate: true })
const appearance = computed(() => (widget.value?.appearance ?? {}) as WidgetAppearance)

const ENTITY_DOMAINS: Partial<Record<WidgetType, string>> = {
  switch: 'switch', light: 'light', camera: 'camera',
  thermostat: 'climate', media_player: 'media_player', cover: 'cover', cover_dial: 'cover', cover_dial2: 'cover',
  lock: 'lock', weather: 'weather',
}

const periodItems = computed(() => [
  { title: t('config.period_1h'), value: '1h' }, { title: t('config.period_6h'), value: '6h' },
  { title: t('config.period_24h'), value: '24h' }, { title: t('config.period_7d'), value: '7d' },
  { title: t('config.period_30d'), value: '30d' },
])
const chartTypeItems = computed(() => [
  { title: t('config.chart_line'), value: 'line' },
  { title: t('config.chart_area'), value: 'area' },
  { title: t('config.chart_bar'), value: 'bar' },
])
const fontSizeItems = computed(() => [
  { title: t('config.font_sm'), value: 'sm' }, { title: t('config.font_md'), value: 'md' },
  { title: t('config.font_lg'), value: 'lg' }, { title: t('config.font_xl'), value: 'xl' },
])
const dayItems = computed(() => [
  { title: t('config.days_1'), value: 1 }, { title: t('config.days_3'), value: 3 },
  { title: t('config.days_7'), value: 7 }, { title: t('config.days_14'), value: 14 },
])

const roomStatusEntities = computed(() => (cfg.value.status_entities as Array<Record<string, unknown>>) ?? [])

function addStatusSlot() {
  const list = [...roomStatusEntities.value]
  list.push({ entity_id: '', icon: 'mdi-circle', active_color: undefined })
  cfg.value.status_entities = list
}

function removeStatusSlot(index: number) {
  const list = [...roomStatusEntities.value]
  list.splice(index, 1)
  cfg.value.status_entities = list
}

const statusBarEntries = computed(() => (cfg.value.entries as Array<Record<string, unknown>>) ?? [])

function addStatusBarEntry() {
  const list = [...statusBarEntries.value]
  list.push({ entity_id: '', icon: 'mdi-circle', active_state: 'on' })
  cfg.value.entries = list
}

function removeStatusBarEntry(index: number) {
  const list = [...statusBarEntries.value]
  list.splice(index, 1)
  cfg.value.entries = list
}
</script>
