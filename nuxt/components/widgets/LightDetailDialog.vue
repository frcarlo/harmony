<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'dialog-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-3">
        <v-icon :icon="isOn ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'" color="warning" class="mr-2" />
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <!-- On/Off toggle -->
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 font-weight-medium">{{ isOn ? t('common.on') : t('common.off') }}</span>
          <v-switch :model-value="isOn" color="warning" hide-details density="compact"
            :disabled="isUnavailable" @update:model-value="toggle" />
        </div>

        <!-- Brightness -->
        <div v-if="supportsBrightness" class="mb-3">
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis">{{ t('detail.brightness') }}</span>
            <span class="text-caption font-weight-medium">{{ brightnessSliderValue }}%</span>
          </div>
          <v-slider :model-value="brightnessSliderValue" min="1" max="100" color="warning" hide-details
            density="compact" :disabled="isUnavailable" @end="setBrightness" />
        </div>

        <!-- Color temperature -->
        <div v-if="supportsColorTemp && minKelvin && maxKelvin" class="mb-3">
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis">{{ t('detail.color_temp') }}</span>
            <span class="text-caption font-weight-medium">{{ colorTempSliderValue }} K</span>
          </div>
          <v-slider :model-value="colorTempSliderValue" :min="minKelvin" :max="maxKelvin" color="warning"
            hide-details density="compact" :disabled="isUnavailable" @end="setColorTemp" />
        </div>

        <!-- Color -->
        <div v-if="supportsColor" class="mb-3">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-caption text-medium-emphasis">{{ t('detail.color') }}</span>
            <div class="d-flex align-center ga-2">
              <span class="text-caption font-weight-medium">{{ currentColorLabel }}</span>
              <span class="light-detail__color-dot" :style="{ backgroundColor: pickerColor }" />
            </div>
          </div>
          <v-color-picker
            :model-value="pickerColor"
            mode="hex"
            hide-inputs
            show-swatches
            rounded="lg"
            elevation="0"
            canvas-height="120"
            swatches-max-height="72"
            class="light-detail__picker"
            @update:model-value="queueColorUpdate"
          />
        </div>

        <!-- Effects -->
        <div v-if="effectList.length" class="mb-3">
          <div class="d-flex justify-space-between mb-2">
            <span class="text-caption text-medium-emphasis">{{ t('detail.effect') }}</span>
            <span class="text-caption font-weight-medium">{{ currentEffectLabel }}</span>
          </div>
          <v-select
            :model-value="currentEffect"
            :items="effectList"
            density="compact"
            variant="underlined"
            hide-details
            clearable
            :placeholder="t('detail.effect')"
            class="light-detail__effect-select"
            @update:model-value="onEffectChange"
          />
        </div>

        <!-- History -->
        <StateHistoryBar :entity-id="props.entityId" :hours="12" active-color="rgb(var(--v-theme-warning))" class="mb-3" />

        <!-- Attributes -->
        <v-divider v-if="relevantAttributes.length > 0" class="mb-2" />
        <div v-for="[key, val] in relevantAttributes" :key="key"
          class="d-flex justify-space-between align-center py-1 ga-4">
          <span class="text-caption text-medium-emphasis text-capitalize">{{ key }}</span>
          <span class="text-caption font-weight-medium text-right" style="max-width: 55%">{{ val }}</span>
        </div>

        <v-divider class="mt-2 mb-2" />
        <div class="d-flex justify-space-between">
          <span class="text-caption text-medium-emphasis">{{ t('common.last_updated') }}</span>
          <span class="text-caption text-medium-emphasis">{{ lastUpdated }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{ modelValue: boolean; entityId: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.entityId])
const name = computed(() => (entity.value?.attributes?.friendly_name as string) ?? props.entityId)
const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  return areaId ? entityStore.areas.find((a) => a.area_id === areaId)?.name : undefined
})
const isOn = computed(() => entity.value?.state === 'on')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const supportedColorModes = computed<string[]>(() => {
  const modes = entity.value?.attributes?.supported_color_modes
  return Array.isArray(modes) ? modes.map((mode) => String(mode)) : []
})
const activeColorMode = computed(() => String(entity.value?.attributes?.color_mode ?? ''))
const supportsBrightness = computed(() => (
  brightnessPct.value !== undefined
  || supportedColorModes.value.some((mode) => ['brightness', 'color_temp', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(mode))
))
const supportsColorTemp = computed(() => (
  colorTempKelvin.value !== undefined
  || supportedColorModes.value.includes('color_temp')
))
const supportsColor = computed(() => (
  supportedColorModes.value.some((mode) => ['hs', 'xy', 'rgb', 'rgbw', 'rgbww'].includes(mode))
  || !!entity.value?.attributes?.rgb_color
  || !!entity.value?.attributes?.hs_color
))

const brightnessPct = computed(() => {
  const b = entity.value?.attributes?.brightness as number | undefined
  return b !== undefined ? Math.round((b / 255) * 100) : undefined
})
const brightnessSliderValue = computed(() => brightnessPct.value ?? 100)
const colorTempKelvin = computed(() => entity.value?.attributes?.color_temp_kelvin as number | undefined)
const minKelvin = computed(() => entity.value?.attributes?.min_color_temp_kelvin as number | undefined)
const maxKelvin = computed(() => entity.value?.attributes?.max_color_temp_kelvin as number | undefined)
const colorTempSliderValue = computed(() => {
  if (colorTempKelvin.value !== undefined) return colorTempKelvin.value
  if (minKelvin.value && maxKelvin.value) return Math.round((minKelvin.value + maxKelvin.value) / 2)
  return 4000
})
const effectList = computed<string[]>(() => {
  const effects = entity.value?.attributes?.effect_list
  return Array.isArray(effects) ? effects.map((effect) => String(effect)) : []
})
const currentEffect = computed(() => {
  const effect = entity.value?.attributes?.effect
  return typeof effect === 'string' && effect.trim() ? effect : null
})

const pickerColor = ref('#ffffff')
let colorUpdateTimer: ReturnType<typeof setTimeout> | null = null

const IGNORED = new Set(['friendly_name', 'icon', 'entity_picture', 'effect_list', 'supported_features',
  'supported_color_modes', 'brightness', 'color_temp_kelvin', 'min_color_temp_kelvin',
  'max_color_temp_kelvin', 'color_mode', 'hs_color', 'rgb_color', 'xy_color', 'effect'])

const relevantAttributes = computed(() =>
  Object.entries(entity.value?.attributes ?? {})
    .filter(([k]) => !IGNORED.has(k))
    .slice(0, 6)
    .map(([k, v]) => [k.replace(/_/g, ' '), formatVal(v)])
)

const lastUpdated = computed(() => {
  const ts = entity.value?.last_updated
  if (!ts) return '–'
  return new Date(ts).toLocaleString(locale.value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})

const currentColorHex = computed(() => {
  const rgb = entity.value?.attributes?.rgb_color as number[] | undefined
  if (Array.isArray(rgb) && rgb.length >= 3) return rgbToHex(rgb[0], rgb[1], rgb[2])
  const hs = entity.value?.attributes?.hs_color as number[] | undefined
  if (Array.isArray(hs) && hs.length >= 2) return hsToHex(hs[0], hs[1])
  if (activeColorMode.value === 'color_temp') return '#f6ead3'
  return '#ffffff'
})

const currentColorLabel = computed(() => {
  if (activeColorMode.value === 'color_temp' && colorTempKelvin.value) return `${colorTempKelvin.value} K`
  return pickerColor.value.toUpperCase()
})

const currentEffectLabel = computed(() => currentEffect.value || '—')

watch(currentColorHex, (value) => {
  pickerColor.value = value
}, { immediate: true })

onUnmounted(() => {
  if (colorUpdateTimer) clearTimeout(colorUpdateTimer)
})

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (Array.isArray(v)) { const p = v.slice(0, 3).join(', '); return v.length > 3 ? `${p} +${v.length - 3}` : p }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1)
  if (typeof v === 'boolean') return v ? t('common.on') : t('common.off')
  const s = String(v); return s.length > 40 ? s.slice(0, 38) + '…' : s
}

async function toggle() {
  if (isUnavailable.value) return
  await client.callService({ domain: 'light', service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.entityId } })
}
async function setBrightness(pct: number) {
  await client.callService({ domain: 'light', service: 'turn_on', target: { entity_id: props.entityId }, service_data: { brightness_pct: pct } })
}
async function setColorTemp(kelvin: number) {
  await client.callService({ domain: 'light', service: 'turn_on', target: { entity_id: props.entityId }, service_data: { color_temp_kelvin: kelvin } })
}
function normalizePickerColor(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('#') ? trimmed : null
  }
  if (value && typeof value === 'object' && 'hex' in value) {
    const hex = String((value as { hex?: string }).hex ?? '').trim()
    return hex.startsWith('#') ? hex : null
  }
  return null
}

function queueColorUpdate(value: unknown) {
  const hex = normalizePickerColor(value)
  if (!hex) return
  pickerColor.value = hex
  if (colorUpdateTimer) clearTimeout(colorUpdateTimer)
  colorUpdateTimer = setTimeout(() => {
    void setColor(hex)
  }, 120)
}

async function setColor(hex: string) {
  await client.callService({
    domain: 'light',
    service: 'turn_on',
    target: { entity_id: props.entityId },
    service_data: { rgb_color: hexToRgb(hex) },
  })
}

async function setEffect(effect: string) {
  await client.callService({
    domain: 'light',
    service: 'turn_on',
    target: { entity_id: props.entityId },
    service_data: { effect },
  })
}

function onEffectChange(value: string | null) {
  if (!value) return
  void setEffect(value)
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')).join('')}`
}

function hexToRgb(hex: string) {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((char) => char + char).join('') : raw
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function hsToHex(hue: number, saturation: number) {
  const s = Math.max(0, Math.min(100, saturation)) / 100
  const v = 1
  const c = v * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = v - c
  let r = 0
  let g = 0
  let b = 0

  if (hue < 60) [r, g, b] = [c, x, 0]
  else if (hue < 120) [r, g, b] = [x, c, 0]
  else if (hue < 180) [r, g, b] = [0, c, x]
  else if (hue < 240) [r, g, b] = [0, x, c]
  else if (hue < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]

  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
</script>

<style scoped>
.light-detail__picker {
  border-radius: 16px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.light-detail__color-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  box-shadow: 0 0 0 2px rgba(var(--v-theme-surface), 0.65);
}

.light-detail__effect-select :deep(.v-field) {
  font-size: 0.9rem;
}

.light-detail__effect-select :deep(.v-field__input) {
  min-height: 34px;
  padding-top: 4px;
  padding-bottom: 4px;
}
</style>
