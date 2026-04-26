<template>
  <v-dialog :model-value="modelValue" max-width="420" scrollable @update:model-value="v => emit('update:modelValue', v)">
    <v-card rounded="xl" :class="{ 'dialog-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pt-4 px-4">
        <v-icon :icon="draft.entry_type === 'group' ? 'mdi-filter-outline' : draft.entry_type === 'nav' ? 'mdi-arrow-right-circle-outline' : draft.entry_type === 'room' ? 'mdi-sofa-outline' : 'mdi-eye-outline'" size="18" />
        <span class="text-body-1 font-weight-bold flex-grow-1">
          {{ draft.entry_type === 'group' ? t('config.entry_type_group') : draft.entry_type === 'nav' ? t('config.entry_type_nav') : draft.entry_type === 'room' ? t('config.entry_type_room') : t('config.entry_type_single') }}
        </span>
        <v-btn-toggle
          :model-value="draft.entry_type === 'group' ? 'group' : draft.entry_type === 'nav' ? 'nav' : draft.entry_type === 'room' ? 'room' : 'single'"
          density="compact" rounded="lg" variant="outlined" mandatory
          @update:model-value="switchType"
        >
          <v-btn value="single" size="small">{{ t('config.entry_type_single') }}</v-btn>
          <v-btn value="group" size="small" color="primary">{{ t('config.entry_type_group') }}</v-btn>
          <v-btn value="room" size="small" color="warning">{{ t('config.entry_type_room') }}</v-btn>
          <v-btn value="nav" size="small" color="secondary">{{ t('config.entry_type_nav') }}</v-btn>
        </v-btn-toggle>
      </v-card-title>

      <v-card-text class="d-flex flex-column ga-3 px-4 py-3">
        <!-- Nav entry -->
        <template v-if="draft.entry_type === 'nav'">
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-arrow-right-circle-outline" />
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <UiColorPicker v-model="draft.icon_color" :label="t('config.icon_color')" clearable />
          <DashboardPicker v-model="draft.dashboard_id" />
        </template>

        <template v-else-if="draft.entry_type === 'room'">
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-sofa-outline" />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.room_name')" density="compact" hide-details clearable />
          <v-tabs v-model="roomTab" density="compact" color="primary" fixed-tabs>
            <v-tab value="main">{{ t('config.main_entities') }}</v-tab>
            <v-tab value="sensors">{{ t('config.additional_sensors') }}</v-tab>
          </v-tabs>
          <v-window v-model="roomTab" class="mt-1">
            <v-window-item value="main">
              <div class="d-flex flex-column ga-3 pt-2">
                <EntityPicker v-model="draft.light_entity" domain="light" />
                <EntityPicker v-model="draft.climate_entity" domain="climate" />
                <v-select
                  v-model="draft.active_source"
                  :items="roomActiveSourceItems"
                  :label="t('config.room_active_source')"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  hide-details="auto"
                />
                <template v-if="draft.active_source === 'custom'">
                  <EntityPicker v-model="draft.active_entity_id" />
                  <v-text-field v-model="draft.active_state" :label="t('config.active_state')" :placeholder="t('config.active_state_hint')" density="compact" hide-details clearable />
                </template>
                <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
                <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
              </div>
            </v-window-item>
            <v-window-item value="sensors">
              <div class="d-flex flex-column ga-3 pt-2">
                <div class="d-flex flex-column ga-2">
                  <div class="text-caption text-medium-emphasis text-uppercase font-weight-medium">
                    {{ t('config.primary_sensor') }}
                  </div>
                  <EntityPicker v-model="draft.sensor_entity" domain="sensor" />
                  <UiIconPicker
                    v-if="draft.sensor_entity"
                    :model-value="String(draft.sensor_icon ?? '')"
                    :label="t('config.icon_field')"
                    placeholder="mdi-eye"
                    @update:model-value="draft.sensor_icon = $event"
                  />
                </div>
                <v-divider />
                <div
                  v-for="(sensor, idx) in roomSensors"
                  :key="`room-sensor-${idx}`"
                  class="d-flex flex-column ga-2"
                >
                  <EntityPicker v-model="sensor.entity_id" domain="sensor" />
                  <div class="d-flex align-center ga-2">
                    <div class="flex-grow-1">
                      <UiIconPicker
                        :model-value="String(sensor.icon ?? '')"
                        :label="t('config.icon_field')"
                        placeholder="mdi-eye"
                        @update:model-value="sensor.icon = $event"
                      />
                    </div>
                    <v-btn icon="mdi-delete-outline" variant="text" color="error" @click="removeRoomSensor(idx)" />
                  </div>
                  <v-divider v-if="idx < roomSensors.length - 1" />
                </div>
                <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addRoomSensor">
                  {{ t('config.add_sensor') }}
                </v-btn>
              </div>
            </v-window-item>
          </v-window>
        </template>

        <!-- Single entity -->
        <template v-else-if="draft.entry_type !== 'group'">
          <EntityPicker v-model="draft.entity_id" />
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
        </template>

        <!-- Group -->
        <template v-else-if="draft.entry_type === 'group'">
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-lightbulb-group-outline" />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <v-divider />
          <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.group_filter') }}</p>
          <v-select
            v-model="draft.filter.domains"
            :items="availableDomains"
            :label="t('config.filter_domains')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-text-field v-model="draft.filter.name_contains" :label="t('config.filter_name_contains')"
            density="compact" hide-details clearable placeholder="kueche" />
          <v-text-field v-model="draft.filter.name_starts_with" :label="t('config.filter_name_starts_with')"
            density="compact" hide-details clearable placeholder="light.eg_" />
          <v-select
            v-model="draft.filter.areas"
            :items="areaItems"
            item-title="name" item-value="area_id"
            :label="t('config.filter_areas')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-select
            v-model="draft.filter.labels"
            :items="labelItems"
            item-title="name" item-value="label_id"
            :label="t('config.filter_labels')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-checkbox v-model="draft.filter.exclude_groups" :label="t('config.exclude_groups')" hide-details density="compact" />
          <v-divider />
          <v-checkbox v-model="draft.show_badge" :label="t('config.show_badge')" hide-details density="compact" />
          <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
        </template>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn variant="tonal" color="primary" @click="save">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { glass } = useGlassEffect()
const entityStore = useEntityStore()

const props = defineProps<{
  modelValue: boolean
  entry: Record<string, unknown>
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  save: [Record<string, unknown>]
}>()

const draft = ref<Record<string, unknown>>({})
const roomTab = ref<'main' | 'sensors'>('main')

watch(() => props.modelValue, (v) => {
  if (v) {
    draft.value = JSON.parse(JSON.stringify(props.entry))
    roomTab.value = 'main'
  }
}, { immediate: true })

function switchType(type: string) {
  if (type === 'group') {
    draft.value = { entry_type: 'group', icon: draft.value.icon ?? 'mdi-lightbulb-group-outline', filter: { domains: [] }, show_badge: true }
  } else if (type === 'room') {
    draft.value = {
      entry_type: 'room',
      icon: draft.value.icon ?? 'mdi-sofa-outline',
      label: draft.value.label ?? '',
      light_entity: '',
      climate_entity: '',
      sensor_entity: '',
      sensor_icon: '',
      sensor_entities: [],
      status_entities: [],
      active_source: 'light',
    }
  } else if (type === 'nav') {
    draft.value = { entry_type: 'nav', icon: draft.value.icon ?? 'mdi-arrow-right-circle-outline', label: draft.value.label ?? '', dashboard_id: '' }
  } else {
    draft.value = { entity_id: '', label: draft.value.label }
  }
}

function save() {
  const payload = JSON.parse(JSON.stringify(toRaw(draft.value)))
  emit('save', payload)
  emit('update:modelValue', false)
}

const availableDomains = computed(() => {
  const domains = new Set<string>()
  for (const id of Object.keys(entityStore.entities)) {
    const d = id.split('.')[0]
    if (d) domains.add(d)
  }
  return [...domains].sort()
})

const areaItems = computed(() => entityStore.areas)
const labelItems = computed(() => entityStore.labels)
const roomSensors = computed(() => {
  if (!Array.isArray(draft.value.sensor_entities as unknown[] | undefined)) {
    draft.value.sensor_entities = []
  }
  return draft.value.sensor_entities as Array<{ entity_id: string; icon?: string }>
})
const roomActiveSourceItems = computed(() => [
  { title: t('config.room_active_source_light'), value: 'light' },
  { title: t('config.room_active_source_climate'), value: 'climate' },
  { title: t('config.room_active_source_custom'), value: 'custom' },
])

function addRoomSensor() {
  roomSensors.value.push({ entity_id: '', icon: '' })
}

function removeRoomSensor(index: number) {
  roomSensors.value.splice(index, 1)
}

// ensure filter object exists when group
const draftAsGroup = computed(() => draft.value as Record<string, unknown> & { filter: Record<string, unknown> })
watch(draft, (d) => {
  if (d.entry_type === 'group') {
    if (!d.filter) d.filter = {}
    const f = d.filter as Record<string, unknown>
    if (!Array.isArray(f.labels)) f.labels = []
    if (!Array.isArray(f.areas)) f.areas = []
    if (!Array.isArray(f.domains)) f.domains = []
  } else if (d.entry_type === 'room') {
    if (typeof d.icon !== 'string') d.icon = 'mdi-sofa-outline'
    if (typeof d.sensor_icon !== 'string') d.sensor_icon = ''
    if (!Array.isArray(d.sensor_entities as unknown[] | undefined)) d.sensor_entities = []
    for (const sensor of d.sensor_entities as Array<Record<string, unknown>>) {
      if (typeof sensor.icon !== 'string') sensor.icon = ''
      if (typeof sensor.entity_id !== 'string') sensor.entity_id = ''
    }
    if (!Array.isArray(d.status_entities as unknown[] | undefined)) d.status_entities = []
    if (!d.active_source) d.active_source = 'light'
  }
}, { deep: true, immediate: true })
</script>
