<template>
  <div class="h-100 d-flex flex-column pa-3 ga-3">
    <!-- Header -->
    <div class="d-flex align-center ga-2">
      <v-icon icon="mdi-cctv" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="cs-name">{{ displayName }}</span>
    </div>

    <!-- Sensor status -->
    <div class="d-flex align-center ga-3 flex-grow-1">
      <v-icon :icon="stateIcon" :color="stateColor" size="22" />
      <div class="d-flex flex-column">
        <span class="cs-state-label" :class="stateColor ? `text-${stateColor}` : ''">{{ stateLabel }}</span>
        <span v-if="stateUnit" class="text-caption text-medium-emphasis">{{ stateUnit }}</span>
        <span v-if="lastChanged" class="cs-time">{{ lastChanged }}</span>
      </div>
    </div>

    <!-- Open camera button -->
    <v-btn
      variant="tonal"
      size="small"
      rounded="lg"
      class="text-none"
      prepend-icon="mdi-camera"
      @click="dialogOpen = true"
    >
      {{ t('camera_status.open') }}
    </v-btn>

    <!-- Camera dialog -->
    <v-dialog v-model="dialogOpen" max-width="860">
      <v-card class="dialog-glass" rounded="xl">
        <div style="height: 520px; display: flex; flex-direction: column;">
          <CameraWidget :config="cameraWidgetConfig" />
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { CameraStatusWidgetConfig, CameraWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const props = defineProps<{ config: CameraStatusWidgetConfig }>()
const entityStore = useEntityStore()

// ── Entities ──────────────────────────────────────────────────────────────
const cameraEntity = computed(() => entityStore.entities[props.config.camera_entity_id ?? ''])
const sensorEntity = computed(() => entityStore.entities[props.config.sensor_entity_id ?? ''])

// ── Display name ──────────────────────────────────────────────────────────
const displayName = computed(() =>
  props.config.name
  ?? (cameraEntity.value?.attributes?.friendly_name as string | undefined)
  ?? props.config.camera_entity_id?.split('.').pop()
  ?? t('widget.camera.label')
)

// ── Sensor state ──────────────────────────────────────────────────────────
const sensorDomain = computed(() => props.config.sensor_entity_id?.split('.')[0] ?? '')
const isBinary = computed(() => sensorDomain.value === 'binary_sensor')
const sensorState = computed(() => sensorEntity.value?.state ?? 'unavailable')
const activeState = computed(() => props.config.active_state ?? 'on')
const isActive = computed(() => sensorState.value === activeState.value)

const stateLabel = computed(() => {
  if (!sensorEntity.value || sensorState.value === 'unavailable') return t('common.unavailable')
  if (sensorState.value === 'unknown') return t('common.unknown')
  if (isBinary.value) {
    return isActive.value ? t('camera_status.active') : t('camera_status.inactive')
  }
  return sensorState.value
})

const stateUnit = computed(() => {
  if (isBinary.value) return null
  return (sensorEntity.value?.attributes?.unit_of_measurement as string | undefined) ?? null
})

const stateColor = computed(() => {
  if (!sensorEntity.value || sensorState.value === 'unavailable') return undefined
  if (isBinary.value) {
    if (isActive.value) return props.config.active_color ?? 'error'
    return props.config.inactive_color ?? undefined
  }
  return undefined
})

const stateIcon = computed(() => {
  if (!sensorEntity.value) return 'mdi-help-circle-outline'
  const dc = sensorEntity.value.attributes?.device_class as string | undefined
  if (isBinary.value) {
    switch (dc) {
      case 'motion':   return isActive.value ? 'mdi-motion-sensor' : 'mdi-motion-sensor-off'
      case 'door':
      case 'opening':  return isActive.value ? 'mdi-door-open' : 'mdi-door-closed'
      case 'window':   return isActive.value ? 'mdi-window-open' : 'mdi-window-closed'
      case 'smoke':    return 'mdi-smoke-detector-variant'
      case 'moisture': return 'mdi-water'
      case 'sound':    return 'mdi-ear-hearing'
      case 'vibration': return 'mdi-vibrate'
      default:         return isActive.value ? 'mdi-alert-circle' : 'mdi-check-circle-outline'
    }
  }
  switch (dc) {
    case 'temperature': return 'mdi-thermometer'
    case 'humidity':    return 'mdi-water-percent'
    case 'battery':     return 'mdi-battery'
    case 'illuminance': return 'mdi-brightness-5'
    default:            return 'mdi-eye'
  }
})

const lastChanged = computed(() => {
  const raw = sensorEntity.value?.last_changed
  if (!raw) return null
  try {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(new Date(raw))
  } catch { return null }
})

// ── Dialog & camera widget config ─────────────────────────────────────────
const dialogOpen = ref(false)

const cameraWidgetConfig = computed<CameraWidgetConfig>(() => ({
  entity_id: props.config.camera_entity_id ?? '',
  name: displayName.value,
  stream_type: props.config.default_stream ?? 'snapshot',
  refresh_interval: props.config.snapshot_refresh,
}))
</script>

<style scoped>
.cs-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.cs-time {
  font-size: 11px;
  opacity: 0.5;
  line-height: 1.3;
}

.cs-state-label {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
}
</style>
