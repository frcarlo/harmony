<template>
  <div class="h-100 d-flex flex-column pa-3 ga-2 fan-card" :class="isOn ? 'fan-card--on' : 'fan-card--off'">
    <div class="fan-ambient" />

    <!-- Header -->
    <div class="d-flex align-center ga-2 fan-header">
      <v-icon
        :icon="isOn ? 'mdi-fan' : 'mdi-fan-off'"
        size="12"
        :class="{ 'fan-spin': isOn }"
        style="opacity:0.45; flex-shrink:0"
      />
      <span class="fan-name">{{ name }}</span>
      <v-chip
        size="x-small"
        rounded="pill"
        variant="tonal"
        :color="isOn ? 'primary' : undefined"
        class="flex-shrink-0"
      >
        {{ isUnavailable ? t('common.unavailable') : isOn ? t('common.on') : t('common.off') }}
      </v-chip>
    </div>

    <!-- Center -->
    <div class="d-flex flex-column align-center justify-center flex-grow-1 ga-2">
      <div class="fan-icon-wrap" :class="{ 'fan-icon-wrap--on': isOn }">
        <v-icon
          :icon="isOn ? 'mdi-fan' : 'mdi-fan-off'"
          :size="40"
          :color="isOn ? 'primary' : undefined"
          :style="isOn ? undefined : { opacity: 0.3 }"
          :class="{ 'fan-spin-lg': isOn }"
        />
      </div>
      <div v-if="isOn && speedLabel" class="text-body-2 font-weight-medium text-medium-emphasis">
        {{ speedLabel }}
      </div>
    </div>

    <!-- Controls -->
    <div class="d-flex flex-column ga-2">
      <!-- Toggle -->
      <v-btn
        :color="isOn ? undefined : 'primary'"
        variant="tonal"
        size="small"
        rounded="lg"
        block
        class="text-none"
        :disabled="isUnavailable || busy"
        @click="toggle"
      >
        {{ isOn ? t('fan.turn_off') : t('fan.turn_on') }}
      </v-btn>

      <!-- Speed chips (percentage) -->
      <div v-if="isOn && showSpeedControl && !hasPresets" class="d-flex ga-1 flex-wrap">
        <v-chip
          v-for="pct in speedSteps"
          :key="pct"
          size="x-small"
          rounded="pill"
          :variant="percentage === pct ? 'flat' : 'tonal'"
          :color="percentage === pct ? 'primary' : undefined"
          class="flex-grow-1 justify-center"
          style="cursor:pointer"
          @click="setPercentage(pct)"
        >
          {{ pct }}%
        </v-chip>
      </div>

      <!-- Preset chips -->
      <div v-if="isOn && hasPresets" class="d-flex ga-1 flex-wrap">
        <v-chip
          v-for="preset in presetModes"
          :key="preset"
          size="x-small"
          rounded="pill"
          :variant="currentPreset === preset ? 'flat' : 'tonal'"
          :color="currentPreset === preset ? 'primary' : undefined"
          class="flex-shrink-0"
          style="cursor:pointer"
          @click="setPreset(preset)"
        >
          {{ preset }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FanWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: FanWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string | undefined) ?? props.config.entity_id)
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const isOn = computed(() => entity.value?.state === 'on')
const percentage = computed(() => {
  const raw = entity.value?.attributes?.percentage
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})
const currentPreset = computed(() => entity.value?.attributes?.preset_mode as string | null ?? null)
const presetModes = computed(() => {
  const raw = entity.value?.attributes?.preset_modes
  if (!Array.isArray(raw)) return []
  return raw as string[]
})
const hasPresets = computed(() => presetModes.value.length > 0)
const showSpeedControl = computed(() => props.config.show_speed !== false && percentage.value !== null)

const speedSteps = [25, 50, 75, 100]

const speedLabel = computed(() => {
  if (currentPreset.value) return currentPreset.value
  if (percentage.value !== null) return `${percentage.value}%`
  return null
})

const busy = ref(false)

async function toggle() {
  if (busy.value || isUnavailable.value) return
  busy.value = true
  try {
    await client.callService({ domain: 'fan', service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.config.entity_id } })
  } finally {
    window.setTimeout(() => { busy.value = false }, 500)
  }
}

async function setPercentage(pct: number) {
  if (busy.value) return
  busy.value = true
  try {
    await client.callService({ domain: 'fan', service: 'set_percentage', target: { entity_id: props.config.entity_id }, service_data: { percentage: pct } })
  } finally {
    window.setTimeout(() => { busy.value = false }, 500)
  }
}

async function setPreset(preset: string) {
  if (busy.value) return
  busy.value = true
  try {
    await client.callService({ domain: 'fan', service: 'set_preset_mode', target: { entity_id: props.config.entity_id }, service_data: { preset_mode: preset } })
  } finally {
    window.setTimeout(() => { busy.value = false }, 500)
  }
}
</script>

<style scoped>
.fan-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.fan-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
  border-radius: inherit;
}

.fan-card--on .fan-ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(var(--v-theme-primary), 0.09) 0%, transparent 70%);
}

.fan-header,
.fan-card > .d-flex {
  position: relative;
  z-index: 1;
}

.fan-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.fan-icon-wrap {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
  transition: background 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  z-index: 1;
}

.fan-icon-wrap--on {
  background: rgba(var(--v-theme-primary), 0.12);
  box-shadow: 0 0 0 6px rgba(var(--v-theme-primary), 0.06);
}

@keyframes fan-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.fan-spin {
  animation: fan-spin 2s linear infinite;
}

.fan-spin-lg {
  animation: fan-spin 2s linear infinite;
}
</style>
