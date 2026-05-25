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
      </div>
    </div>

    <!-- Open camera button -->
    <v-btn
      variant="tonal"
      size="small"
      rounded="lg"
      class="text-none"
      prepend-icon="mdi-camera"
      @click="openDialog"
    >
      {{ t('camera_status.open') }}
    </v-btn>

    <!-- Camera dialog -->
    <v-dialog v-model="dialogOpen" max-width="860">
      <v-card class="dialog-glass">
        <v-card-title class="d-flex align-center ga-2 pa-3 pb-2">
          <v-icon icon="mdi-cctv" size="18" />
          <span class="text-h6 font-weight-medium">{{ displayName }}</span>
          <v-spacer />
          <!-- Stream mode toggle — larger touch targets -->
          <v-btn-toggle v-model="streamMode" density="comfortable" rounded="lg" mandatory class="mr-1">
            <v-btn value="snapshot" size="small" icon="mdi-image-outline" :title="t('camera_status.snapshot')" />
            <v-btn value="mjpeg"    size="small" icon="mdi-play-circle-outline" :title="t('camera_status.live')" />
          </v-btn-toggle>
          <v-btn icon="mdi-close" variant="text" size="large" @click="dialogOpen = false" />
        </v-card-title>
        <div class="px-4 pb-4 d-flex flex-column ga-3">
          <div class="cs-snapshot-wrap rounded-lg">
            <!-- MJPEG live stream -->
            <img
              v-if="streamMode === 'mjpeg' && dialogOpen && mjpegSrc"
              :src="mjpegSrc"
              class="cs-snapshot"
              alt=""
              @error="mjpegError = true"
            />
            <!-- Snapshot with auto-refresh -->
            <img
              v-else-if="streamMode === 'snapshot' && snapshotSrc"
              :src="snapshotSrc"
              class="cs-snapshot"
              alt=""
              @error="snapshotError = true"
            />
            <div
              v-if="(streamMode === 'snapshot' && (snapshotError || !snapshotSrc)) || (streamMode === 'mjpeg' && (mjpegError || !mjpegSrc))"
              class="cs-snapshot cs-snapshot--error d-flex align-center justify-center"
            >
              <v-icon icon="mdi-camera-off" size="48" style="opacity:0.3" />
            </div>
            <!-- Live badge on image -->
            <div v-if="streamMode === 'mjpeg'" class="cs-live-badge">
              <v-icon icon="mdi-circle" size="8" color="error" class="mr-1" />
              {{ t('camera_status.live') }}
            </div>
          </div>
          <div class="d-flex align-center ga-2">
            <v-icon :icon="stateIcon" :color="stateColor" size="16" />
            <span class="text-body-2" :class="stateColor ? `text-${stateColor}` : ''">{{ stateLabel }}</span>
            <span v-if="stateUnit" class="text-caption text-medium-emphasis">{{ stateUnit }}</span>
            <v-spacer />
            <span v-if="lastChanged" class="text-caption text-medium-emphasis">{{ lastChanged }}</span>
          </div>
        </div>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import type { CameraStatusWidgetConfig } from '~/types/dashboard'

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
  ?? 'Kamera'
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

// ── Dialog & stream ───────────────────────────────────────────────────────
const dialogOpen = ref(false)
const streamMode = ref<'snapshot' | 'mjpeg'>(props.config.default_stream ?? 'snapshot')
const snapshotTs = ref(0)
const snapshotError = ref(false)
const mjpegError = ref(false)

const snapshotSrc = computed(() =>
  props.config.camera_entity_id && snapshotTs.value
    ? `/api/camera/${props.config.camera_entity_id}?t=${snapshotTs.value}`
    : null
)

const mjpegSrc = computed(() =>
  props.config.camera_entity_id
    ? `/api/camera/stream/${props.config.camera_entity_id}`
    : null
)

let refreshTimer: ReturnType<typeof setInterval> | null = null
const refreshMs = computed(() => (props.config.snapshot_refresh ?? 5) * 1000)

function openDialog() {
  snapshotError.value = false
  mjpegError.value = false
  snapshotTs.value = Date.now()
  streamMode.value = props.config.default_stream ?? 'snapshot'
  dialogOpen.value = true
}

watch(dialogOpen, (open) => {
  if (open) {
    if (streamMode.value === 'snapshot') {
      refreshTimer = setInterval(() => {
        snapshotError.value = false
        snapshotTs.value = Date.now()
      }, refreshMs.value)
    }
  } else {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  }
})

// Switch refresh timer when mode changes
watch(streamMode, (mode) => {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null }
  if (mode === 'snapshot' && dialogOpen.value) {
    snapshotError.value = false
    snapshotTs.value = Date.now()
    refreshTimer = setInterval(() => {
      snapshotError.value = false
      snapshotTs.value = Date.now()
    }, refreshMs.value)
  } else {
    mjpegError.value = false
  }
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.cs-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.cs-state-label {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.2;
}

.cs-snapshot-wrap {
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  aspect-ratio: 16 / 9;
  width: 100%;
}

.cs-live-badge {
  position: absolute;
  bottom: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  padding: 3px 8px 3px 6px;
  border-radius: 6px;
  pointer-events: none;
}

.cs-snapshot {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cs-snapshot--error {
  height: 100%;
}
</style>
