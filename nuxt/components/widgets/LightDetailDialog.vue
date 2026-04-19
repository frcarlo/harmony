<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'widget-glass': glass }">
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
        <div v-if="isOn && brightnessPct !== undefined" class="mb-3">
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis">{{ t('detail.brightness') }}</span>
            <span class="text-caption font-weight-medium">{{ brightnessPct }}%</span>
          </div>
          <v-slider :model-value="brightnessPct" min="1" max="100" color="warning" hide-details
            density="compact" @end="setBrightness" />
        </div>

        <!-- Color temperature -->
        <div v-if="isOn && colorTempKelvin !== undefined && minKelvin && maxKelvin" class="mb-3">
          <div class="d-flex justify-space-between mb-1">
            <span class="text-caption text-medium-emphasis">{{ t('detail.color_temp') }}</span>
            <span class="text-caption font-weight-medium">{{ colorTempKelvin }} K</span>
          </div>
          <v-slider :model-value="colorTempKelvin" :min="minKelvin" :max="maxKelvin" color="warning"
            hide-details density="compact" @end="setColorTemp" />
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

const brightnessPct = computed(() => {
  const b = entity.value?.attributes?.brightness as number | undefined
  return b !== undefined ? Math.round((b / 255) * 100) : undefined
})
const colorTempKelvin = computed(() => entity.value?.attributes?.color_temp_kelvin as number | undefined)
const minKelvin = computed(() => entity.value?.attributes?.min_color_temp_kelvin as number | undefined)
const maxKelvin = computed(() => entity.value?.attributes?.max_color_temp_kelvin as number | undefined)

const IGNORED = new Set(['friendly_name', 'icon', 'entity_picture', 'effect_list', 'supported_features',
  'supported_color_modes', 'brightness', 'color_temp_kelvin', 'min_color_temp_kelvin',
  'max_color_temp_kelvin', 'color_mode', 'hs_color', 'rgb_color', 'xy_color'])

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
</script>
