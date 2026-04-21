<template>
  <div class="h-100 d-flex flex-column pa-3 ga-2" style="cursor:pointer" @click="dialogOpen = true">
    <div class="d-flex align-center ga-2 flex-shrink-0">
      <v-icon icon="mdi-pulse" size="32"
        :color="alertColor ?? 'medium-emphasis'" class="flex-shrink-0" />
      <span class="text-body-2 font-weight-medium text-truncate">{{ name }}</span>
    </div>
    <div class="flex-grow-1 d-flex align-end">
      <span v-if="isUnavailable" class="text-medium-emphasis text-body-2">N/A</span>
      <div v-else class="d-flex align-end ga-1">
        <span class="font-weight-bold" :style="{ fontSize: 'clamp(1.2rem,4vw,2.2rem)', color: stateColor }">{{ displayState }}</span>
        <span v-if="unit" class="text-body-2 text-medium-emphasis pb-1">{{ unit }}</span>
      </div>
    </div>
    <div v-if="entity?.last_updated" class="text-caption flex-shrink-0" style="opacity:0.4">{{ formatTime(entity.last_updated) }}</div>
  </div>

  <SensorDetailDialog v-model="dialogOpen" :config="props.config" />
</template>

<script setup lang="ts">
import type { SensorWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: SensorWidgetConfig }>()
const dialogOpen = ref(false)
const entityStore = useEntityStore()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? '—')
const unit = computed(() => props.config.unit ?? (entity.value?.attributes?.unit_of_measurement as string) ?? '')
const isUnavailable = computed(() => state.value === 'unavailable' || state.value === 'unknown')

const displayState = computed(() => {
  const num = parseFloat(state.value)
  if (!isNaN(num) && props.config.decimal_places !== undefined) return num.toFixed(props.config.decimal_places)
  return state.value
})

const alertColor = computed(() => {
  const val = parseFloat(state.value)
  if (isNaN(val)) return undefined
  if (props.config.alert_above !== undefined && val > props.config.alert_above) return 'rgb(var(--v-theme-error))'
  if (props.config.alert_below !== undefined && val < props.config.alert_below) return 'rgb(var(--v-theme-info))'
  return undefined
})

const stateColor = computed(() => {
  if (!entity.value) return undefined
  return alertColor.value
})

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
</script>
