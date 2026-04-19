<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'widget-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-2">
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <!-- Current temp & humidity -->
      <div class="d-flex px-4 pb-1 ga-8 justify-space-between">
        <div v-if="currentTemp !== undefined">
          <div class="text-caption text-medium-emphasis">{{ t('climate_detail.current_temp') }}</div>
          <div class="text-body-1 font-weight-bold">{{ currentTemp.toFixed(1) }} °C</div>
        </div>
        <div v-if="humidity !== undefined">
          <div class="text-caption text-medium-emphasis">{{ t('climate_detail.humidity') }}</div>
          <div class="text-body-1 font-weight-bold">{{ humidity.toFixed(1) }} %</div>
        </div>
      </div>

      <!-- Circular dial -->
      <div class="d-flex flex-column align-center pt-2">
        <div style="position: relative; width: 220px; height: 200px;">
          <svg viewBox="0 0 220 200" width="220" height="200" style="display: block;">
            <!-- Background arc -->
            <path :d="bgArcPath" fill="none" stroke="rgba(128,128,128,0.22)" stroke-width="10" stroke-linecap="round" />
            <!-- Filled arc -->
            <path v-if="fillArcPath" :d="fillArcPath" fill="none" :stroke="arcColor" stroke-width="10"
              stroke-linecap="round" />
            <!-- Indicator dot -->
            <circle :cx="indicatorPt.x" :cy="indicatorPt.y" r="9" :fill="arcColor" />
          </svg>
          <!-- Center overlay: action label + target temp -->
          <div class="position-absolute d-flex flex-column align-center justify-center"
            style="inset: 0; padding-bottom: 24px; pointer-events: none;">
            <span class="text-caption text-medium-emphasis">{{ actionLabel }}</span>
            <div class="d-flex align-start mt-1" style="line-height: 1">
              <span class="font-weight-bold" style="font-size: 2.6rem; line-height: 1">{{ targetTempInt }}</span>
              <div class="d-flex flex-column align-start ml-1">
                <span class="text-body-2 text-medium-emphasis" style="line-height: 1.2">°C</span>
                <span class="text-caption text-medium-emphasis" style="line-height: 1">,{{ targetTempFrac }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- +/- buttons -->
        <div class="d-flex ga-4 pb-3 mt-n2">
          <v-btn icon="mdi-minus" variant="outlined" size="default" :disabled="isUnavailable"
            @click="adjustTemp(-0.5)" />
          <v-btn icon="mdi-plus" variant="outlined" size="default" :disabled="isUnavailable" @click="adjustTemp(0.5)" />
        </div>
      </div>

      <!-- HVAC mode toggle -->
      <div v-if="hvacModes.length > 0" class="px-3 pb-2">
        <div class="text-caption text-medium-emphasis mb-2">{{ t('climate_detail.mode') }}</div>
        <v-btn-toggle
          :model-value="hvacMode"
          mandatory
          density="compact"
          color="primary"
          class="w-100"
          style="flex-wrap: wrap; height: auto;"
          @update:model-value="setHvacMode"
        >
          <v-btn
            v-for="mode in hvacModes" :key="mode"
            :value="mode"
            size="small"
            class="flex-grow-1"
            style="min-width: 0;"
          >
            <v-icon :icon="HVAC_MODE_ICONS[mode] ?? 'mdi-thermostat'" size="16" start />
            <span class="text-truncate" style="max-width: 72px; font-size: 0.75rem;">{{ modeLabel(mode) }}</span>
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Preset toggle -->
      <div v-if="presetModes.length > 0" class="px-3 pb-4 pt-2">
        <div class="text-caption text-medium-emphasis mb-2">{{ t('climate_detail.preset') }}</div>
        <v-btn-toggle
          :model-value="currentPreset"
          mandatory
          density="compact"
          color="primary"
          class="w-100"
          style="flex-wrap: wrap; height: auto;"
          @update:model-value="setPreset"
        >
          <v-btn
            v-for="preset in presetModes" :key="preset"
            :value="preset"
            size="small"
            class="flex-grow-1"
            style="min-width: 0;"
          >
            <span class="text-truncate" style="max-width: 90px; font-size: 0.75rem;">
              {{ preset === 'none' ? t('climate_detail.preset_none') : preset }}
            </span>
          </v-btn>
        </v-btn-toggle>
      </div>
      <div v-else class="pb-2" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{
  modelValue: boolean
  entityId: string
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.entityId])
const name = computed(() => (entity.value?.attributes?.friendly_name as string) ?? props.entityId)

const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  if (!areaId) return undefined
  return entityStore.areas.find((a) => a.area_id === areaId)?.name
})

const currentTemp = computed(() => entity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => entity.value?.attributes?.temperature as number | undefined)
const humidity = computed(() => entity.value?.attributes?.humidity as number | undefined)
const minTemp = computed(() => (entity.value?.attributes?.min_temp as number) ?? 5)
const maxTemp = computed(() => (entity.value?.attributes?.max_temp as number) ?? 35)
const hvacMode = computed(() => entity.value?.state ?? 'off')
const hvacAction = computed(() => entity.value?.attributes?.hvac_action as string | undefined)
const hvacModes = computed(() => (entity.value?.attributes?.hvac_modes as string[]) ?? [])
const presetModes = computed(() => (entity.value?.attributes?.preset_modes as string[]) ?? [])
const currentPreset = computed(() => entity.value?.attributes?.preset_mode as string | undefined)
const isUnavailable = computed(() => !entity.value || hvacMode.value === 'unavailable')

// Temperature display split into integer and fractional parts
const targetTempInt = computed(() => {
  if (targetTemp.value === undefined) return '–'
  return Math.floor(targetTemp.value).toString()
})
const targetTempFrac = computed(() => {
  if (targetTemp.value === undefined) return '0'
  return ((targetTemp.value % 1) * 10).toFixed(0)
})

const ACTION_LABELS: Record<string, string> = {}
const actionLabel = computed(() => {
  const action = hvacAction.value
  if (action) {
    const key = `climate_detail.action_${action}`
    const translated = t(key)
    return translated !== key ? translated : action
  }
  return modeLabel(hvacMode.value)
})

const HVAC_MODE_LABELS_KEYS: Record<string, string> = {
  heat: 'thermostat.mode_heat',
  cool: 'thermostat.mode_cool',
  auto: 'thermostat.mode_auto',
  off: 'thermostat.mode_off',
  heat_cool: 'climate_detail.mode_heat_cool',
  fan_only: 'climate_detail.mode_fan_only',
  dry: 'climate_detail.mode_dry',
}

const HVAC_MODE_ICONS: Record<string, string> = {
  heat: 'mdi-fire',
  cool: 'mdi-snowflake',
  auto: 'mdi-thermostat-auto',
  heat_cool: 'mdi-thermometer',
  fan_only: 'mdi-fan',
  dry: 'mdi-water-percent',
  off: 'mdi-power',
}

function modeLabel(mode: string): string {
  const key = HVAC_MODE_LABELS_KEYS[mode]
  if (key) {
    const translated = t(key)
    return translated !== key ? translated : mode
  }
  return mode
}


// Arc color based on HVAC mode
const arcColor = computed(() => {
  if (isUnavailable.value) return 'rgba(128,128,128,0.5)'
  if (hvacMode.value === 'heat') return 'rgb(var(--v-theme-warning))'
  if (hvacMode.value === 'cool') return 'rgb(var(--v-theme-info))'
  if (hvacMode.value === 'off') return 'rgba(128,128,128,0.5)'
  return 'rgb(var(--v-theme-primary))'
})

// SVG arc: center (110,100), radius 80
// Arc from 120° to 60° clockwise = 300° sweep
const CX = 110, CY = 100, R = 80
const START_DEG = 120
const SWEEP_DEG = 300

function polar(deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: +(CX + R * Math.cos(rad)).toFixed(3), y: +(CY + R * Math.sin(rad)).toFixed(3) }
}

const startPt = polar(START_DEG)
const endPt = polar(START_DEG + SWEEP_DEG) // = polar(60)

// Full background arc: from start to end clockwise, large-arc=1
const bgArcPath = `M ${startPt.x} ${startPt.y} A ${R} ${R} 0 1 1 ${endPt.x} ${endPt.y}`

const fraction = computed(() => {
  if (targetTemp.value === undefined) return 0
  const clamped = Math.max(minTemp.value, Math.min(maxTemp.value, targetTemp.value))
  return (clamped - minTemp.value) / (maxTemp.value - minTemp.value)
})

const indicatorPt = computed(() => polar(START_DEG + fraction.value * SWEEP_DEG))

const fillArcPath = computed(() => {
  const f = fraction.value
  if (f <= 0.005) return null
  const arcDeg = f * SWEEP_DEG
  const largeArc = arcDeg > 180 ? 1 : 0
  const ep = indicatorPt.value
  return `M ${startPt.x} ${startPt.y} A ${R} ${R} 0 ${largeArc} 1 ${ep.x} ${ep.y}`
})

async function adjustTemp(delta: number) {
  if (isUnavailable.value || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate', service: 'set_temperature',
    target: { entity_id: props.entityId },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}

async function setHvacMode(mode: string | undefined) {
  if (!mode) return
  await client.callService({
    domain: 'climate', service: 'set_hvac_mode',
    target: { entity_id: props.entityId },
    service_data: { hvac_mode: mode },
  })
}

async function setPreset(preset: string | undefined) {
  if (!preset) return
  await client.callService({
    domain: 'climate', service: 'set_preset_mode',
    target: { entity_id: props.entityId },
    service_data: { preset_mode: preset },
  })
}
</script>
