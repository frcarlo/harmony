<template>
  <div class="h-100 d-flex pa-3 ga-2"
    :style="{ cursor: props.config.light_entity ? 'pointer' : undefined, filter: lightOn ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' : undefined }"
    @dblclick="toggleLight"
    @mousedown="startLongPress" @mouseup="cancelLongPress" @mouseleave="cancelLongPress"
    @touchstart.passive="startLongPress" @touchend="cancelLongPress" @touchmove="cancelLongPress">
    <!-- Main content -->
    <div class="flex-grow-1 d-flex flex-column justify-space-between overflow-hidden">
      <!-- Status icons -->
      <div class="d-flex ga-1 flex-wrap align-center">
        <!-- Light indicator -->
        <v-btn v-if="props.config.light_entity" :icon="lightOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'"
          :color="lightOn ? 'warning' : 'medium-emphasis'" size="x-small" rounded="circle"
          :variant="lightOn ? 'flat' : 'tonal'" density="comfortable"
          :title="lightOn ? t('room_card.light_on') : t('room_card.light_off')"
          @mousedown.stop @click.stop="openLightDetail" />
        <!-- Climate mode indicator -->
        <v-tooltip v-if="props.config.climate_entity && hvacMode" :text="hvacModeLabel" location="top">
          <template #activator="{ props: tp }">
            <v-btn v-bind="tp" :icon="hvacModeIcon" size="x-small" rounded="circle"
              :color="hvacModeColor" :variant="hvacMode !== 'off' ? 'flat' : 'tonal'"
              density="comfortable" @mousedown.stop @click.stop="climateDialogOpen = true" />
          </template>
        </v-tooltip>
        <v-btn v-for="(s, i) in statusEntities" :key="i" :icon="s.icon" size="x-small" rounded="circle"
          :variant="isActive(s) ? 'flat' : 'tonal'"
          :color="isActive(s) ? (s.active_color ?? 'primary') : (s.inactive_color ?? 'medium-emphasis')"
          density="comfortable" @mousedown.stop @click.stop="openDetail(s)" />
      </div>

      <!-- Info: climate temp or free sensor -->
      <div class="d-flex align-center ga-2">
        <template v-if="props.config.climate_entity">
          <v-icon icon="mdi-thermometer" size="20" color="medium-emphasis" />
          <span v-if="currentTemp !== undefined" class="text-h5 font-weight-bold">{{ currentTemp.toFixed(1) }}°C</span>
          <span v-else class="text-body-2 text-medium-emphasis">–</span>
        </template>
        <template v-else-if="props.config.sensor_entity && sensorEntity">
          <v-icon :icon="props.config.sensor_icon || 'mdi-eye'" size="20" color="medium-emphasis" />
          <span class="text-h5 font-weight-bold">{{ sensorEntity.state }}<span class="text-body-2 ml-1">{{ sensorUnit }}</span></span>
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

const climateEntity = computed(() =>
  props.config.climate_entity ? entityStore.entities[props.config.climate_entity] : undefined
)
const currentTemp = computed(() => climateEntity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => climateEntity.value?.attributes?.temperature as number | undefined)
const isUnavailable = computed(() => !climateEntity.value || climateEntity.value.state === 'unavailable')

const statusEntities = computed(() => (props.config.status_entities ?? []).filter((s) => s.entity_id))
const lightEntity = computed(() => props.config.light_entity ? entityStore.entities[props.config.light_entity] : undefined)
const sensorEntity = computed(() => props.config.sensor_entity ? entityStore.entities[props.config.sensor_entity] : undefined)
const sensorUnit = computed(() => sensorEntity.value?.attributes?.unit_of_measurement as string ?? '')
const lightOn = computed(() => lightEntity.value?.state === 'on')

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

function isActive(s: { entity_id: string; active_state?: string }) {
  const e = entityStore.entities[s.entity_id]
  return e?.state === (s.active_state || defaultActiveState(s.entity_id))
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
  if (!props.config.light_entity) return
  dialogStatusEntity.value = null
  dialogEntityId.value = props.config.light_entity
  dialogOpen.value = true
}

let longPressTimer: ReturnType<typeof setTimeout> | null = null

function startLongPress() {
  if (!props.config.climate_entity) return
  longPressTimer = setTimeout(() => {
    longPressTimer = null
    climateDialogOpen.value = true
  }, 500)
}

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
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
  if (isUnavailable.value || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate', service: 'set_temperature',
    target: { entity_id: props.config.climate_entity! },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}
</script>
