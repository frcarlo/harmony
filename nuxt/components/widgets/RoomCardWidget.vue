<template>
  <div class="h-100 d-flex pa-3 ga-2" :style="{ cursor: props.config.light_entity ? 'pointer' : undefined }"
    @dblclick="toggleLight">
    <!-- Main content -->
    <div class="flex-grow-1 d-flex flex-column justify-space-between overflow-hidden">
      <!-- Status icons -->
      <div class="d-flex ga-1 flex-wrap align-center">
        <!-- Light indicator -->
        <v-btn v-if="props.config.light_entity" :icon="lightOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'"
          :color="lightOn ? 'warning' : 'medium-emphasis'" size="x-small" rounded="circle"
          :variant="lightOn ? 'flat' : 'tonal'" density="comfortable"
          :title="lightOn ? t('room_card.light_on') : t('room_card.light_off')" @click.stop="openLightDetail" />
        <v-btn v-for="(s, i) in statusEntities" :key="i" :icon="s.icon" size="x-small" rounded="circle"
          :variant="isActive(s) ? 'flat' : 'tonal'"
          :color="isActive(s) ? (s.active_color ?? 'primary') : (s.inactive_color ?? 'medium-emphasis')"
          density="comfortable" :title="s.entity_id" @click.stop="openDetail(s)" />
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
      <span class="text-caption text-medium-emphasis text-truncate">{{ props.config.name }}</span>
    </div>

    <!-- Temp control -->
    <div v-if="props.config.show_temp_control && props.config.climate_entity"
      class="d-flex flex-column align-center justify-space-between">
      <v-btn icon="mdi-plus" size="small" variant="tonal" density="comfortable" :disabled="isUnavailable"
        @click.stop="adjustTemp(0.5)" />
      <span v-if="targetTemp !== undefined" class="text-caption font-weight-medium">{{ targetTemp.toFixed(0) }}°</span>
      <v-btn icon="mdi-minus" size="small" variant="tonal" density="comfortable" :disabled="isUnavailable"
        @click.stop="adjustTemp(-0.5)" />
    </div>
  </div>

  <!-- Detail dialogs (domain-aware) -->
  <LightDetailDialog v-if="dialogDomain === 'light'" v-model="dialogOpen" :entity-id="dialogEntityId!" />
  <LockDetailDialog v-else-if="dialogDomain === 'lock'" v-model="dialogOpen" :entity-id="dialogEntityId!" />
  <EntityDetailDialog v-else-if="dialogOpen && dialogEntityId" v-model="dialogOpen" :entity-id="dialogEntityId"
    :icon="dialogStatusEntity?.icon" :active-color="dialogStatusEntity?.active_color"
    :active-state="dialogStatusEntity?.active_state" />
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
