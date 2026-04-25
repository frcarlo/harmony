<template>
  <!-- Compact: alles in einer Zeile -->
  <div v-if="compact" class="h-100 d-flex flex-row align-center pa-2 ga-2 covd2-compact" style="cursor:pointer"
    @click="dialogOpen = true">

    <div class="covd2-icon-wrapper flex-shrink-0">
      <v-icon :icon="coverIcon" size="30" :color="iconColor" :style="iconStyle" />
      <svg class="covd2-arc" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3" />
        <circle cx="22" cy="22" r="19" fill="none" :stroke="arcColor" stroke-width="3" stroke-linecap="round"
          :stroke-dasharray="`${arcDash} 120`" transform="rotate(-90 22 22)" />
      </svg>
    </div>
    <div class="flex-grow-1 overflow-hidden" style="min-width: 0">
      <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
      <div class="text-caption" :class="stateColor" :style="stateStyle">
        {{ stateLabel }}<span v-if="position !== undefined"> · {{ position }}%</span>
      </div>
    </div>
    <div class="d-flex ga-1 flex-shrink-0 covd2-compact__actions" @click.stop>
      <v-btn icon="mdi-chevron-up" variant="tonal" size="x-small" :disabled="isUnavailable || isFullyOpen"
        @click="callCover('open_cover')" />
      <v-btn icon="mdi-stop" variant="tonal" size="x-small" :disabled="isUnavailable" @click="callCover('stop_cover')" />
      <v-btn icon="mdi-chevron-down" variant="tonal" size="x-small" :disabled="isUnavailable || isFullyClosed"
        @click="callCover('close_cover')" />
    </div>
  </div>

  <!-- Normal: Icon+Info oben, Buttons unten -->
  <div v-else class="h-100 d-flex flex-column pa-2 ga-3" style="cursor:pointer" @click="dialogOpen = true">

    <div class="d-flex align-center ga-3 flex-grow-1 overflow-hidden">
      <div class="covd2-icon-wrapper flex-shrink-0">
        <v-icon :icon="coverIcon" size="36" :color="iconColor" :style="iconStyle" />
        <svg class="covd2-arc" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="3" />
          <circle cx="22" cy="22" r="19" fill="none" :stroke="arcColor" stroke-width="3" stroke-linecap="round"
            :stroke-dasharray="`${arcDash} 120`" transform="rotate(-90 22 22)" />
        </svg>
      </div>
      <div class="overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="text-caption" :class="stateColor">
          {{ stateLabel }}<span v-if="position !== undefined"> · {{ position }}%</span>
        </div>
      </div>
    </div>
    <div class="d-flex justify-center ga-1" @click.stop>
      <v-btn icon="mdi-chevron-up" variant="tonal" size="small" :disabled="isUnavailable || isFullyOpen"
        @click="callCover('open_cover')" />
      <v-btn icon="mdi-stop" variant="tonal" size="small" :disabled="isUnavailable" @click="callCover('stop_cover')" />
      <v-btn icon="mdi-chevron-down" variant="tonal" size="small" :disabled="isUnavailable || isFullyClosed"
        @click="callCover('close_cover')" />
    </div>
  </div>

  <CoverDetailDialog v-if="props.config.entity_id" v-model="dialogOpen" :entity-id="props.config.entity_id" />
</template>

<script setup lang="ts">
import type { CoverWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const props = defineProps<{ config: CoverWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const compact = computed(() => props.config.compact ?? false)

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? 'unknown')
const position = computed(() => entity.value?.attributes?.current_position as number | undefined)
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable')
const isFullyOpen = computed(() => position.value !== undefined ? position.value >= 100 : state.value === 'open')
const isFullyClosed = computed(() => position.value !== undefined ? position.value <= 0 : state.value === 'closed')

const stateLabel = computed(() => ({
  open: t('cover.open'), opening: t('cover.opening'),
  closed: t('cover.closed'), closing: t('cover.closing'),
  stopped: t('cover.stopped'),
}[state.value] ?? state.value))

const coverIcon = computed(() =>
  (state.value === 'open' || (position.value !== undefined && position.value > 0))
    ? 'mdi-window-shutter-open' : 'mdi-window-shutter'
)

const openColor = computed(() => props.config.open_color ?? 'rgb(var(--v-theme-success))')
const closedColor = computed(() => props.config.closed_color ?? 'rgba(255,255,255,0.3)')

const iconColor = computed(() => {
  if (isUnavailable.value) return 'disabled'
  if (state.value === 'opening' || state.value === 'closing') return 'warning'
  if (state.value === 'open') return props.config.open_color ? undefined : 'success'
  return props.config.closed_color ? undefined : 'medium-emphasis'
})

const iconStyle = computed(() => {
  if (isUnavailable.value) return {}
  if (state.value === 'opening' || state.value === 'closing') return {}
  if (state.value === 'open' && props.config.open_color) return { color: props.config.open_color }
  if (state.value !== 'open' && props.config.closed_color) return { color: props.config.closed_color }
  return {}
})

const stateColor = computed(() => {
  if (state.value === 'opening' || state.value === 'closing') return 'text-warning'
  if (state.value === 'open') return props.config.open_color ? '' : 'text-success'
  return props.config.closed_color ? '' : 'text-medium-emphasis'
})

const stateStyle = computed(() => {
  if (state.value === 'opening' || state.value === 'closing') return {}
  if (state.value === 'open' && props.config.open_color) return { color: props.config.open_color }
  if (state.value !== 'open' && props.config.closed_color) return { color: props.config.closed_color }
  return {}
})

const arcDash = computed(() => ((position.value ?? 0) / 100) * 119.4)
const arcColor = computed(() => {
  if (props.config.dial_color) return props.config.dial_color
  if (state.value === 'opening' || state.value === 'closing') return 'rgb(var(--v-theme-warning))'
  if (state.value === 'open') return openColor.value
  return closedColor.value
})

const dialogOpen = ref(false)

async function callCover(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'cover', service, target: { entity_id: props.config.entity_id } })
}
</script>

<style scoped>
.covd2-icon-wrapper {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.covd2-arc {
  position: absolute;
  inset: 0;
  width: 44px;
  height: 44px;
}

.gap-3 {
  gap: 12px;
}

.covd2-compact .covd2-icon-wrapper {
  width: 38px;
  height: 38px;
}

.covd2-compact .covd2-arc {
  width: 38px;
  height: 38px;
}

.covd2-compact__actions :deep(.v-btn) {
  min-width: 30px;
}
</style>
