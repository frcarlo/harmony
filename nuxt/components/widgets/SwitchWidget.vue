<template>
  <div class="h-100 d-flex flex-column pa-3 ga-3">
    <div class="d-flex align-center ga-3 flex-grow-1 overflow-hidden">
      <v-icon :icon="isOn ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off'"
        size="36" :color="isOn ? 'success' : 'medium-emphasis'" class="flex-shrink-0" />
      <div class="overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="text-caption" :class="isOn ? 'text-success' : 'text-medium-emphasis'">
          {{ isUnavailable ? 'N/A' : isOn ? t('common.on') : t('common.off') }}
        </div>
      </div>
    </div>
    <div class="d-flex">
      <UiSwitch :checked="isOn" :disabled="isUnavailable" @change="toggle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SwitchWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()

const props = defineProps<{ config: SwitchWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const isOn = computed(() => entity.value?.state === 'on')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')

async function toggle() {
  if (isUnavailable.value) return
  const domain = props.config.entity_id.split('.')[0]
  await client.callService({ domain, service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.config.entity_id } })
}
</script>
