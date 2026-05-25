<template>
  <v-dialog :model-value="modelValue" max-width="420" scrollable @update:model-value="v => emit('update:modelValue', v)">
    <v-card rounded="xl" :class="{ 'dialog-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pt-4 px-4">
        <v-icon :icon="draft.entry_type === 'group' ? 'mdi-filter-outline' : draft.entry_type === 'nav' ? 'mdi-arrow-right-circle-outline' : draft.entry_type === 'room' ? 'mdi-sofa-outline' : draft.entry_type === 'problem' ? 'mdi-home-alert-outline' : draft.entry_type === 'camera' ? 'mdi-cctv' : 'mdi-eye-outline'" size="18" />
        <span class="text-body-1 font-weight-bold flex-grow-1">
          {{ draft.entry_type === 'group' ? t('config.entry_type_group') : draft.entry_type === 'nav' ? t('config.entry_type_nav') : draft.entry_type === 'room' ? t('config.entry_type_room') : draft.entry_type === 'problem' ? t('config.entry_type_problem') : draft.entry_type === 'camera' ? t('config.entry_type_camera') : t('config.entry_type_single') }}
        </span>
        <v-btn-toggle
          :model-value="draft.entry_type === 'group' ? 'group' : draft.entry_type === 'nav' ? 'nav' : draft.entry_type === 'room' ? 'room' : draft.entry_type === 'problem' ? 'problem' : draft.entry_type === 'camera' ? 'camera' : 'single'"
          density="compact" rounded="lg" variant="outlined" mandatory
          @update:model-value="switchType"
        >
          <v-btn value="single" size="small">{{ t('config.entry_type_single') }}</v-btn>
          <v-btn value="group" size="small" color="primary">{{ t('config.entry_type_group') }}</v-btn>
          <v-btn value="room" size="small" color="warning">{{ t('config.entry_type_room') }}</v-btn>
          <v-btn value="problem" size="small" color="error">{{ t('config.entry_type_problem') }}</v-btn>
          <v-btn value="nav" size="small" color="secondary">{{ t('config.entry_type_nav') }}</v-btn>
          <v-btn value="camera" size="small" color="info">{{ t('config.entry_type_camera') }}</v-btn>
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
                  <EntityPicker v-model="draft.sensor_entity" :domain-filter="['sensor', 'binary_sensor', 'input_number', 'number', 'input_boolean', 'switch', 'light', 'cover', 'lock', 'climate', 'weather', 'person', 'device_tracker']" />
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
                  <EntityPicker v-model="sensor.entity_id" :domain-filter="['sensor', 'binary_sensor', 'input_number', 'number', 'input_boolean', 'switch', 'light', 'cover', 'lock', 'climate', 'weather', 'person', 'device_tracker']" />
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

        <template v-else-if="draft.entry_type === 'problem'">
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-home-alert-outline" />
          <UiIconPicker v-model="draft.inactive_icon" :label="t('config.inactive_icon')" placeholder="mdi-shield-check-outline" />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <v-text-field v-model.number="draft.battery_threshold" :label="t('config.problem_battery_threshold')"
            type="number" min="1" max="100" suffix="%" density="compact" hide-details="auto" />
          <v-checkbox v-model="draft.show_badge" :label="t('config.show_badge')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_batteries" :label="t('config.problem_show_batteries')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_unavailable" :label="t('config.problem_show_unavailable')" hide-details density="compact" />
          <v-combobox v-model="draft.ignored_offline_platforms" :items="DEFAULT_IGNORED_OFFLINE_PLATFORMS"
            :label="t('config.problem_ignored_offline_platforms')" multiple chips closable-chips clearable
            density="compact" hide-details="auto" />
          <v-combobox v-model="draft.ignored_offline_domains" :items="DEFAULT_IGNORED_OFFLINE_DOMAINS"
            :label="t('config.problem_ignored_offline_domains')" multiple chips closable-chips clearable
            density="compact" hide-details="auto" />
          <v-checkbox v-model="draft.show_openings" :label="t('config.problem_show_openings')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_updates" :label="t('config.problem_show_updates')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_alerts" :label="t('config.problem_show_alerts')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_repairs" :label="t('config.problem_show_repairs')" hide-details density="compact" />
          <v-checkbox v-model="draft.show_system" :label="t('config.problem_show_system')" hide-details density="compact" />
          <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
        </template>

        <!-- Camera entry -->
        <template v-else-if="draft.entry_type === 'camera'">
          <div>
            <p class="text-caption text-medium-emphasis mb-1">{{ t('camera_status.config.camera') }}</p>
            <EntityPicker v-model="draft.camera_entity_id" domain="camera" />
          </div>
          <div>
            <p class="text-caption text-medium-emphasis mb-1">{{ t('camera_status.config.sensor') }}</p>
            <EntityPicker v-model="draft.sensor_entity_id" :placeholder="t('config.optional')" />
          </div>
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-cctv" clearable />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <v-text-field v-model="draft.active_state" :label="t('camera_status.config.active_state')"
            :placeholder="t('camera_status.config.active_state_placeholder')" density="compact" hide-details="auto" />
          <UiColorPicker v-model="draft.active_color" :label="t('camera_status.config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('camera_status.config.inactive_color')" clearable />
        </template>

        <!-- Single entity -->
        <template v-else-if="draft.entry_type !== 'group'">
          <EntityPicker v-model="draft.entity_id" />
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" :placeholder="t('config.icon_auto')" clearable />
          <UiIconPicker v-if="draft.icon" v-model="draft.inactive_icon" :label="t('config.inactive_icon')" :placeholder="t('config.icon_auto')" clearable />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
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
          <v-combobox
            v-model="draft.filter.device_classes"
            :items="availableDeviceClasses"
            :label="t('config.filter_device_classes')"
            density="compact" hide-details multiple chips closable-chips clearable
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

        <template v-if="draft.entry_type !== 'divider'">
          <v-divider />
          <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.section_actions') }}</p>
          <div v-for="action in statusBarActionConfigs" :key="action.model" class="d-flex flex-column ga-2">
            <v-select
              v-model="draft[action.model]"
              :label="t(action.label)"
              :items="statusBarActionItems"
              item-title="title"
              item-value="value"
              density="compact"
              hide-details="auto"
            />
            <template v-if="draft[action.model] === 'call_service'">
              <v-text-field
                v-model="draft[action.service]"
                :label="t('config.action_service')"
                placeholder="script.turn_on"
                density="compact"
                hide-details="auto"
              />
              <EntityPicker v-model="draft[action.target]" :placeholder="t('config.action_service_target_optional')" />
              <v-textarea
                v-model="draft[action.data]"
                :label="t('config.action_service_data')"
                :placeholder="`{ ${t('config.action_service_data_placeholder')} }`"
                rows="3"
                auto-grow
                density="compact"
                hide-details="auto"
              />
            </template>
          </div>
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
  entry: Record<string, any>
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  save: [Record<string, any>]
}>()

const draft = ref<Record<string, any>>({})
const roomTab = ref<'main' | 'sensors'>('main')

watch(() => props.modelValue, (v) => {
  if (v) {
    draft.value = JSON.parse(JSON.stringify(props.entry))
    if (draft.value.entry_type === 'problem') applyProblemDefaults()
    roomTab.value = 'main'
  }
}, { immediate: true })

function applyProblemDefaults() {
  draft.value.icon ??= 'mdi-home-alert-outline'
  draft.value.inactive_icon ??= 'mdi-shield-check-outline'
  draft.value.battery_threshold ??= 20
  draft.value.max_items ??= 8
  draft.value.show_badge ??= true
  draft.value.show_batteries ??= true
  draft.value.show_unavailable ??= true
  draft.value.show_openings ??= true
  draft.value.show_updates ??= true
  draft.value.show_alerts ??= true
  draft.value.show_repairs ??= true
  draft.value.show_system ??= true
  draft.value.ignored_offline_platforms ??= [...DEFAULT_IGNORED_OFFLINE_PLATFORMS]
  draft.value.ignored_offline_domains ??= [...DEFAULT_IGNORED_OFFLINE_DOMAINS]
}

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
  } else if (type === 'problem') {
    draft.value = {
      entry_type: 'problem',
      icon: draft.value.icon ?? 'mdi-home-alert-outline',
      inactive_icon: 'mdi-shield-check-outline',
      label: draft.value.label ?? '',
      battery_threshold: 20,
      max_items: 8,
      show_badge: true,
      show_batteries: true,
      show_unavailable: true,
      show_openings: true,
      show_updates: true,
      show_alerts: true,
      show_repairs: true,
      show_system: true,
      ignored_offline_platforms: [...DEFAULT_IGNORED_OFFLINE_PLATFORMS],
      ignored_offline_domains: [...DEFAULT_IGNORED_OFFLINE_DOMAINS],
    }
  } else if (type === 'camera') {
    draft.value = {
      entry_type: 'camera',
      camera_entity_id: (draft.value as any).camera_entity_id ?? '',
      sensor_entity_id: (draft.value as any).sensor_entity_id ?? '',
      icon: draft.value.icon ?? 'mdi-cctv',
      label: draft.value.label ?? '',
      active_state: 'on',
    }
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

const availableDeviceClasses = computed(() => {
  const classes = new Set<string>()
  for (const entity of Object.values(entityStore.entities)) {
    const dc = entity.attributes?.device_class as string | undefined
    if (dc) classes.add(dc)
  }
  return [...classes].sort()
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
const statusBarActionItems = computed(() => [
  { title: t('config.action_default'), value: 'default' },
  { title: t('config.action_none'), value: 'none' },
  { title: t('config.action_open_entity_detail'), value: 'open_detail' },
  { title: t('config.action_toggle_entity'), value: 'toggle' },
  { title: t('config.action_call_service'), value: 'call_service' },
])
const statusBarActionConfigs = [
  {
    label: 'config.card_click_action',
    model: 'click_action',
    service: 'click_service',
    target: 'click_target_entity',
    data: 'click_service_data',
  },
  {
    label: 'config.card_double_click_action',
    model: 'double_click_action',
    service: 'double_click_service',
    target: 'double_click_target_entity',
    data: 'double_click_service_data',
  },
  {
    label: 'config.card_hold_action',
    model: 'hold_action',
    service: 'hold_service',
    target: 'hold_target_entity',
    data: 'hold_service_data',
  },
] as const

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
    if (!Array.isArray(f.device_classes)) f.device_classes = []
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
  if (d.entry_type !== 'divider') {
    d.click_action ??= 'default'
    d.double_click_action ??= 'none'
    d.hold_action ??= 'none'
  }
}, { deep: true, immediate: true })
</script>
