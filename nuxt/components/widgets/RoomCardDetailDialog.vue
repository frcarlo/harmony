<template>
  <v-dialog :model-value="modelValue" max-width="560" @update:model-value="emit('update:modelValue', $event)">
    <v-card rounded="xl" :class="{ 'dialog-glass': glass }">
      <div class="d-flex align-center px-4 pt-4 pb-2">
        <v-icon :icon="config.icon || 'mdi-sofa-outline'" class="mr-2" />
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ config.name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <div class="room-detail-summary mb-4">
          <div class="d-flex align-center ga-2 flex-wrap">
            <template v-if="config.climate_entity">
              <v-icon icon="mdi-thermometer" size="20" color="medium-emphasis" />
              <span v-if="currentTemp !== undefined" class="text-h4 font-weight-bold">{{ currentTemp.toFixed(1) }}°C</span>
              <span v-else class="text-body-1 text-medium-emphasis">–</span>
            </template>
            <template v-else-if="config.sensor_entity && sensorEntity">
              <v-icon :icon="config.sensor_icon || 'mdi-eye'" size="20" color="medium-emphasis" />
              <span class="text-h4 font-weight-bold">{{ sensorDisplay }}</span>
            </template>
          </div>
        </div>

        <div class="room-detail-grid">
          <div v-if="config.light_entity" class="room-detail-section">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 font-weight-medium">{{ t('widget.light.label') }}</span>
              <v-chip size="x-small" variant="tonal" :color="lightOn ? 'warning' : undefined">
                {{ lightOn ? t('common.on') : t('common.off') }}
              </v-chip>
            </div>
            <div class="d-flex align-center justify-center ga-2">
              <v-btn
                class="flex-grow-1"
                :prepend-icon="lightOn ? 'mdi-lightbulb-off-outline' : 'mdi-lightbulb-on-outline'"
                variant="tonal"
                :color="lightOn ? 'warning' : undefined"
                @click="toggleLight"
              >
                {{ lightOn ? t('switch.turn_off') : t('switch.turn_on') }}
              </v-btn>
              <v-btn icon="mdi-tune-variant" variant="text" :title="t('notification.details')" @click="lightDialogOpen = true" />
            </div>
          </div>

          <div v-if="config.climate_entity" class="room-detail-section">
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 font-weight-medium">{{ t('widget.thermostat.label') }}</span>
              <v-chip size="x-small" variant="tonal" :color="climateActive ? 'primary' : undefined">
                {{ hvacModeLabel }}
              </v-chip>
            </div>
            <div v-if="!climateActive" class="d-flex align-center justify-center ga-2">
              <v-btn
                class="flex-grow-1"
                prepend-icon="mdi-power"
                variant="tonal"
                color="primary"
                @click="turnClimateOn"
              >
                {{ t('switch.turn_on') }}
              </v-btn>
              <v-btn icon="mdi-tune-variant" variant="text" :title="t('notification.details')" @click="climateDialogOpen = true" />
            </div>
            <div v-else class="d-flex align-center justify-center ga-4 room-detail-section__thermostat-row">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis">{{ t('common.current') }}</div>
                <div class="text-h5 font-weight-bold">{{ currentTempDisplay }}</div>
              </div>
              <div class="d-flex align-center ga-2 room-detail-section__thermostat-controls">
                <v-btn icon="mdi-minus" size="small" variant="tonal" :disabled="!canAdjustTemp" @click="adjustTemp(-0.5)" />
                <div class="text-center" style="min-width: 52px;">
                  <div class="text-caption text-medium-emphasis">{{ t('common.target') }}</div>
                  <div class="text-body-1 font-weight-bold">{{ targetTempDisplay }}</div>
                </div>
                <v-btn icon="mdi-plus" size="small" variant="tonal" :disabled="!canAdjustTemp" @click="adjustTemp(0.5)" />
              </div>
              <v-btn
                icon="mdi-power"
                variant="text"
                :title="t('common.off')"
                color="medium-emphasis"
                @click="turnClimateOff"
              />
              <v-btn icon="mdi-tune-variant" variant="text" :title="t('notification.details')" @click="climateDialogOpen = true" />
            </div>
          </div>

          <div
            v-if="config.sensor_entity && sensorEntity"
            class="room-detail-section room-detail-section--clickable"
            @click="openSensorDetail"
          >
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 font-weight-medium">{{ t('widget.sensor.label') }}</span>
              <v-icon :icon="config.sensor_icon || 'mdi-eye'" size="18" color="medium-emphasis" />
            </div>
            <div class="text-h5 font-weight-bold">{{ sensorDisplay }}</div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ sensorFriendlyName }}
            </div>
          </div>

          <div
            v-for="(sensor, idx) in extraSensors"
            :key="`extra-sensor-${idx}`"
            class="room-detail-section room-detail-section--clickable"
            @click="openExtraSensorDetail(sensor)"
          >
            <div class="d-flex justify-space-between align-center mb-2">
              <span class="text-body-2 font-weight-medium">{{ t('widget.sensor.label') }}</span>
              <v-icon :icon="sensor.icon || 'mdi-eye'" size="18" color="medium-emphasis" />
            </div>
            <div class="text-h5 font-weight-bold">{{ sensorDisplayFor(sensor) }}</div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ sensorFriendlyNameFor(sensor) }}
            </div>
          </div>
        </div>

        <div v-if="statusEntities.length" class="room-detail-section mt-4">
          <div class="text-body-2 font-weight-medium mb-3">{{ t('config.status_entities') }}</div>
          <div class="d-flex flex-wrap ga-2">
            <v-btn
              v-for="(status, idx) in statusEntities"
              :key="idx"
              :prepend-icon="status.icon"
              variant="tonal"
              size="small"
              :color="isStatusActive(status) ? (status.active_color ?? 'primary') : (status.inactive_color ?? 'medium-emphasis')"
              @click="openStatusDetail(status)"
            >
              {{ statusLabel(status) }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <LightDetailDialog
      v-if="config.light_entity"
      v-model="lightDialogOpen"
      :entity-id="config.light_entity"
    />
    <ClimateDetailDialog
      v-if="config.climate_entity"
      v-model="climateDialogOpen"
      :entity-id="config.climate_entity"
    />
    <LockDetailDialog
      v-if="statusDialogOpen && statusDialogEntity && statusDialogDomain === 'lock'"
      v-model="statusDialogOpen"
      :entity-id="statusDialogEntity"
    />
    <LightDetailDialog
      v-else-if="statusDialogOpen && statusDialogEntity && statusDialogDomain === 'light'"
      v-model="statusDialogOpen"
      :entity-id="statusDialogEntity"
    />
    <EntityDetailDialog
      v-else-if="statusDialogOpen && statusDialogEntity"
      v-model="statusDialogOpen"
      :entity-id="statusDialogEntity"
      :icon="statusDialogConfig?.icon"
      :active-color="statusDialogConfig?.active_color"
      :active-state="statusDialogConfig?.active_state"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import type { RoomCardSensorEntity, RoomCardStatusEntity, RoomCardWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{
  modelValue: boolean
  config: RoomCardWidgetConfig & { icon?: string }
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const config = computed(() => props.config)

const entityStore = useEntityStore()
const client = useHAClient()

const lightEntity = computed(() => props.config.light_entity ? entityStore.entities[props.config.light_entity] : undefined)
const climateEntity = computed(() => props.config.climate_entity ? entityStore.entities[props.config.climate_entity] : undefined)
const sensorEntity = computed(() => props.config.sensor_entity ? entityStore.entities[props.config.sensor_entity] : undefined)
const statusEntities = computed(() => (props.config.status_entities ?? []).filter((status) => status.entity_id))

const areaName = computed(() => {
  const firstEntityId = props.config.light_entity || props.config.climate_entity || props.config.sensor_entity
  if (!firstEntityId) return undefined
  const areaId = entityStore.entityAreaMap[firstEntityId]
  return areaId ? entityStore.areas.find((area) => area.area_id === areaId)?.name : undefined
})

const lightOn = computed(() => lightEntity.value?.state === 'on')
const hvacMode = computed(() => String(climateEntity.value?.state ?? 'off'))
const climateActive = computed(() => !!climateEntity.value && !['off', 'unavailable'].includes(hvacMode.value))
const currentTemp = computed(() => climateEntity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => climateEntity.value?.attributes?.temperature as number | undefined)
const canAdjustTemp = computed(() => targetTemp.value !== undefined && climateEntity.value?.state !== 'unavailable')

const sensorFriendlyName = computed(() => (
  sensorEntity.value?.attributes?.friendly_name as string | undefined
) ?? props.config.sensor_entity ?? '')
const sensorDisplay = computed(() => {
  if (!sensorEntity.value) return '—'
  const unit = sensorEntity.value.attributes?.unit_of_measurement as string | undefined
  return `${sensorEntity.value.state}${unit ? ` ${unit}` : ''}`
})

const currentTempDisplay = computed(() => currentTemp.value !== undefined ? `${currentTemp.value.toFixed(1)}°C` : '—')
const targetTempDisplay = computed(() => targetTemp.value !== undefined ? `${targetTemp.value.toFixed(1)}°C` : '—')
const extraSensors = computed(() => (props.config.sensor_entities ?? []).filter((sensor) => sensor.entity_id))

const HVAC_MODE_ICONS: Record<string, string> = {
  heat: 'mdi-fire',
  cool: 'mdi-snowflake',
  auto: 'mdi-thermostat-auto',
  heat_cool: 'mdi-thermometer',
  fan_only: 'mdi-fan',
  dry: 'mdi-water-percent',
  off: 'mdi-power',
}

const hvacModeIcon = computed(() => HVAC_MODE_ICONS[hvacMode.value] ?? 'mdi-thermostat')
const hvacModeColor = computed(() => {
  if (hvacMode.value === 'heat') return 'warning'
  if (hvacMode.value === 'cool') return 'info'
  if (hvacMode.value === 'auto' || hvacMode.value === 'heat_cool') return 'primary'
  if (hvacMode.value === 'fan_only') return 'secondary'
  return 'medium-emphasis'
})

const hvacModeLabel = computed(() => {
  const mode = hvacMode.value
  const key = ({
    heat: 'thermostat.mode_heat',
    cool: 'thermostat.mode_cool',
    auto: 'thermostat.mode_auto',
    off: 'thermostat.mode_off',
  } as Record<string, string>)[mode]
  if (!key) return mode.replace(/_/g, ' ')
  const translated = t(key)
  return translated !== key ? translated : mode
})

const lightDialogOpen = ref(false)
const climateDialogOpen = ref(false)
const statusDialogOpen = ref(false)
const statusDialogEntity = ref<string | null>(null)
const statusDialogConfig = ref<RoomCardStatusEntity | null>(null)
const statusDialogDomain = computed(() => statusDialogEntity.value?.split('.')[0] ?? '')

function defaultActiveState(entityId: string): string {
  const domain = entityId.split('.')[0]
  if (domain === 'lock') return 'locked'
  if (domain === 'cover') return 'open'
  if (domain === 'media_player') return 'playing'
  if (domain === 'binary_sensor') return 'on'
  return 'on'
}

function isStatusActive(status: RoomCardStatusEntity) {
  const entity = entityStore.entities[status.entity_id]
  return entity?.state === (status.active_state || defaultActiveState(status.entity_id))
}

function statusLabel(status: RoomCardStatusEntity) {
  const entity = entityStore.entities[status.entity_id]
  return (entity?.attributes?.friendly_name as string | undefined) ?? status.entity_id
}

function openStatusDetail(status: RoomCardStatusEntity) {
  statusDialogConfig.value = status
  statusDialogEntity.value = status.entity_id
  statusDialogOpen.value = true
}

function openSensorDetail() {
  if (!props.config.sensor_entity) return
  statusDialogConfig.value = null
  statusDialogEntity.value = props.config.sensor_entity
  statusDialogOpen.value = true
}

function sensorEntityState(sensor: RoomCardSensorEntity) {
  return entityStore.entities[sensor.entity_id]
}

function sensorFriendlyNameFor(sensor: RoomCardSensorEntity) {
  return (sensorEntityState(sensor)?.attributes?.friendly_name as string | undefined) ?? sensor.entity_id
}

function sensorDisplayFor(sensor: RoomCardSensorEntity) {
  const entity = sensorEntityState(sensor)
  if (!entity) return '—'
  const unit = entity.attributes?.unit_of_measurement as string | undefined
  return `${entity.state}${unit ? ` ${unit}` : ''}`
}

function openExtraSensorDetail(sensor: RoomCardSensorEntity) {
  statusDialogConfig.value = null
  statusDialogEntity.value = sensor.entity_id
  statusDialogOpen.value = true
}

async function toggleLight() {
  if (!props.config.light_entity || !lightEntity.value || lightEntity.value.state === 'unavailable') return
  await client.callService({
    domain: 'light',
    service: lightOn.value ? 'turn_off' : 'turn_on',
    target: { entity_id: props.config.light_entity },
  })
}

async function adjustTemp(delta: number) {
  if (!props.config.climate_entity || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate',
    service: 'set_temperature',
    target: { entity_id: props.config.climate_entity },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}

async function turnClimateOn() {
  if (!props.config.climate_entity) return
  const nextMode = availableClimateOnMode.value
  if (!nextMode) return
  await client.callService({
    domain: 'climate',
    service: 'set_hvac_mode',
    target: { entity_id: props.config.climate_entity },
    service_data: { hvac_mode: nextMode },
  })
}

async function turnClimateOff() {
  if (!props.config.climate_entity) return
  await client.callService({
    domain: 'climate',
    service: 'set_hvac_mode',
    target: { entity_id: props.config.climate_entity },
    service_data: { hvac_mode: 'off' },
  })
}

const availableClimateOnMode = computed(() => {
  const modes = climateEntity.value?.attributes?.hvac_modes as string[] | undefined
  if (!Array.isArray(modes)) return null
  return modes.find((mode) => mode !== 'off') ?? null
})
</script>

<style scoped>
.room-detail-summary {
  min-height: 56px;
}

.room-detail-grid {
  display: grid;
  gap: 12px;
}

.room-detail-section {
  padding: 14px;
  border-radius: 18px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.room-detail-section--clickable {
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.room-detail-section--clickable:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-color: rgba(var(--v-theme-on-surface), 0.1);
}

.room-detail-section__thermostat-row {
  min-height: 56px;
}

.room-detail-section__thermostat-controls {
  justify-content: center;
}

@media (min-width: 520px) {
  .room-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
