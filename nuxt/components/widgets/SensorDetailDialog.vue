<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'dialog-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-2">
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <!-- Current value -->
      <div class="d-flex align-end ga-1 px-4 pb-4">
        <span class="font-weight-bold" :style="{ fontSize: '3rem', lineHeight: 1, color: stateColor }">
          {{ displayState }}
        </span>
        <span v-if="unit" class="text-body-1 text-medium-emphasis pb-1">{{ unit }}</span>
      </div>

      <v-divider />

      <!-- History -->
      <div class="px-4 pt-3">
        <StateHistoryBar :entity-id="props.config.entity_id" :hours="12" />
      </div>

      <!-- Attributes -->
      <div class="px-4 py-3">
        <div v-for="[key, val] in relevantAttributes" :key="key"
          class="d-flex justify-space-between align-center py-1 ga-4">
          <span class="text-caption text-medium-emphasis text-capitalize">{{ key }}</span>
          <span class="text-caption font-weight-medium text-right" style="max-width: 55%">{{ val }}</span>
        </div>

        <v-divider v-if="relevantAttributes.length > 0" class="mt-2 mb-2" />

        <div class="d-flex justify-space-between">
          <span class="text-caption text-medium-emphasis">{{ t('common.last_updated') }}</span>
          <span class="text-caption text-medium-emphasis">{{ lastUpdated }}</span>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { SensorWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{
  modelValue: boolean
  config: SensorWidgetConfig
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)

const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.config.entity_id]
  if (!areaId) return undefined
  return entityStore.areas.find((a) => a.area_id === areaId)?.name
})

const state = computed(() => entity.value?.state ?? '—')
const unit = computed(() => props.config.unit ?? (entity.value?.attributes?.unit_of_measurement as string) ?? '')

const displayState = computed(() => {
  const num = parseFloat(state.value)
  if (!isNaN(num) && props.config.decimal_places !== undefined) return num.toFixed(props.config.decimal_places)
  return state.value
})

const stateColor = computed(() => {
  if (!entity.value) return undefined
  const val = parseFloat(state.value)
  if (isNaN(val)) return undefined
  if (props.config.alert_above !== undefined && val > props.config.alert_above) return 'rgb(var(--v-theme-error))'
  if (props.config.alert_below !== undefined && val < props.config.alert_below) return 'rgb(var(--v-theme-info))'
  return undefined
})

const IGNORED_ATTRS = new Set(['friendly_name', 'icon', 'entity_picture', 'unit_of_measurement', 'supported_features'])

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (Array.isArray(v)) {
    if (v.length === 0) return '–'
    const preview = v.slice(0, 3).join(', ')
    return v.length > 3 ? `${preview} +${v.length - 3}` : preview
  }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2)
  if (typeof v === 'boolean') return v ? t('common.on') : t('common.off')
  const s = String(v)
  return s.length > 40 ? s.slice(0, 38) + '…' : s
}

const relevantAttributes = computed(() =>
  Object.entries(entity.value?.attributes ?? {})
    .filter(([k]) => !IGNORED_ATTRS.has(k))
    .slice(0, 10)
    .map(([k, v]) => [k.replace(/_/g, ' '), formatVal(v)])
)

const lastUpdated = computed(() => {
  const ts = entity.value?.last_updated
  if (!ts) return '–'
  return new Date(ts).toLocaleString(locale.value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})
</script>
