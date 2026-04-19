<template>
  <div class="h-100 d-flex flex-column pa-4">
    <div class="d-flex align-center ga-2 mb-2">
      <v-icon icon="mdi-lightbulb" size="14" :color="isOn ? 'warning' : 'medium-emphasis'" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-h6 font-weight-semibold" :class="isOn ? 'text-on-surface' : 'text-medium-emphasis'">
        {{ isUnavailable ? 'N/A' : isOn ? (showBrightness ? `${brightnessPercent}%` : 'An') : 'Aus' }}
      </span>
      <UiSwitch :checked="isOn" :disabled="isUnavailable" @change="toggle" />
    </div>

    <div v-if="showBrightness" class="mt-auto">
      <v-slider :model-value="brightnessPercent" min="1" max="100" color="warning" hide-details glow
        @end="setBrightness" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LightWidgetConfig } from '~/types/dashboard'

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
