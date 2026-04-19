<template>
  <div class="h-100 d-flex flex-column pa-3">
    <!-- Name -->
    <div class="d-flex align-center ga-1 mb-1">
      <v-icon icon="mdi-window-shutter" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>

    <div class="flex-grow-1 d-flex align-center justify-center ga-4">
      <!-- State label -->
      <span class="text-medium-emphasis text-display-medium">{{ stateLabel }}</span>
      <!-- Circular dial -->
      <v-progress-circular :model-value="position ?? 0" :color="isUnavailable ? undefined : 'info'" size="120"
        bg-color="surface" width="9" :style="dialStyle">
        <div class="d-flex flex-column align-center" style="gap: 2px">
          <v-btn icon="mdi-chevron-up" size="x-small" variant="text" :disabled="isUnavailable || isFullyOpen"
            @click="callCover('open_cover')" />
          <div class="d-flex align-center ga-1">
            <span class="text-caption font-weight-bold tabular-nums">
              {{ position !== undefined ? position + '%' : '–' }}
            </span>
            <v-btn icon="mdi-stop" size="x-small" variant="text" :disabled="isUnavailable"
              @click="callCover('stop_cover')" />
          </div>
          <v-btn icon="mdi-chevron-down" size="x-small" variant="text" :disabled="isUnavailable || isFullyClosed"
            @click="callCover('close_cover')" />
        </div>
      </v-progress-circular>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CoverWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: CoverWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? 'unknown')
const position = computed(() => entity.value?.attributes?.current_position as number | undefined)
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable')
const isFullyOpen = computed(() => position.value !== undefined ? position.value >= 100 : state.value === 'open')
const isFullyClosed = computed(() => position.value !== undefined ? position.value <= 0 : state.value === 'closed')

const stateLabel = computed(() => {
  const labels: Record<string, string> = {
    open: t('cover.open'), opening: t('cover.opening'),
    closed: t('cover.closed'), closing: t('cover.closing'),
    stopped: t('cover.stopped'),
  }
  return labels[state.value] ?? state.value
})

const dialStyle = computed(() => ({
  ...(props.config.dial_color ? { '--dial-color': props.config.dial_color } : {}),
  ...(props.config.dial_bg_color ? { '--dial-bg-color': props.config.dial_bg_color } : {}),
}))

async function callCover(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'cover', service, target: { entity_id: props.config.entity_id } })
}
</script>

<style scoped>
:deep(.v-progress-circular__overlay) {
  stroke: var(--dial-color, currentColor);
}
:deep(.v-progress-circular__underlay) {
  stroke: var(--dial-bg-color, currentColor);
}
</style>
