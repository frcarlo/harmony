<template>
  <div class="h-100 d-flex flex-column pa-3">
    <div class="d-flex align-center ga-2 mb-2">
      <v-icon icon="mdi-window-shutter" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>
    <div class="flex-grow-1 d-flex flex-column justify-center ga-2">
      <div class="d-flex align-center ga-2 mx-auto">
        <span v-if="position !== undefined" class="text-h6 font-weight-semibold">{{ position }}%</span>
        <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
      </div>
      <div class="d-flex ga-2 mx-auto">
        <v-btn :disabled="isUnavailable || isFullyOpen" variant="tonal" size="small" icon="mdi-chevron-up"
          v-tooltip="{ text: openCoverText, location: 'top' }" @click="callCover('open_cover')"></v-btn>
        <v-btn :disabled="isUnavailable" variant="tonal" size="small" icon="mdi-stop"
          @click="callCover('stop_cover')" />
        <v-btn :disabled="isUnavailable || isFullyClosed" v-tooltip="{ text: closeCoverText, location: 'top' }"
          variant="tonal" size="small" icon="mdi-chevron-down" @click="callCover('close_cover')"></v-btn>
      </div>

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
const isFullyClosed = computed(() => position.value !== undefined ? position.value == 0 : state.value === 'closed')
const stateLabel = computed(() => {
  const labels: Record<string, string> = {
    open: t('cover.open'), opening: t('cover.opening'),
    closed: t('cover.closed'), closing: t('cover.closing'),
    stopped: t('cover.stopped'),
  }
  return labels[state.value] ?? state.value
})
const closeCoverText = computed(() => {
  return t('common.close_cover')
})
const openCoverText = computed(() => {
  return t('common.open')
})

async function callCover(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'cover', service, target: { entity_id: props.config.entity_id } })
}
</script>
