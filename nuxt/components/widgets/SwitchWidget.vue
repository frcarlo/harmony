<template>
  <div class="h-100 d-flex flex-column pa-4">
    <div class="d-flex align-center ga-2 mb-2">
      <v-icon icon="mdi-toggle-switch" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>
    <div class="flex-grow-1 d-flex align-center justify-space-between">
      <span class="text-h6 font-weight-semibold" :class="isOn ? 'text-on-surface' : 'text-medium-emphasis'">
        {{ isUnavailable ? 'N/A' : isOn ? t('common.on') : t('common.off') }}
      </span>
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
