<template>
  <!-- ── COMPACT ─────────────────────────────────────────── -->
  <div
    v-if="compact"
    class="h-100 d-flex flex-row align-center pa-2 ga-2 covd2-compact"
    style="cursor:pointer"
    @click="dialogOpen = true"
  >
    <!-- Arc position indicator -->
    <div class="covd2-arc-wrap flex-shrink-0">
      <svg viewBox="0 0 44 44" class="covd2-arc-svg">
        <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(var(--v-theme-on-surface), 0.08)" stroke-width="2.5" />
        <circle
          cx="22" cy="22" r="17"
          fill="none"
          :stroke="arcColor"
          stroke-width="2.5"
          stroke-linecap="round"
          :stroke-dasharray="`${arcDash} 107`"
          transform="rotate(-90 22 22)"
          style="transition: stroke-dasharray 0.5s ease, stroke 0.4s ease"
        />
      </svg>
      <div class="covd2-arc-center">
        <v-icon v-if="position === undefined" :icon="coverIcon" size="16" :color="iconColor" :style="iconStyle" />
        <span v-else class="covd2-arc-pct">{{ position }}</span>
      </div>
    </div>

    <!-- Name + state -->
    <div class="flex-grow-1 overflow-hidden" style="min-width:0">
      <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
      <div class="covd2-state-label" :style="{ color: stateColor }">
        {{ stateLabel }}<span v-if="position !== undefined"> · {{ position }}%</span>
      </div>
    </div>

    <!-- Controls -->
    <div class="d-flex ga-1 flex-shrink-0" @click.stop @dblclick.stop @mousedown.stop @touchstart.passive.stop>
      <v-btn
        icon="mdi-chevron-up" variant="tonal" size="x-small"
        :disabled="isUnavailable || isFullyOpen"
        @click.stop="callCover('open_cover')"
      />
      <v-btn icon="mdi-stop" variant="tonal" size="x-small" :disabled="isUnavailable" @click.stop="callCover('stop_cover')" />
      <v-btn
        icon="mdi-chevron-down" variant="tonal" size="x-small"
        :disabled="isUnavailable || isFullyClosed"
        @click.stop="callCover('close_cover')"
      />
    </div>
  </div>

  <!-- ── NORMAL ──────────────────────────────────────────── -->
  <div
    v-else
    class="cover-card h-100 d-flex flex-column"
    style="cursor:pointer"
    @click="dialogOpen = true"
  >
    <!-- Header -->
    <div class="cover-header">
      <v-icon :icon="coverIcon" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="cover-name">{{ name }}</span>
      <span class="cover-state-tag" :style="{ color: arcColor }">{{ stateLabel }}</span>
    </div>

    <!-- Shutter window visual -->
    <div class="cover-visual flex-grow-1">
      <div class="cover-window">
        <!-- Shutter fill (top → down = closed portion) -->
        <div
          class="cover-shutter"
          :class="{ 'cover-moving': isMoving }"
          :style="{ height: `${shutterFill}%`, '--accent': arcColor }"
        />
        <!-- Moving edge shimmer -->
        <div v-if="isMoving" class="cover-edge" :style="{ top: `${shutterFill}%`, '--accent': arcColor }" />
        <!-- Center badge -->
        <div class="cover-center">
          <div class="cover-badge" :style="{ '--accent': arcColor }">
            <template v-if="position !== undefined">
              <span class="cover-badge-num">{{ position }}</span>
              <span class="cover-badge-unit">%</span>
            </template>
            <v-icon v-else :icon="coverIcon" size="20" :color="iconColor" :style="iconStyle" />
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div
      class="cover-ctrl"
      @click.stop @dblclick.stop @mousedown.stop @touchstart.passive.stop
    >
      <v-btn
        icon="mdi-chevron-up"
        variant="tonal"
        size="small"
        :disabled="isUnavailable || isFullyOpen"
        @click.stop="callCover('open_cover')"
      />
      <v-btn icon="mdi-stop" variant="tonal" size="small" :disabled="isUnavailable" @click.stop="callCover('stop_cover')" />
      <v-btn
        icon="mdi-chevron-down"
        variant="tonal"
        size="small"
        :disabled="isUnavailable || isFullyClosed"
        @click.stop="callCover('close_cover')"
      />
    </div>
  </div>

  <LazyCoverDetailDialog
    v-if="dialogOpen && props.config.entity_id"
    v-model="dialogOpen"
    :entity-id="props.config.entity_id"
  />
</template>

<script setup lang="ts">
import type { CoverWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const { glass } = useGlassEffect()
const props = defineProps<{ config: CoverWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const compact = computed(() => props.config.compact ?? false)
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? 'unknown')
const position = computed(() => entity.value?.attributes?.current_position as number | undefined)
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable')
const isMoving = computed(() => state.value === 'opening' || state.value === 'closing')
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
const closedColor = computed(() => props.config.closed_color ?? 'rgba(var(--v-theme-on-surface), 0.3)')

const iconColor = computed(() => {
  if (isUnavailable.value) return 'disabled'
  if (isMoving.value) return 'warning'
  if (state.value === 'open') return props.config.open_color ? undefined : 'success'
  return props.config.closed_color ? undefined : 'medium-emphasis'
})
const iconStyle = computed(() => {
  if (isUnavailable.value || isMoving.value) return {}
  if (state.value === 'open' && props.config.open_color) return { color: props.config.open_color }
  if (state.value !== 'open' && props.config.closed_color) return { color: props.config.closed_color }
  return {}
})

const stateColor = computed(() => {
  if (isMoving.value) return 'rgb(var(--v-theme-warning))'
  if (state.value === 'open') return props.config.open_color ?? 'rgb(var(--v-theme-success))'
  return props.config.closed_color ?? undefined
})

const arcColor = computed(() => {
  if (props.config.dial_color) return props.config.dial_color
  if (isMoving.value) return 'rgb(var(--v-theme-warning))'
  if (state.value === 'open') return openColor.value
  return closedColor.value
})

// Compact arc: circumference of r=17 ≈ 106.8
const arcDash = computed(() => ((position.value ?? 0) / 100) * 106.8)

// How much of the window is covered (shutter fill = closed portion)
const shutterFill = computed(() => {
  if (position.value !== undefined) return 100 - position.value
  if (state.value === 'open') return 0
  if (state.value === 'closed') return 100
  return 50
})

const dialogOpen = ref(false)

async function callCover(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'cover', service, target: { entity_id: props.config.entity_id } })
}
</script>

<style scoped>
/* ── NORMAL layout ───────────────────────────────────── */
.cover-card {
  padding: 10px 12px 12px;
  gap: 6px;
}

/* Header */
.cover-header {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.cover-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.02em;
}
.cover-state-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  opacity: 0.85;
  transition: color 0.4s ease;
}

/* Visual window */
.cover-visual {
  min-height: 0;
}
.cover-window {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  background: rgba(var(--v-theme-on-surface), 0.025);
}

/* Shutter fill — neutral shutter material color with slat lines */
.cover-shutter {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  min-height: 0;
  /* Neutral shutter body — looks like actual roller shutter material */
  background-color: rgba(var(--v-theme-on-surface), 0.18);
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0px,
    rgba(0, 0, 0, 0) 8px,
    rgba(0, 0, 0, 0.22) 8px,
    rgba(0, 0, 0, 0.22) 10px
  );
  /* Accent tint from state color — subtle, not overwhelming */
  box-shadow: inset 0 0 0 9999px rgba(var(--v-theme-on-surface), 0.02);
  transition: height 0.55s cubic-bezier(0.4, 0, 0.2, 1);
}
.cover-moving {
  animation: shutter-breathe 2s ease-in-out infinite;
}
@keyframes shutter-breathe {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.78; }
}

/* Moving edge shimmer — accent colored line at shutter boundary */
.cover-edge {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  transform: translateY(-1px);
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
  background: var(--accent);
  opacity: 0.7;
}
.cover-edge::after {
  content: '';
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  animation: shimmer-slide 1.4s linear infinite;
}
@keyframes shimmer-slide {
  from { left: -50%; }
  to   { left: 150%; }
}

/* Center badge */
.cover-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.cover-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px 5px 8px;
  border-radius: 20px;
  background: rgba(var(--v-theme-surface), 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
}
.cover-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
  opacity: 0.85;
}
.cover-badge-num {
  font-size: 20px;
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}
.cover-badge-unit {
  font-size: 10px;
  opacity: 0.45;
  align-self: flex-end;
  margin-bottom: 2px;
}

/* Controls */
.cover-ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ── COMPACT layout ──────────────────────────────────── */
.covd2-compact { }

.covd2-arc-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.covd2-arc-svg {
  position: absolute;
  inset: 0;
  width: 40px;
  height: 40px;
}
.covd2-arc-center {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.covd2-arc-pct {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: -0.02em;
  opacity: 0.75;
}
.covd2-state-label {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 1px;
}
</style>
