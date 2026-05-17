<template>
  <div class="h-100 d-flex flex-column pa-3 ga-3 select-card" :class="{ 'select-card--pending': isPending }">
    <!-- Header -->
    <div class="d-flex align-center ga-2 select-card__header">
      <v-icon :icon="iconName" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="select-card__name">{{ name }}</span>
      <span class="select-card__state">{{ stateLabel }}</span>
    </div>

    <div class="d-flex justify-center align-center flex-grow-1">
      <v-select
        :model-value="selectedOption"
        :items="options"
        class="select-card__select"
        density="compact"
        hide-details
        variant="solo-filled"
        rounded="lg"
        :disabled="isUnavailable || isPending || options.length === 0"
        @click.stop
        @mousedown.stop
        @update:model-value="setOption"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SelectWidgetConfig } from '~/types/dashboard'

const { glass } = useGlassEffect()
const props = defineProps<{ config: SelectWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const isPending = ref(false)

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const iconName = computed(() => props.config.icon || 'mdi-form-dropdown')
const state = computed(() => entity.value?.state ?? '')
const options = computed(() => {
  const raw = entity.value?.attributes?.options
  return Array.isArray(raw) ? raw.map(String) : []
})
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable' || state.value === 'unknown')
const selectedOption = computed(() => options.value.includes(state.value) ? state.value : null)
const stateLabel = computed(() => selectedOption.value ?? '—')

async function setOption(option: string | null) {
  if (!option || option === state.value || isUnavailable.value || isPending.value) return
  isPending.value = true
  try {
    await client.callService({
      domain: 'select',
      service: 'select_option',
      target: { entity_id: props.config.entity_id },
      service_data: { option },
    })
  } finally {
    window.setTimeout(() => {
      isPending.value = false
    }, 500)
  }
}
</script>

<style scoped>
.select-card {
  position: relative;
  justify-content: flex-start;
}
.select-card__header { flex-shrink: 0; }
.select-card__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}
.select-card__state {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
  opacity: 0.7;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 50%;
}

.select-card__select {
  min-width: 0;
  width: auto;
  flex-grow: 0;
}

.select-card--pending .select-card__icon-wrap {
  animation: select-card-pulse 0.7s ease-in-out infinite;
}

@keyframes select-card-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
