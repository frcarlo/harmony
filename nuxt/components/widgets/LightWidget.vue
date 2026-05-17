<template>
  <div
    class="light-card h-100 d-flex flex-column"
    :class="{ 'light-on': isOn, 'cursor-pointer': hasAnyAction }"
    @click="handleCardClick"
    @dblclick="handleCardDoubleClick"
  >
    <!-- Warm ambient glow -->
    <div class="light-ambient" />

    <!-- Header -->
    <div class="light-header">
      <v-icon icon="mdi-lightbulb" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="light-name">{{ name }}</span>
      <span class="light-state-tag" :class="isOn ? 'light-tag-on' : 'light-tag-off'">
        {{ isUnavailable ? 'N/A' : isOn ? t('common.on') : t('common.off') }}
      </span>
    </div>

    <!-- Center: icon + brightness -->
    <div class="light-center flex-grow-1 d-flex flex-column align-center justify-center">
      <v-icon
        :icon="isOn ? 'mdi-lightbulb' : 'mdi-lightbulb-off-outline'"
        size="40"
        :class="isOn ? 'light-icon-on' : 'light-icon-off'"
      />
      <div v-if="showBrightness" class="light-brightness">
        {{ brightnessPercent }}<span class="light-pct">%</span>
      </div>
    </div>

    <!-- Controls -->
    <div
      class="light-controls"
      @click.stop @dblclick.stop @mousedown.stop @touchstart.passive.stop
    >
      <UiSwitch :checked="isOn" :disabled="isUnavailable" @change="toggle" />
      <v-slider
        v-if="showBrightness"
        :model-value="brightnessPercent"
        min="1" max="100"
        color="warning"
        hide-details
        class="flex-grow-1"
        @end="setBrightness"
      />
    </div>
  </div>

  <LazyLightDetailDialog v-if="detailOpen" v-model="detailOpen" :entity-id="props.config.entity_id" />
</template>

<script setup lang="ts">
import type { LightWidgetConfig, WidgetAppearance } from '~/types/dashboard'

const { t } = useI18n()
const { glass } = useGlassEffect()
const props = defineProps<{ config: LightWidgetConfig; appearance?: WidgetAppearance }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const isOn = computed(() => entity.value?.state === 'on')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const brightness = computed(() => entity.value?.attributes?.brightness as number | undefined)
const brightnessPercent = computed(() => brightness.value !== undefined ? Math.round((brightness.value / 255) * 100) : 0)
const showBrightness = computed(() => props.config.show_brightness !== false && isOn.value && brightness.value !== undefined)

const clickAction = computed(() => props.config.card_click_action ?? props.config.tap_action ?? 'none')
const doubleClickAction = computed(() => props.config.card_double_click_action ?? props.config.double_tap_action ?? 'none')
const hasAnyAction = computed(() => clickAction.value !== 'none' || doubleClickAction.value !== 'none')

const detailOpen = ref(false)
let clickTimer: ReturnType<typeof setTimeout> | null = null

function runAction(action: string) {
  if (action === 'toggle') toggle()
  else if (action === 'open_detail') detailOpen.value = true
}
function handleCardClick() {
  if (clickAction.value === 'none') return
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => { clickTimer = null; runAction(clickAction.value) }, 220)
}
function handleCardDoubleClick() {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
  if (doubleClickAction.value === 'none') return
  runAction(doubleClickAction.value)
}
async function toggle() {
  if (isUnavailable.value) return
  await client.callService({ domain: 'light', service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.config.entity_id } })
}
async function setBrightness(pct: number) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'light', service: 'turn_on', target: { entity_id: props.config.entity_id }, service_data: { brightness_pct: pct } })
}
</script>

<style scoped>
/* ── Shell ──────────────────────────────────── */
.light-card {
  position: relative;
  overflow: hidden;
  padding: 10px 12px 12px;
  gap: 4px;
}

/* ── Ambient glow ───────────────────────────── */
.light-ambient {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 90% 80% at 50% 48%, rgba(var(--v-theme-warning), 0) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
}
.light-on .light-ambient {
  background: radial-gradient(ellipse 90% 80% at 50% 48%, rgba(var(--v-theme-warning), 0.10) 0%, transparent 70%);
}

/* ── Header ─────────────────────────────────── */
.light-header {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
.light-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}
.light-state-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  flex-shrink: 0;
  transition: color 0.4s ease, opacity 0.4s ease;
}
.light-tag-on  { color: rgb(var(--v-theme-warning)); opacity: 0.9; }
.light-tag-off { opacity: 0.30; color: inherit; }

/* ── Center ─────────────────────────────────── */
.light-center {
  position: relative;
  z-index: 1;
  gap: 7px;
}
.light-icon-on {
  color: rgb(var(--v-theme-warning));
  filter: drop-shadow(0 0 9px rgba(var(--v-theme-warning), 0.55));
  animation: light-pulse 3.2s ease-in-out infinite;
}
.light-icon-off { opacity: 0.20; }
@keyframes light-pulse {
  0%, 100% { filter: drop-shadow(0 0  8px rgba(var(--v-theme-warning), 0.50)); }
  50%       { filter: drop-shadow(0 0 16px rgba(var(--v-theme-warning), 0.80)); }
}
.light-brightness {
  font-size: 26px;
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}
.light-pct {
  font-size: 13px;
  opacity: 0.45;
  margin-left: 1px;
}

/* ── Controls ───────────────────────────────── */
.light-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}
</style>
