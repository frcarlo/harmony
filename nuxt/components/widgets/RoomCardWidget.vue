<template>
  <div class="h-100 d-flex pa-3 ga-2 room-card"
    :style="{ cursor: lightEntityIds.length ? 'pointer' : undefined, filter: lightOn ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' : undefined }"
    @click="handleCardClick"
    @dblclick="handleCardDoubleClick"
    @mousedown="startLongPress" @mouseup="cancelLongPress" @mouseleave="cancelLongPress"
    @touchstart.passive="startLongPress" @touchend="cancelLongPress" @touchmove="cancelLongPress">
    <!-- Main content -->
    <div class="flex-grow-1 d-flex flex-column justify-space-between overflow-hidden">
      <!-- Status icons -->
      <div class="d-flex ga-1 flex-wrap align-center">
        <!-- Light indicator -->
        <v-btn v-if="lightEntityIds.length" :icon="lightOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'"
          :color="lightOn ? 'warning' : 'medium-emphasis'" size="x-small" rounded="circle"
          :variant="lightOn ? 'flat' : 'tonal'" density="comfortable"
          :title="lightButtonTitle"
          @mousedown.stop @click.stop="openLightDetail" />
        <!-- Climate mode indicator -->
        <v-tooltip v-if="props.config.climate_entity && hvacMode" :text="hvacModeLabel" location="top">
          <template #activator="{ props: tp }">
            <v-btn v-bind="tp" :icon="hvacModeIcon" size="x-small" rounded="circle"
              :color="hvacModeColor" :variant="hvacMode !== 'off' ? 'flat' : 'tonal'"
              density="comfortable" @mousedown.stop @click.stop="climateDialogOpen = true" />
          </template>
        </v-tooltip>
        <v-btn v-for="(s, i) in visibleStatusEntities" :key="`${s.entity_id}-${i}`" :icon="s.icon" size="x-small" rounded="circle"
          :variant="isActive(s) ? 'flat' : 'tonal'"
          :color="isActive(s) ? (s.active_color ?? 'primary') : (s.inactive_color ?? 'medium-emphasis')"
          density="comfortable" :title="statusTitle(s)" @mousedown.stop @click.stop="openDetail(s)" />
      </div>

      <!-- Info: climate temp or free sensor -->
      <div class="d-flex align-center ga-2 room-card__values">
        <template v-if="props.config.climate_entity">
          <v-icon icon="mdi-thermometer" size="20" color="medium-emphasis" />
          <span v-if="currentTemp !== undefined" class="text-h5 font-weight-bold">{{ currentTemp.toFixed(1) }}°C</span>
          <span v-else class="text-body-2 text-medium-emphasis">–</span>
        </template>
        <template v-else-if="props.config.sensor_entity && sensorEntity">
          <v-icon :icon="props.config.sensor_icon || 'mdi-eye'" size="20" color="medium-emphasis" />
          <span class="text-h5 font-weight-bold">{{ sensorDisplay }}</span>
        </template>
        <template v-for="sensor in compactExtraSensors" :key="sensor.entity_id">
          <v-chip size="x-small" variant="tonal" class="room-card__sensor-chip" @mousedown.stop @click.stop="openSensorEntity(sensor.entity_id)">
            <v-icon :icon="sensor.icon || 'mdi-gauge'" size="14" start />
            {{ sensorDisplayFor(sensor) }}
          </v-chip>
        </template>
      </div>

      <!-- Room name -->
      <span class="text-caption text-truncate" :style="{ color: lightOn ? 'rgba(var(--v-theme-on-surface), 0.9)' : undefined }">{{ props.config.name }}</span>
    </div>

    <!-- Temp control -->
    <div v-if="props.config.show_temp_control && props.config.climate_entity"
      class="d-flex flex-column align-center justify-space-between">
      <v-btn icon="mdi-plus" size="small" variant="tonal" density="comfortable" :disabled="isUnavailable"
        @mousedown.stop @click.stop="adjustTemp(0.5)" />
      <span v-if="targetTemp !== undefined" class="text-caption font-weight-medium">{{ targetTemp.toFixed(0) }}°</span>
      <v-btn icon="mdi-minus" size="small" variant="tonal" density="comfortable" :disabled="isUnavailable"
        @mousedown.stop @click.stop="adjustTemp(-0.5)" />
    </div>
  </div>

  <!-- Detail dialogs (domain-aware) -->
  <LightDetailDialog v-if="dialogDomain === 'light'" v-model="dialogOpen" :entity-id="dialogEntityId!" />
  <LockDetailDialog v-else-if="dialogDomain === 'lock'" v-model="dialogOpen" :entity-id="dialogEntityId!" />
  <EntityDetailDialog v-else-if="dialogOpen && dialogEntityId" v-model="dialogOpen" :entity-id="dialogEntityId"
    :icon="dialogStatusEntity?.icon" :active-color="dialogStatusEntity?.active_color"
    :active-state="dialogStatusEntity?.active_state" />
  <!-- Climate detail via long press -->
  <ClimateDetailDialog v-if="props.config.climate_entity" v-model="climateDialogOpen" :entity-id="props.config.climate_entity" />
</template>

<script setup lang="ts">
import type { RoomCardWidgetConfig, RoomCardStatusEntity } from '~/types/dashboard'

const { t } = useI18n()

const props = defineProps<{ config: RoomCardWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const { formatEntityState } = useLocalizedEntityState()

const climateEntity = computed(() =>
  props.config.climate_entity ? entityStore.entities[props.config.climate_entity] : undefined
)
const currentTemp = computed(() => climateEntity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => climateEntity.value?.attributes?.temperature as number | undefined)
const isUnavailable = computed(() => !climateEntity.value || climateEntity.value.state === 'unavailable')

const MANAGED_OPENING_CLASSES = new Set(['door', 'garage_door', 'opening', 'window'])
const statusEntities = computed(() => (props.config.status_entities ?? []).filter((s) => s.entity_id))
const lightEntityIds = computed(() => {
  const ids = [
    props.config.light_entity,
    ...(props.config.light_entities ?? []),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0)
  return [...new Set(ids)]
})
const lightEntities = computed(() => lightEntityIds.value.map(id => entityStore.entities[id]).filter(Boolean))
const lightEntity = computed(() => lightEntities.value[0])
const sensorEntity = computed(() => props.config.sensor_entity ? entityStore.entities[props.config.sensor_entity] : undefined)
const sensorDisplay = computed(() => formatEntityState(sensorEntity.value))
const lightOn = computed(() => lightEntities.value.some(entity => entity.state === 'on'))
const compactExtraSensors = computed(() => (props.config.sensor_entities ?? []).filter((sensor) => sensor.entity_id).slice(0, 3))
const lightButtonTitle = computed(() => {
  const state = lightOn.value ? t('room_card.light_on') : t('room_card.light_off')
  return lightEntityIds.value.length > 1 ? `${state} · ${lightEntityIds.value.length}` : state
})

const roomAreaId = computed(() => {
  const firstEntityId = props.config.light_entity || props.config.climate_entity || props.config.sensor_entity || lightEntityIds.value[0]
  return firstEntityId ? entityStore.entityAreaMap[firstEntityId] : undefined
})

const autoStatusEntities = computed<RoomCardStatusEntity[]>(() => {
  if (props.config.auto_status_entities === false || !roomAreaId.value) return []
  const configuredIds = new Set(statusEntities.value.map(status => status.entity_id))
  return Object.values(entityStore.entities)
    .filter(entity => entity.entity_id.startsWith('binary_sensor.'))
    .filter(entity => entityStore.entityAreaMap[entity.entity_id] === roomAreaId.value)
    .filter(entity => MANAGED_OPENING_CLASSES.has(String(entity.attributes?.device_class ?? '')))
    .filter(entity => !configuredIds.has(entity.entity_id))
    .slice(0, 6)
    .map(entity => ({
      entity_id: entity.entity_id,
      icon: autoStatusIcon(String(entity.attributes?.device_class ?? '')),
      active_state: 'on',
      active_color: 'warning',
    }))
})
const visibleStatusEntities = computed(() => [...statusEntities.value, ...autoStatusEntities.value])

const HVAC_MODE_ICONS: Record<string, string> = {
  heat: 'mdi-fire', cool: 'mdi-snowflake', auto: 'mdi-thermostat-auto',
  heat_cool: 'mdi-thermometer', fan_only: 'mdi-fan', dry: 'mdi-water-percent', off: 'mdi-power',
}
const hvacMode = computed(() => climateEntity.value?.state ?? '')
const hvacModeIcon = computed(() => HVAC_MODE_ICONS[hvacMode.value] ?? 'mdi-thermostat')
const hvacModeColor = computed(() => {
  if (hvacMode.value === 'heat') return 'warning'
  if (hvacMode.value === 'cool') return 'info'
  if (hvacMode.value === 'auto' || hvacMode.value === 'heat_cool') return 'primary'
  if (hvacMode.value === 'fan_only') return 'secondary'
  return 'medium-emphasis'
})
const hvacModeLabel = computed(() => hvacMode.value.replace(/_/g, ' '))

function defaultActiveState(entityId: string): string {
  const domain = entityId.split('.')[0]
  if (domain === 'lock') return 'locked'
  if (domain === 'cover') return 'open'
  if (domain === 'media_player') return 'playing'
  if (domain === 'binary_sensor') return 'on'
  return 'on'
}

function autoStatusIcon(deviceClass: string) {
  if (deviceClass === 'window') return 'mdi-window-open-variant'
  if (deviceClass === 'garage_door') return 'mdi-garage-open-variant'
  return 'mdi-door-open'
}

function isActive(s: { entity_id: string; active_state?: string }) {
  const e = entityStore.entities[s.entity_id]
  return e?.state === (s.active_state || defaultActiveState(s.entity_id))
}

function statusTitle(s: RoomCardStatusEntity) {
  const entity = entityStore.entities[s.entity_id]
  const name = (entity?.attributes?.friendly_name as string | undefined) ?? s.entity_id
  return `${name}: ${formatEntityState(entity)}`
}

// Dialog state
const dialogOpen = ref(false)
const dialogEntityId = ref<string | null>(null)
const dialogStatusEntity = ref<RoomCardStatusEntity | null>(null)
const dialogDomain = computed(() => dialogEntityId.value?.split('.')[0] ?? '')
const climateDialogOpen = ref(false)

function openDetail(s: RoomCardStatusEntity) {
  dialogStatusEntity.value = s
  dialogEntityId.value = s.entity_id
  dialogOpen.value = true
}

function openLightDetail() {
  const entityId = lightEntityIds.value[0]
  if (!entityId) return
  dialogStatusEntity.value = null
  dialogEntityId.value = entityId
  dialogOpen.value = true
}

function openSensorEntity(entityId: string) {
  dialogStatusEntity.value = null
  dialogEntityId.value = entityId
  dialogOpen.value = true
}

function sensorEntityState(sensor: { entity_id: string }) {
  return entityStore.entities[sensor.entity_id]
}

function sensorDisplayFor(sensor: { entity_id: string }) {
  return formatEntityState(sensorEntityState(sensor))
}

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let clickTimer: ReturnType<typeof setTimeout> | null = null

function resolveCardAction(kind: 'click' | 'double_click' | 'hold') {
  if (kind === 'click') return props.config.card_click_action ?? 'none'
  if (kind === 'double_click') return props.config.card_double_click_action ?? 'toggle_light'
  return props.config.card_hold_action ?? 'open_climate_detail'
}

function runCardAction(action: string) {
  if (action === 'toggle_light') {
    void toggleLight()
    return
  }
  if (action === 'open_light_detail') {
    openLightDetail()
    return
  }
  if (action === 'open_climate_detail' && props.config.climate_entity) {
    climateDialogOpen.value = true
  }
}

function handleCardClick() {
  const action = resolveCardAction('click')
  if (action === 'none') return
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    runCardAction(action)
  }, 220)
}

function handleCardDoubleClick() {
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  const action = resolveCardAction('double_click')
  if (action === 'none') return
  runCardAction(action)
}

function startLongPress() {
  const action = resolveCardAction('hold')
  if (action === 'none') return
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    runCardAction(action)
  }, 500)
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}

async function toggleLight() {
  const ids = lightEntityIds.value.filter((id) => {
    const entity = entityStore.entities[id]
    return entity && entity.state !== 'unavailable' && entity.state !== 'unknown'
  })
  if (!ids.length) return
  await client.callService({
    domain: 'light',
    service: lightOn.value ? 'turn_off' : 'turn_on',
    target: { entity_id: ids },
  })
}

async function adjustTemp(delta: number) {
  if (isUnavailable.value || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate', service: 'set_temperature',
    target: { entity_id: props.config.climate_entity! },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}
</script>

<style scoped>
.room-card__values {
  min-width: 0;
  flex-wrap: wrap;
}

.room-card__sensor-chip {
  max-width: 120px;
}
</style>
