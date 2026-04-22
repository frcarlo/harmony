<template>

  <div ref="rootEl" class="h-100 d-flex flex-column overflow-hidden pa-2">

    <!-- Compact layout for short widgets -->
    <template v-if="isShort">
      <div class="d-flex align-center ga-2 mb-1" style="min-width:0">
        <v-icon icon="mdi-window-shutter" size="12" color="medium-emphasis" class="flex-shrink-0" />

        <span class="text-caption text-medium-emphasis text-truncate flex-grow-1">{{ name }}</span>
        <span v-if="position !== undefined" class="text-caption font-weight-medium flex-shrink-0">{{ position }}%</span>
        <span v-else class="text-caption text-medium-emphasis flex-shrink-0">{{ stateLabel }}</span>
      </div>

      <div class="flex-grow-1 d-flex align-center justify-center ga-1">

        <v-btn :disabled="isUnavailable || isFullyOpen" variant="tonal" size="x-small" icon="mdi-chevron-up"
          @click="callCover('open_cover')" />
        <v-btn :disabled="isUnavailable" variant="tonal" size="x-small" icon="mdi-stop"
          @click="callCover('stop_cover')" />
        <v-btn :disabled="isUnavailable || isFullyClosed" variant="tonal" size="x-small" icon="mdi-chevron-down"
          @click="callCover('close_cover')" />
      </div>
    </template>

    <!-- Normal layout -->
    <template v-else>

      <div class="d-flex align-center ga-2 mb-2" style="min-width:0">
        <v-icon icon="mdi-window-shutter" size="14" color="medium-emphasis" class="flex-shrink-0" />
        <v-tooltip :text="name" location="bottom" :open-delay="500">
          <template #activator="{ props: tp }">
            <span v-bind="tp" class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
          </template>
        </v-tooltip>
      </div>
      <div class="flex-grow-1 d-flex justify-center" :class="containerClass">
        <div class="d-flex align-center ga-2" :class="infoClass">
          <span v-if="position !== undefined" class="text-h6 font-weight-semibold">{{ position }}%</span>
          <span class="text-caption text-medium-emphasis">{{ stateLabel }}</span>
        </div>
        <div class="d-flex ga-2" :class="buttonsClass">

          <v-btn :disabled="isUnavailable || isFullyOpen" variant="tonal" :size="btnSize" icon="mdi-chevron-up"
            v-tooltip="{ text: openCoverText, location: 'top' }" @click="callCover('open_cover')" />
          <v-btn :disabled="isUnavailable" variant="tonal" :size="btnSize" icon="mdi-stop"
            @click="callCover('stop_cover')" />
          <v-btn :disabled="isUnavailable || isFullyClosed" v-tooltip="{ text: closeCoverText, location: 'top' }"
            variant="tonal" :size="btnSize" icon="mdi-chevron-down" @click="callCover('close_cover')" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { CoverWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()

const props = defineProps<{ config: CoverWidgetConfig }>()
const rootEl = ref<HTMLElement | null>(null)
const containerWidth = ref(300)
const containerHeight = ref(200)
const isNarrow = computed(() => containerWidth.value < 150)
const isShort = computed(() => containerHeight.value < 120)

onMounted(() => {
  if (!rootEl.value) return
  const ro = new ResizeObserver(([e]) => {
    containerWidth.value = e.contentRect.width
    containerHeight.value = e.contentRect.height
  })
  ro.observe(rootEl.value)
  onUnmounted(() => ro.disconnect())
})

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
const closeCoverText = computed(() => t('common.close_cover'))
const openCoverText = computed(() => t('common.open'))

const pos = computed(() => props.config.buttons_position ?? 'bottom')
const containerClass = computed(() => {
  if (isNarrow.value) return 'flex-column align-center ga-1'
  if (pos.value === 'left') return 'flex-row align-center ga-3'
  if (pos.value === 'right') return 'flex-row-reverse align-center ga-3'
  if (pos.value === 'top') return 'flex-column align-center ga-2'
  return 'flex-column-reverse align-center ga-2'
})
const infoClass = computed(() => 'flex-column align-center')
const btnSize = computed(() => isNarrow.value ? 'x-small' : (props.config.buttons_size ?? 'small'))
const buttonsClass = computed(() => {
  if (isNarrow.value) return 'flex-row'
  if (pos.value === 'left' || pos.value === 'right') return 'flex-column'
  return 'flex-row'
})

async function callCover(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'cover', service, target: { entity_id: props.config.entity_id } })
}
</script>
