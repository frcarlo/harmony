<template>
  <div class="h-100 d-flex flex-column pa-3 ga-3">
    <div class="d-flex align-center ga-3 flex-grow-1 overflow-hidden">
      <v-icon icon="mdi-lightbulb"
        size="36" :color="isOn ? 'warning' : 'medium-emphasis'" class="flex-shrink-0" />
      <div class="overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="text-caption" :class="isOn ? 'text-warning' : 'text-medium-emphasis'">
          {{ isUnavailable ? 'N/A' : isOn ? (showBrightness ? `${brightnessPercent}%` : t('common.on')) : t('common.off') }}
        </div>
      </div>
    </div>
    <div class="d-flex align-center ga-2">
      <UiSwitch :checked="isOn" :disabled="isUnavailable" @change="toggle" />
      <v-slider v-if="showBrightness" :model-value="brightnessPercent"
        min="1" max="100" color="warning" hide-details class="flex-grow-1"
        @end="setBrightness" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LightWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: LightWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const isOn = computed(() => entity.value?.state === 'on')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const brightness = computed(() => entity.value?.attributes?.brightness as number | undefined)
const brightnessPercent = computed(() => brightness.value !== undefined ? Math.round((brightness.value / 255) * 100) : 0)
const showBrightness = computed(() => props.config.show_brightness !== false && isOn.value && brightness.value !== undefined)

async function toggle() {
  if (isUnavailable.value) return
  await client.callService({ domain: 'light', service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.config.entity_id } })
}
async function setBrightness(pct: number) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'light', service: 'turn_on', target: { entity_id: props.config.entity_id }, service_data: { brightness_pct: pct } })
}
</script>
