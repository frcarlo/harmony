<template>
  <!-- ── COMPACT ─────────────────────────────────────────── -->
  <div
    v-if="isCompact"
    class="appl-compact h-100 d-flex align-center ga-2 pa-2"
  >
    <!-- Small circular progress ring -->
    <div class="appl-sm-ring flex-shrink-0">
      <svg viewBox="0 0 44 44" class="appl-sm-svg">
        <circle cx="22" cy="22" r="18" fill="none"
          stroke="rgba(var(--v-theme-on-surface), 0.09)" stroke-width="3" />
        <circle v-if="isRunning || isFinished"
          cx="22" cy="22" r="18" fill="none"
          :stroke="ringColor"
          stroke-width="3" stroke-linecap="round"
          :stroke-dasharray="`${compactDash} 113.1`"
          transform="rotate(-90 22 22)"
          style="transition: stroke-dasharray 0.5s ease, stroke 0.4s ease"
        />
      </svg>
      <div class="appl-sm-center">
        <v-icon v-if="!isRunning && !isFinished" :icon="iconName" size="15" color="medium-emphasis" />
        <span v-else class="appl-sm-pct">{{ isFinished ? '✓' : `${Math.round(progressValue)}%` }}</span>
      </div>
    </div>

    <!-- Text block -->
    <div class="flex-grow-1 overflow-hidden" style="min-width:0">
      <div class="text-caption text-medium-emphasis text-truncate" style="opacity:0.55">{{ subtitle }}</div>
      <div class="text-body-2 font-weight-medium text-truncate">{{ statusLabel }}</div>
      <div v-if="isRunning" class="text-caption text-medium-emphasis text-truncate">{{ remainingShortLabel }}</div>
    </div>

    <!-- End time + indicators -->
    <div class="flex-shrink-0 text-right d-flex flex-column align-end ga-1">
      <span class="appl-compact-time">{{ endTimeLabel }}</span>
      <div v-if="statusIndicators.length" class="d-flex ga-1">
        <div
          v-for="ind in statusIndicators"
          :key="ind.key"
          class="appl-indicator"
          :class="{ 'appl-indicator--on': ind.active }"
          :title="ind.label"
        >
          <v-icon :icon="ind.icon" size="11" />
        </div>
      </div>
    </div>
  </div>

  <!-- ── NORMAL ──────────────────────────────────────────── -->
  <div
    v-else
    class="appl-card h-100 d-flex flex-column"
    :class="{ 'appl-running': isRunning, 'appl-finished': isFinished }"
  >
    <!-- Background decoration -->
    <div class="appl-bg" aria-hidden="true">
      <div class="appl-orbit" />
      <v-icon :icon="iconName" class="appl-bg-icon" />
    </div>
    <!-- Running ambient glow -->
    <div class="appl-glow" />

    <!-- Content -->
    <div class="appl-content h-100 d-flex flex-column">
      <!-- Header -->
      <div class="appl-header d-flex align-center ga-2">
        <v-icon :icon="iconName" size="12" style="opacity:0.4; flex-shrink:0" />
        <span class="appl-name flex-grow-1">{{ subtitle }}</span>
        <div v-if="statusIndicators.length" class="d-flex ga-1 flex-shrink-0">
          <div
            v-for="ind in statusIndicators"
            :key="ind.key"
            class="appl-indicator"
            :class="{ 'appl-indicator--on': ind.active }"
            :title="ind.label"
          >
            <v-icon :icon="ind.icon" size="11" />
          </div>
        </div>
      </div>

      <!-- Main body -->
      <div class="appl-body flex-grow-1 d-flex align-center">
        <!-- Left: status + remaining -->
        <div class="flex-grow-1" style="min-width:0">
          <div class="appl-status-label">{{ statusLabel }}</div>
          <div v-if="!isRunning && !isFinished" class="appl-status-sub">
            {{ remainingLabel }}
          </div>
        </div>

        <!-- Right: Arc ring (running or finished) -->
        <div v-if="isRunning || isFinished" class="appl-ring-wrap flex-shrink-0">
          <svg viewBox="0 0 88 88" class="appl-ring-svg">
            <!-- Track -->
            <path :d="ringTrack" class="appl-ring-track" />
            <!-- Fill arc -->
            <path v-if="ringFillArc" :d="ringFillArc" class="appl-ring-fill" />
          </svg>
          <div class="appl-ring-center">
            <span class="appl-ring-time">{{ ringTimeLabel }}</span>
            <span class="appl-ring-sub">{{ isFinished ? '100%' : `${Math.round(progressValue)}%` }}</span>
          </div>
        </div>
      </div>

      <!-- Timeline (running only) -->
      <div v-if="isRunning" class="appl-timeline">
        <div class="appl-tl-track">
          <div class="appl-tl-fill" :style="{ width: `${progressValue}%` }" />
          <div class="appl-tl-dot" :style="{ left: `${progressValue}%` }" />
        </div>
        <div class="appl-tl-labels d-flex justify-space-between mt-1">
          <span>{{ startTimeLabel }}</span>
          <span>{{ endTimeLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ApplianceWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const { glass } = useGlassEffect()
const props = defineProps<{ config: ApplianceWidgetConfig }>()
const entityStore = useEntityStore()
const { performanceMode } = useDashboardDisplayMode()

const now = ref(new Date())
const clockIntervalMs = computed(() => performanceMode.value ? 60_000 : 30_000)
onMounted(() => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const tick = () => { now.value = new Date(); timer = setTimeout(tick, clockIntervalMs.value) }
  tick()
  onUnmounted(() => { if (timer) clearTimeout(timer) })
})

const statusEntity    = computed(() => entityStore.entities[props.config.status_entity_id])
const progressEntity  = computed(() => props.config.progress_entity_id ? entityStore.entities[props.config.progress_entity_id] : undefined)
const endTimeEntity   = computed(() => props.config.end_time_entity_id ? entityStore.entities[props.config.end_time_entity_id] : undefined)
const countdownEntity = computed(() => props.config.countdown_entity_id ? entityStore.entities[props.config.countdown_entity_id] : undefined)
const timeRemainingEntity = computed(() => props.config.time_remaining_entity_id ? entityStore.entities[props.config.time_remaining_entity_id] : undefined)
const programEntity   = computed(() => props.config.program_entity_id ? entityStore.entities[props.config.program_entity_id] : undefined)
const powerEntity     = computed(() => props.config.power_entity_id ? entityStore.entities[props.config.power_entity_id] : undefined)
const doorEntity      = computed(() => props.config.door_entity_id ? entityStore.entities[props.config.door_entity_id] : undefined)

function normalizeStatusValue(value?: string | null) {
  const normalized = (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '')
  const aliases: Record<string, string> = {
    on: 'run', off: 'ready', starting: 'starting', running: 'run',
    paused: 'pause', delayed_start: 'delayedstart', delayedstart: 'delayedstart',
    action_required: 'actionrequired', actionrequired: 'actionrequired',
  }
  return aliases[normalized] ?? normalized
}

const runningState   = computed(() => normalizeStatusValue(props.config.running_state || 'run'))
const isCompact      = computed(() => props.config.compact ?? false)
const rawStatus      = computed(() => normalizeStatusValue(statusEntity.value?.state ?? 'unknown'))
const numericPower   = computed(() => Number(powerEntity.value?.state))
const powerState     = computed(() => String(powerEntity.value?.state ?? '').trim().toLowerCase())
const hasActivePower = computed(() => {
  if (['on', 'true', 'running', 'active'].includes(powerState.value)) return true
  if (['off', 'false', 'idle', 'inactive'].includes(powerState.value)) return false
  return Number.isFinite(numericPower.value) && numericPower.value > 1
})
const countdownSeconds = computed(() => Number(countdownEntity.value?.state))
const hasCountdown     = computed(() => Number.isFinite(countdownSeconds.value) && countdownSeconds.value > 0)
const isUnavailable    = computed(() => !statusEntity.value || rawStatus.value === 'unavailable' || rawStatus.value === 'unknown')
const rawProgressValue = computed(() => {
  const raw = Number(progressEntity.value?.state ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(100, raw))
})
const isStaleRunning = computed(() => (
  rawStatus.value === runningState.value
  && !hasActivePower.value
  && !hasCountdown.value
  && rawProgressValue.value >= 100
))
const effectiveStatus = computed(() => isStaleRunning.value ? 'finished' : rawStatus.value)
const isRunning  = computed(() => effectiveStatus.value === runningState.value)
const isFinished = computed(() => effectiveStatus.value === 'finished')
const isIdleLike = computed(() => ['idle', 'ready', 'inactive', 'off'].includes(effectiveStatus.value))
const progressValue = computed(() => isRunning.value ? rawProgressValue.value : 0)

const statusLabel = computed(() => {
  if (isUnavailable.value) return t('appliance.status.unavailable')
  const key = `appliance.status.${effectiveStatus.value}`
  const translated = t(key)
  return translated === key ? effectiveStatus.value : translated
})

function prettifyProgram(raw?: string) {
  if (!raw) return ''
  return raw.trim()
    .replace(/^dishcare_dishwasher_program_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
function isMeaningfulLabel(value?: string | null) {
  if (!value) return false
  return !['unknown', 'unavailable', 'none', 'null', '-', '—'].includes(value.trim().toLowerCase())
}

const programLabel = computed(() => {
  const label = prettifyProgram(programEntity.value?.state)
  return isMeaningfulLabel(label) ? label : null
})
const powerLabel = computed(() => {
  const raw = powerEntity.value?.state
  if (!raw || raw === 'unknown' || raw === 'unavailable' || raw === 'on' || raw === 'off') return null
  const unit = powerEntity.value?.attributes?.unit_of_measurement as string | undefined
  return `${raw}${unit ? ` ${unit}` : ''}`
})

const doorState   = computed(() => String(doorEntity.value?.state ?? '').trim().toLowerCase())
const isDoorOpen  = computed(() => ['open', 'opened', 'on', 'true'].includes(doorState.value))
const isDoorClosed = computed(() => ['closed', 'close', 'off', 'false'].includes(doorState.value))

const statusIndicators = computed(() => {
  const items: Array<{ key: string; icon: string; label: string; active: boolean }> = []
  if (powerEntity.value) items.push({
    key: 'power',
    icon: hasActivePower.value ? 'mdi-power' : 'mdi-power-off',
    label: hasActivePower.value ? t('appliance.power_on') : t('appliance.power_off'),
    active: hasActivePower.value,
  })
  if (doorEntity.value && (isDoorOpen.value || isDoorClosed.value)) items.push({
    key: 'door',
    icon: isDoorOpen.value ? 'mdi-door-open' : 'mdi-door-closed',
    label: isDoorOpen.value ? t('appliance.door_open') : t('appliance.door_closed'),
    active: isDoorOpen.value,
  })
  return items
})

const subtitle = computed(() => {
  const parts = [
    props.config.name || ((statusEntity.value?.attributes?.friendly_name as string | undefined) ?? t('widget.appliance.label')),
    programLabel.value,
    powerLabel.value,
  ].filter(Boolean)
  return parts.join(' · ')
})

function parseDurationParts(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized || ['unknown', 'unavailable', 'none', 'null', '-', '—', 'off'].includes(normalized)) return null
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const minutes = Number(normalized)
    return Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : null
  }
  const colonParts = normalized.split(':').map(Number)
  if (colonParts.length >= 2 && colonParts.length <= 3 && colonParts.every(p => Number.isFinite(p) && p >= 0)) {
    const [a, b, c] = colonParts
    return colonParts.length === 3 ? ((a * 3600) + (b * 60) + c) * 1000 : ((a * 60) + b) * 1000
  }
  let matched = false, totalMs = 0
  for (const match of normalized.matchAll(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes|s|sec|secs|second|seconds)\b/g)) {
    matched = true
    const amount = Number(match[1]), unit = match[2]
    if (!Number.isFinite(amount)) continue
    if (unit.startsWith('h')) totalMs += amount * 3600_000
    else if (unit.startsWith('m')) totalMs += amount * 60_000
    else totalMs += amount * 1000
  }
  return matched && totalMs > 0 ? totalMs : null
}

const timeRemainingMs = computed(() => parseDurationParts(String(timeRemainingEntity.value?.state ?? '')))
const endDate = computed(() => {
  const raw = endTimeEntity.value?.state
  if (raw && raw !== 'unknown' && raw !== 'unavailable') {
    const dt = new Date(raw)
    if (!Number.isNaN(dt.getTime())) return dt
  }
  const countdown = Number(countdownEntity.value?.state)
  if (Number.isFinite(countdown) && countdown > 0) return new Date(now.value.getTime() + countdown * 1000)
  if (timeRemainingMs.value != null && timeRemainingMs.value > 0) return new Date(now.value.getTime() + timeRemainingMs.value)
  return null
})
const remainingMs = computed(() => endDate.value ? Math.max(0, endDate.value.getTime() - now.value.getTime()) : null)

function formatDuration(ms: number | null) {
  if (ms == null) return t('appliance.no_estimate')
  const totalMinutes = Math.round(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes} min`
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

const remainingLabel = computed(() => {
  if (isUnavailable.value) return t('appliance.status.unavailable')
  if (!isRunning.value) {
    if (isFinished.value) return t('appliance.finished')
    if (effectiveStatus.value === 'ready') return t('appliance.ready')
  }
  return `${t('appliance.remaining')}: ${formatDuration(remainingMs.value)}`
})
const remainingShortLabel = computed(() => {
  if (isUnavailable.value) return '—'
  if (!isRunning.value) return statusLabel.value
  return formatDuration(remainingMs.value)
})

// Ring time: compact format for inside the SVG ring
const ringTimeLabel = computed(() => {
  if (isFinished.value) return '✓'
  if (remainingMs.value == null) return '—'
  const totalMin = Math.round(remainingMs.value / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h === 0 ? `${m}m` : `${h}:${String(m).padStart(2, '0')}`
})

function formatTime(value: Date | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(value)
}
const endTimeLabel   = computed(() => formatTime(endDate.value))
const startDate      = computed(() => {
  if (!endDate.value || !isRunning.value) return null
  const p = progressValue.value
  if (p <= 0 || p >= 100) return null
  const rem = remainingMs.value
  if (rem == null) return null
  const total = rem / Math.max(0.0001, (100 - p) / 100)
  return new Date(endDate.value.getTime() - total)
})
const startTimeLabel = computed(() => formatTime(startDate.value))
const iconName       = computed(() => props.config.icon || 'mdi-dishwasher')

// Arc ring color
const ringColor = computed(() => isFinished.value ? 'rgb(var(--v-theme-success))' : 'rgb(var(--v-theme-warning))')

// Compact ring dash: circumference of r=18 = 113.1
const compactDash = computed(() => ((isFinished.value ? 100 : progressValue.value) / 100) * 113.1)

// SVG arc helpers (viewBox 88x88, r=38, 270° sweep)
const CX = 44, CY = 44, R = 38, START_DEG = 135, SWEEP_DEG = 270
function degToRad(d: number) { return d * Math.PI / 180 }
function arcPt(deg: number) { return { x: CX + R * Math.cos(degToRad(deg)), y: CY + R * Math.sin(degToRad(deg)) } }
function svgArc(fromDeg: number, toDeg: number) {
  const s = arcPt(fromDeg), e = arcPt(toDeg)
  const la = toDeg - fromDeg > 180 ? 1 : 0
  return `M ${s.x.toFixed(3)},${s.y.toFixed(3)} A ${R},${R} 0 ${la},1 ${e.x.toFixed(3)},${e.y.toFixed(3)}`
}
const ringTrack = computed(() => svgArc(START_DEG, START_DEG + SWEEP_DEG))
const ringFillArc = computed((): string | null => {
  const pct = isFinished.value ? 100 : progressValue.value
  if (pct <= 0) return null
  const endDeg = START_DEG + (pct / 100) * SWEEP_DEG
  if (endDeg - START_DEG < 1) return null
  return svgArc(START_DEG, endDeg)
})
</script>

<style scoped>
/* ── COMPACT ─────────────────────────────────────────── */
.appl-compact { cursor: default; }

.appl-sm-ring {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.appl-sm-svg {
  position: absolute;
  inset: 0;
}
.appl-sm-center {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.appl-sm-pct {
  font-size: 10px;
  font-weight: 700;
  opacity: 0.8;
  letter-spacing: -0.02em;
}
.appl-compact-time {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.7;
  letter-spacing: -0.01em;
}

/* ── NORMAL ──────────────────────────────────────────── */
.appl-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  padding: 10px 12px 12px;
}

/* Background decoration */
.appl-bg {
  position: absolute;
  right: -18px;
  top: -16px;
  width: 130px;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0.28;
  z-index: 0;
  transition: opacity 0.5s ease;
}
.appl-running .appl-bg { opacity: 0.42; }
.appl-orbit {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 9px solid rgba(var(--v-theme-on-surface), 0.06);
  border-left-color: rgba(var(--v-theme-primary), 0.55);
  border-top-color: rgba(var(--v-theme-primary), 0.22);
  transition: border-left-color 0.5s ease, border-top-color 0.5s ease;
}
.appl-running .appl-orbit {
  border-left-color: rgba(var(--v-theme-warning), 0.65);
  border-top-color: rgba(var(--v-theme-warning), 0.25);
  animation: appl-rotate 2.6s linear infinite;
}
@keyframes appl-rotate {
  to { transform: rotate(360deg); }
}
.appl-bg-icon {
  font-size: 46px;
  color: rgba(var(--v-theme-on-surface), 0.5);
}
.appl-running .appl-bg-icon {
  animation: appl-breathe 3.4s ease-in-out infinite;
}
@keyframes appl-breathe {
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.04); }
}

/* Ambient warm glow when running */
.appl-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 80% 70% at 88% 15%,
    rgba(var(--v-theme-warning), 0) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
}
.appl-running .appl-glow {
  background: radial-gradient(
    ellipse 80% 70% at 88% 15%,
    rgba(var(--v-theme-warning), 0.08) 0%,
    transparent 70%
  );
}

/* Content layer */
.appl-content { position: relative; z-index: 1; gap: 4px; }

/* Header */
.appl-header {
  flex-shrink: 0;
}
.appl-name {
  font-size: 11px;
  opacity: 0.58;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  letter-spacing: 0.02em;
}

/* Body */
.appl-body {
  min-height: 0;
  gap: 8px;
}

/* Status label */
.appl-status-label {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  color: rgb(var(--v-theme-on-surface));
}
.appl-status-sub {
  font-size: 12px;
  opacity: 0.55;
  margin-top: 4px;
  letter-spacing: 0.01em;
}

/* SVG ring */
.appl-ring-wrap {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
}
.appl-ring-svg {
  width: 88px;
  height: 88px;
}
.appl-ring-track {
  fill: none;
  stroke: rgba(var(--v-theme-on-surface), 0.09);
  stroke-width: 5.5;
  stroke-linecap: round;
}
.appl-ring-fill {
  fill: none;
  stroke: rgb(var(--v-theme-warning));
  stroke-width: 5.5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(var(--v-theme-warning), 0.55));
  transition: stroke 0.5s ease;
}
.appl-finished .appl-ring-fill {
  stroke: rgb(var(--v-theme-success));
  filter: none;
}

/* Ring center overlay */
.appl-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  gap: 0;
}
.appl-ring-time {
  font-size: 18px;
  font-weight: 300;
  letter-spacing: -0.04em;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}
.appl-ring-sub {
  font-size: 10px;
  opacity: 0.42;
  letter-spacing: 0.04em;
  margin-top: 3px;
}

/* Timeline */
.appl-timeline { flex-shrink: 0; }
.appl-tl-track {
  position: relative;
  height: 3px;
  border-radius: 2px;
  background: rgba(var(--v-theme-on-surface), 0.1);
  overflow: visible;
}
.appl-tl-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 2px;
  background: rgb(var(--v-theme-warning));
  transition: width 0.6s ease;
  box-shadow: 0 0 6px rgba(var(--v-theme-warning), 0.5);
}
.appl-tl-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: rgb(var(--v-theme-warning));
  border: 2px solid rgb(var(--v-theme-surface));
  box-shadow: 0 0 6px rgba(var(--v-theme-warning), 0.7);
  transition: left 0.6s ease;
}
.appl-tl-labels {
  font-size: 10px;
  opacity: 0.48;
  letter-spacing: 0.02em;
}

/* Shared: status indicators */
.appl-indicator {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.08);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  color: rgba(var(--v-theme-on-surface), 0.45);
  transition: all 0.3s ease;
}
.appl-indicator--on {
  background: rgba(var(--v-theme-primary), 0.15);
  border-color: rgba(var(--v-theme-primary), 0.25);
  color: rgb(var(--v-theme-primary));
}
</style>
