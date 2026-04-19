<template>
  <div class="h-100 d-flex flex-column pa-4 " style="cursor: pointer" @click="dialogOpen = true">
    <div class="d-flex align-center ga-2 mb-2">
      <v-icon icon="mdi-thermometer" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate flex-grow-1">{{ name }}</span>
      <v-icon :icon="modeIcon" :color="modeColor" size="18" :title="modeLabel" />
    </div>
    <div class="flex-grow-1 d-flex align-center justify-center ga-6">
      <div v-if="currentTemp !== undefined" class="text-h4 font-weight-bold">{{ currentTemp.toFixed(1) }}°</div>
      <div v-if="targetTemp !== undefined" class="d-flex align-center ga-3 mt-1">
        <v-btn icon="mdi-minus" size="x-small" variant="tonal" :disabled="isUnavailable" @click.stop="setTemp(-0.5)" />
        <span class="text-body-2 text-medium-emphasis font-weight-medium">{{ targetTemp.toFixed(1) }}°</span>
        <v-btn icon="mdi-plus" size="x-small" variant="tonal" :disabled="isUnavailable" @click.stop="setTemp(0.5)" />
      </div>
    </div>
  </div>

  <ClimateDetailDialog v-model="dialogOpen" :entity-id="props.config.entity_id" />
</template>

<script setup lang="ts">
import type { ThermostatWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const MODE_LABELS = computed(() => ({ heat: t('thermostat.mode_heat'), cool: t('thermostat.mode_cool'), auto: t('thermostat.mode_auto'), off: t('thermostat.mode_off') }))

const props = defineProps<{ config: ThermostatWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const currentTemp = computed(() => entity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => entity.value?.attributes?.temperature as number | undefined)
const hvacMode = computed(() => entity.value?.state ?? 'off')
const isUnavailable = computed(() => !entity.value || hvacMode.value === 'unavailable')
const modeLabel = computed(() => MODE_LABELS.value[hvacMode.value] ?? hvacMode.value)

const MODE_ICONS: Record<string, string> = {
  heat: 'mdi-fire', cool: 'mdi-snowflake', auto: 'mdi-thermostat-auto',
  heat_cool: 'mdi-thermometer', fan_only: 'mdi-fan', dry: 'mdi-water-percent',
  off: 'mdi-power',
}
const MODE_COLORS: Record<string, string> = {
  heat: 'warning', cool: 'info', auto: 'primary',
  heat_cool: 'primary', fan_only: 'primary', dry: 'primary',
  off: 'medium-emphasis',
}
const modeIcon = computed(() => MODE_ICONS[hvacMode.value] ?? 'mdi-thermostat')
const modeColor = computed(() => MODE_COLORS[hvacMode.value] ?? 'medium-emphasis')

const dialogOpen = ref(false)

async function setTemp(delta: number) {
  if (isUnavailable.value || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate', service: 'set_temperature', target: { entity_id: props.config.entity_id },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}
</script>
