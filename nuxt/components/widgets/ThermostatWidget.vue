<template>
  <div
    class="thermo-card h-100"
    :class="[`mode-${hvacMode}`, { 'is-active': isActive }]"
    style="cursor: pointer"
    @click="dialogOpen = true"
  >
    <!-- Ambient glow -->
    <div class="thermo-ambient" />

    <!-- Header -->
    <div class="thermo-header">
      <v-icon icon="mdi-thermometer" size="12" style="opacity: 0.45; flex-shrink: 0" />
      <span class="thermo-name">{{ name }}</span>
      <div class="thermo-mode-pill">
        <v-icon :icon="modeIcon" size="11" class="thermo-mode-icon" />
        <span class="thermo-mode-label">{{ modeLabel }}</span>
      </div>
    </div>

    <!-- Dial -->
    <div class="thermo-dial-wrap">
      <div class="thermo-ring-container">
        <svg viewBox="0 0 100 100" class="thermo-svg" aria-hidden="true">
          <!-- Background track -->
          <path :d="trackPath" class="thermo-track" />
          <!-- Active arc (target temp) -->
          <path v-if="arcPath" :d="arcPath" class="thermo-arc" />
          <!-- Target temp dot -->
          <g v-if="targetDot">
            <circle :cx="targetDot.x" :cy="targetDot.y" r="5.5" class="thermo-tgt-glow" />
            <circle :cx="targetDot.x" :cy="targetDot.y" r="4.5" class="thermo-tgt-dot" />
            <circle :cx="targetDot.x" :cy="targetDot.y" r="2" class="thermo-tgt-center" />
          </g>
          <!-- Current temp dot -->
          <g v-if="currentDot">
            <circle :cx="currentDot.x" :cy="currentDot.y" r="5" class="thermo-curr-bg" />
            <circle :cx="currentDot.x" :cy="currentDot.y" r="2.5" class="thermo-curr-dot" />
          </g>
        </svg>

        <!-- Center overlay -->
        <div class="thermo-center">
          <span class="thermo-current-val">
            {{ currentTemp !== undefined ? currentTemp.toFixed(1) : '—' }}°
          </span>
          <span class="thermo-current-sub">{{ t('thermostat.current') }}</span>
        </div>
      </div>
    </div>

    <!-- Target controls -->
    <div
      class="thermo-controls"
      @click.stop @dblclick.stop @mousedown.stop @touchstart.passive.stop
    >
      <v-btn
        icon="mdi-minus"
        size="x-small"
        variant="text"
        density="compact"
        :disabled="isUnavailable"
        class="thermo-btn"
        @click.stop="setTemp(-0.5)"
      />
      <div class="thermo-target">
        <span class="thermo-target-val">{{ targetTemp !== undefined ? targetTemp.toFixed(1) : '—' }}°</span>
        <span class="thermo-target-sub">{{ t('thermostat.target') }}</span>
      </div>
      <v-btn
        icon="mdi-plus"
        size="x-small"
        variant="text"
        density="compact"
        :disabled="isUnavailable"
        class="thermo-btn"
        @click.stop="setTemp(0.5)"
      />
    </div>
  </div>

  <LazyClimateDetailDialog v-if="dialogOpen" v-model="dialogOpen" :entity-id="props.config.entity_id" />
</template>

<script setup lang="ts">
import type { ThermostatWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const { t } = useI18n()
const { glass } = useGlassEffect()

const MODE_LABELS = computed(() => ({
  heat: t('thermostat.mode_heat'),
  cool: t('thermostat.mode_cool'),
  auto: t('thermostat.mode_auto'),
  off: t('thermostat.mode_off'),
  heat_cool: t('thermostat.mode_heat_cool'),
}))

const props = defineProps<{ config: ThermostatWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const currentTemp = computed(() => entity.value?.attributes?.current_temperature as number | undefined)
const targetTemp = computed(() => entity.value?.attributes?.temperature as number | undefined)
const hvacMode = computed(() => entity.value?.state ?? 'off')
const hvacAction = computed(() => entity.value?.attributes?.hvac_action as string | undefined)
const isUnavailable = computed(() => !entity.value || hvacMode.value === 'unavailable')
const isActive = computed(() => hvacAction.value === 'heating' || hvacAction.value === 'cooling' || hvacAction.value === 'fan')
const modeLabel = computed(() => (MODE_LABELS.value as Record<string, string>)[hvacMode.value] ?? hvacMode.value)

const MODE_ICONS: Record<string, string> = {
  heat: 'mdi-fire',
  cool: 'mdi-snowflake',
  auto: 'mdi-thermostat-auto',
  heat_cool: 'mdi-thermometer',
  fan_only: 'mdi-fan',
  dry: 'mdi-water-percent',
  off: 'mdi-power',
}
const modeIcon = computed(() => MODE_ICONS[hvacMode.value] ?? 'mdi-thermostat')

const minTemp = computed(() => (entity.value?.attributes?.min_temp as number | undefined) ?? 10)
const maxTemp = computed(() => (entity.value?.attributes?.max_temp as number | undefined) ?? 30)

// SVG arc geometry
const CX = 50, CY = 50, R = 38
const START_DEG = 135, SWEEP_DEG = 270

function degToRad(d: number) { return (d * Math.PI) / 180 }
function arcPt(deg: number) {
  return { x: CX + R * Math.cos(degToRad(deg)), y: CY + R * Math.sin(degToRad(deg)) }
}
function svgArc(fromDeg: number, toDeg: number): string {
  const s = arcPt(fromDeg), e = arcPt(toDeg)
  const la = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)},${s.y.toFixed(3)} A ${R},${R} 0 ${la},1 ${e.x.toFixed(3)},${e.y.toFixed(3)}`
}
function tempToDeg(temp: number): number {
  const min = minTemp.value, max = maxTemp.value
  return START_DEG + ((Math.max(min, Math.min(max, temp)) - min) / (max - min)) * SWEEP_DEG
}

const trackPath = computed(() => svgArc(START_DEG, START_DEG + SWEEP_DEG))

const arcPath = computed((): string | null => {
  if (isUnavailable.value || targetTemp.value === undefined) return null
  const endDeg = tempToDeg(targetTemp.value)
  if (endDeg - START_DEG < 1) return null
  return svgArc(START_DEG, endDeg)
})

const targetDot = computed(() =>
  !isUnavailable.value && targetTemp.value !== undefined
    ? arcPt(tempToDeg(targetTemp.value))
    : null
)
const currentDot = computed(() =>
  !isUnavailable.value && currentTemp.value !== undefined
    ? arcPt(tempToDeg(currentTemp.value))
    : null
)

const dialogOpen = ref(false)

async function setTemp(delta: number) {
  if (isUnavailable.value || targetTemp.value === undefined) return
  await client.callService({
    domain: 'climate',
    service: 'set_temperature',
    target: { entity_id: props.config.entity_id },
    service_data: { temperature: Math.round((targetTemp.value + delta) * 2) / 2 },
  })
}
</script>

<style scoped>
/* ── Mode color tokens (RGB tuples) ─────────────────── */
.thermo-card             { --tc: 120, 120, 120; }
.mode-heat               { --tc: 255, 130, 48;  }
.mode-cool               { --tc: 56,  189, 248; }
.mode-auto, .mode-heat_cool { --tc: 120, 140, 255; }
.mode-fan_only           { --tc: 52,  211, 153; }
.mode-dry                { --tc: 251, 191, 36;  }

/* ── Card shell ─────────────────────────────────────── */
.thermo-card {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px 12px 12px;
  gap: 4px;
}

/* ── Ambient glow ───────────────────────────────────── */
.thermo-ambient {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 90% 75% at 50% 62%,
    rgba(var(--tc), 0.10) 0%,
    transparent 70%
  );
  pointer-events: none;
  transition: background 0.7s ease;
}
.is-active .thermo-ambient {
  animation: thermo-pulse 3s ease-in-out infinite;
}
@keyframes thermo-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Header ─────────────────────────────────────────── */
.thermo-header {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  z-index: 1;
}
.thermo-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}
.thermo-mode-pill {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px 2px 4px;
  border-radius: 10px;
  background: rgba(var(--tc), 0.15);
  flex-shrink: 0;
  transition: background 0.5s ease;
}
.thermo-mode-icon { color: rgb(var(--tc)); transition: color 0.5s ease; }
.thermo-mode-label {
  font-size: 10px;
  font-weight: 600;
  color: rgb(var(--tc));
  text-transform: capitalize;
  letter-spacing: 0.03em;
  transition: color 0.5s ease;
}

/* ── Dial ───────────────────────────────────────────── */
.thermo-dial-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  z-index: 1;
}
.thermo-ring-container {
  position: relative;
  width: min(100%, 135px);
  aspect-ratio: 1;
}
.thermo-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

/* SVG track + arc */
.thermo-track {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.10);
  stroke-width: 4.5;
  stroke-linecap: round;
}
.thermo-arc {
  fill: none;
  stroke: rgb(var(--tc));
  stroke-width: 4.5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px rgba(var(--tc), 0.55));
  transition: stroke 0.5s ease, filter 0.5s ease;
}

/* Target dot */
.thermo-tgt-glow {
  fill: rgba(var(--tc), 0.25);
  transition: fill 0.5s ease;
}
.thermo-tgt-dot {
  fill: rgb(var(--tc));
  transition: fill 0.5s ease;
}
.thermo-tgt-center { fill: rgb(var(--v-theme-surface)); }

/* Current dot (rendered on top, masks arc visually) */
.thermo-curr-bg  { fill: rgb(var(--v-theme-surface)); }
.thermo-curr-dot { fill: rgba(var(--v-theme-on-surface), 0.75); }

/* ── Center overlay ─────────────────────────────────── */
.thermo-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.thermo-current-val {
  font-size: 27px;
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}
.thermo-current-sub {
  font-size: 9px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.38;
  margin-top: 4px;
}

/* ── Controls ───────────────────────────────────────── */
.thermo-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  z-index: 1;
}
.thermo-btn { opacity: 0.65; transition: opacity 0.15s; }
.thermo-btn:hover { opacity: 1; }
.thermo-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 58px;
}
.thermo-target-val {
  font-size: 18px;
  font-weight: 600;
  color: rgb(var(--tc));
  line-height: 1;
  transition: color 0.5s ease;
  letter-spacing: -0.02em;
}
.thermo-target-sub {
  font-size: 9px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  opacity: 0.38;
  margin-top: 2px;
}
</style>
