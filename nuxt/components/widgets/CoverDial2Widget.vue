<template>
  <div class="h-100 d-flex flex-column pa-3"
    style="cursor: pointer" @click="dialogOpen = true">
    <!-- Name -->
    <div class="d-flex align-center ga-1 mb-1">
      <v-icon icon="mdi-window-shutter" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>

    <div class="flex-grow-1 d-flex align-center justify-center" :class="containerClass">
      <div :class="buttonsClass" style="gap: 2px">
        <v-btn icon="mdi-chevron-up" :size="btnSize" variant="text" :disabled="isUnavailable || isFullyOpen"
          @click.stop="callCover('open_cover')" />
        <v-btn icon="mdi-stop" :size="btnSize" variant="text" :disabled="isUnavailable"
          @click.stop="callCover('stop_cover')" />
        <v-btn icon="mdi-chevron-down" :size="btnSize" variant="text" :disabled="isUnavailable || isFullyClosed"
          @click.stop="callCover('close_cover')" />
      </div>

      <v-progress-circular :model-value="position ?? 0" :color="dialColor"
        size="130" bg-color="surface-light" width="12" reveal rounded
        :style="dialStyle">
        <v-avatar size="98" style="background: transparent">
          <div class="d-flex flex-column align-center" style="line-height: 1.1">
            <span class="text-h6 font-weight-bold">{{ position ?? '–' }}%</span>
            <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
          </div>
        </v-avatar>
      </v-progress-circular>
    </div>
  </div>

  <CoverDetailDialog v-model="dialogOpen" :entity-id="props.config.entity_id" />
</template>

<script setup lang="ts">
import type { CoverWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

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

const dialColor = computed(() => {
  if (props.config.dial_color) return undefined
  if (isUnavailable.value) return undefined
  if (state.value === 'open') return 'success'
  if (state.value === 'opening' || state.value === 'closing') return 'warning'
  return 'medium-emphasis'
})

const dialStyle = computed(() => ({
  ...(props.config.dial_color ? { '--dial-color': props.config.dial_color } : {}),
  ...(props.config.dial_bg_color ? { '--dial-bg-color': props.config.dial_bg_color } : {}),
}))

const btnSize = computed(() => props.config.buttons_size ?? 'x-small')
const pos = computed(() => props.config.buttons_position ?? 'left')
const containerClass = computed(() => {
  if (pos.value === 'right')  return 'flex-row-reverse ga-4'
  if (pos.value === 'top')    return 'flex-column ga-3'
  if (pos.value === 'bottom') return 'flex-column-reverse ga-3'
  return 'flex-row ga-4'
})
const buttonsClass = computed(() => {
  if (pos.value === 'top' || pos.value === 'bottom') return 'd-flex flex-row align-center'
  return 'd-flex flex-column align-center'
})

const dialogOpen = ref(false)

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
