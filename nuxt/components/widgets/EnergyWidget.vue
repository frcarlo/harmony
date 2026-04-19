<template>
  <div class="h-100 d-flex flex-column pa-3">
    <div class="d-flex align-center ga-2 mb-3">
      <v-icon icon="mdi-lightning-bolt" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis">{{ title }}</span>
    </div>

    <div class="flex-grow-1 d-flex flex-column justify-center ga-3">
      <!-- Grid -->
      <div v-if="grid" class="energy-row">
        <v-icon :icon="grid.importing ? 'mdi-transmission-tower-import' : 'mdi-transmission-tower-export'"
          :color="grid.importing ? 'warning' : 'success'" size="22" />
        <div class="flex-grow-1">
          <div class="text-caption text-medium-emphasis">{{ t('energy.grid') }}</div>
          <div class="text-body-1 font-weight-bold">{{ grid.display }}</div>
        </div>
        <v-chip size="x-small" :color="grid.importing ? 'warning' : 'success'" variant="tonal">
          {{ grid.importing ? t('energy.importing') : t('energy.exporting') }}
        </v-chip>
      </div>

      <!-- Solar -->
      <div v-if="solar" class="energy-row">
        <v-icon icon="mdi-solar-panel" color="amber" size="22" />
        <div class="flex-grow-1">
          <div class="text-caption text-medium-emphasis">{{ t('energy.solar') }}</div>
          <div class="text-body-1 font-weight-bold">{{ solar.display }}</div>
        </div>
      </div>

      <!-- Battery -->
      <div v-if="battery" class="energy-row">
        <v-icon :icon="batteryIcon" :color="batteryColor" size="22" />
        <div class="flex-grow-1">
          <div class="text-caption text-medium-emphasis">{{ t('energy.battery') }}</div>
          <div class="text-body-1 font-weight-bold">{{ battery.display }}</div>
        </div>
      </div>

      <div v-if="!grid && !solar && !battery" class="text-center text-medium-emphasis text-body-2 py-4">
        {{ t('common.unavailable') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EnergyWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: EnergyWidgetConfig }>()
const { t } = useI18n()
const entityStore = useEntityStore()

const title = computed(() => props.config.name || t('widget.energy.label'))

function formatPower(state: string | undefined): { display: string; value: number } | null {
  if (!state || state === 'unavailable' || state === 'unknown') return null
  const val = parseFloat(state)
  if (isNaN(val)) return null
  const abs = Math.abs(val)
  const display = abs >= 1000 ? `${(abs / 1000).toFixed(2)} kW` : `${abs.toFixed(0)} W`
  return { display, value: val }
}

const grid = computed(() => {
  const e = entityStore.entities[props.config.grid_entity_id ?? '']
  const p = formatPower(e?.state)
  if (!p) return null
  return { ...p, importing: p.value >= 0 }
})

const solar = computed(() => {
  const e = entityStore.entities[props.config.solar_entity_id ?? '']
  return formatPower(e?.state)
})

const battery = computed(() => {
  const e = entityStore.entities[props.config.battery_entity_id ?? '']
  return formatPower(e?.state)
})

const batteryIcon = computed(() => {
  const v = battery.value?.value ?? 0
  if (v > 0) return 'mdi-battery-charging'
  if (v < -80) return 'mdi-battery-high'
  if (v < -40) return 'mdi-battery-medium'
  return 'mdi-battery-low'
})

const batteryColor = computed(() => {
  const v = battery.value?.value ?? 0
  return v > 0 ? 'success' : 'info'
})
</script>

<style scoped>
.energy-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: rgb(var(--v-theme-surface-variant) / 0.35);
  border-radius: 10px;
}
</style>
