<template>
  <div
    class="h-100 d-flex flex-column timer-card"
    :class="[
      isSingle ? 'pa-3 ga-2' : 'pa-2 ga-1',
      `timer-card--${stateKey}`,
      { 'timer-card--finished': finished }
    ]"
  >
    <div class="timer-ambient" />

    <!-- Single-timer header -->
    <div v-if="isSingle" class="d-flex align-center ga-2 timer-header">
      <v-icon icon="mdi-timer-outline" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="timer-name">{{ displayName }}</span>
      <v-chip size="x-small" rounded="pill" variant="tonal" :color="stateColor" class="flex-shrink-0">
        {{ stateLabel }}
      </v-chip>
    </div>

    <!-- Multi-timer: optional widget title + chip selector -->
    <template v-else>
      <div v-if="widgetTitle" class="d-flex align-center ga-2 timer-header">
        <v-icon icon="mdi-timer-outline" size="12" style="opacity:0.45; flex-shrink:0" />
        <span class="timer-name">{{ widgetTitle }}</span>
        <v-chip size="x-small" rounded="pill" variant="tonal" :color="stateColor" class="flex-shrink-0">
          {{ stateLabel }}
        </v-chip>
      </div>
      <div class="d-flex ga-1 flex-wrap timer-chips">
        <v-btn
          v-for="(entry, idx) in timerList"
          :key="idx"
          size="small"
          :variant="chipVariant(idx)"
          :color="chipColor(idx)"
          rounded="pill"
          class="timer-preset-btn text-none px-3"
          @click="selectedIndex = idx"
        >
          <span v-if="timerEntryState(entry) === 'active'" class="timer-chip__dot" />
          {{ timerEntryLabel(entry) }}
        </v-btn>
      </div>
    </template>

    <!-- Center countdown -->
    <div class="d-flex flex-column align-center justify-center flex-grow-1 ga-1">
      <div
        class="timer-display"
        :class="{ 'timer-display--active': stateKey === 'active', 'timer-display--paused': stateKey === 'paused' }"
      >
        {{ displayTime }}
      </div>
      <div v-if="stateKey === 'active' && finishesAt" class="text-caption text-medium-emphasis">
        {{ t('timer.finishes_at', { time: finishesAt }) }}
      </div>
      <div v-else-if="stateKey === 'idle' && durationLabel" class="text-caption text-medium-emphasis">
        {{ durationLabel }}
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="!isUnavailable && timerList.length > 0" class="d-flex ga-2">
      <template v-if="stateKey === 'idle'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="primary" :disabled="busy" @click="callService('timer', 'start')">
          {{ t('timer.action.start') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'active'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" :disabled="busy" @click="callService('timer', 'pause')">
          {{ t('timer.action.pause') }}
        </v-btn>
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="error" :disabled="busy" @click="callService('timer', 'cancel')">
          {{ t('timer.action.cancel') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'paused'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="primary" :disabled="busy" @click="callService('timer', 'start')">
          {{ t('timer.action.resume') }}
        </v-btn>
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="error" :disabled="busy" @click="callService('timer', 'cancel')">
          {{ t('timer.action.cancel') }}
        </v-btn>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TimerWidgetConfig, TimerEntry } from '~/types/dashboard'

const { t, locale } = useI18n()
const props = defineProps<{ config: TimerWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

// ── Timer list (backward-compatible with old single entity_id config) ──────
const timerList = computed<TimerEntry[]>(() => {
  if (Array.isArray(props.config.timers) && props.config.timers.length > 0) {
    return props.config.timers
  }
  const legacyId = props.config.entity_id
  return legacyId ? [{ entity_id: legacyId }] : []
})

const isSingle = computed(() => timerList.value.length === 1)
const selectedIndex = ref(0)
const clampedIndex = computed(() => Math.min(selectedIndex.value, Math.max(0, timerList.value.length - 1)))
const selectedEntry = computed(() => timerList.value[clampedIndex.value])

// Clamp when list shrinks
watch(timerList, (list) => {
  if (selectedIndex.value >= list.length) selectedIndex.value = Math.max(0, list.length - 1)
})

// ── Entity state ──────────────────────────────────────────────────────────
const entity = computed(() => entityStore.entities[selectedEntry.value?.entity_id ?? ''])
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const stateKey = computed(() => isUnavailable.value ? 'idle' : (entity.value?.state ?? 'idle'))

const stateColor = computed(() => {
  switch (stateKey.value) {
    case 'active': return 'primary'
    case 'paused': return 'warning'
    default: return undefined
  }
})

const stateLabel = computed(() => {
  if (isUnavailable.value) return t('common.unavailable')
  const key = `timer.state.${stateKey.value}`
  const tr = t(key)
  return tr === key ? stateKey.value : tr
})

// ── Chip helpers ──────────────────────────────────────────────────────────
function timerEntryState(entry: TimerEntry): string {
  return entityStore.entities[entry.entity_id]?.state ?? 'idle'
}

function timerEntryLabel(entry: TimerEntry): string {
  if (entry.name) return entry.name
  const e = entityStore.entities[entry.entity_id]
  const duration = e?.attributes?.duration as string | undefined
  if (duration) {
    const secs = parseHMS(duration)
    const m = Math.floor(secs / 60)
    const s = secs % 60
    if (s === 0 && m > 0) return `${m} min`
    return formatSeconds(secs)
  }
  return (e?.attributes?.friendly_name as string | undefined) ?? entry.entity_id.split('.').pop() ?? '?'
}

function chipVariant(idx: number): 'tonal' | 'text' {
  if (idx === clampedIndex.value) return 'tonal'
  const state = timerEntryState(timerList.value[idx])
  return (state === 'active' || state === 'paused') ? 'tonal' : 'text'
}

function chipColor(idx: number): string | undefined {
  const state = timerEntryState(timerList.value[idx])
  if (state === 'active') return 'primary'
  if (state === 'paused') return 'warning'
  return undefined
}

// Auto-switch to a timer that just became active
const allTimerStates = computed(() => timerList.value.map(e => timerEntryState(e)))
watch(allTimerStates, (states, prev) => {
  if (!prev || timerList.value.length <= 1) return
  const currentState = states[clampedIndex.value]
  if (currentState === 'active' || currentState === 'paused') return
  for (let i = 0; i < states.length; i++) {
    if (i !== clampedIndex.value && states[i] === 'active' && prev[i] !== 'active') {
      selectedIndex.value = i
      return
    }
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────
function parseHMS(raw: string | undefined): number {
  if (!raw) return 0
  const parts = raw.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] ?? 0
}

function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${m}:${String(sec).padStart(2, '0')}`
}

// ── Audio ─────────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null

function ensureAudioCtx() {
  if (!import.meta.client) return null
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  } catch { return null }
}

async function playFinishSound() {
  if (props.config.finish_sound === false) return
  const ctx = ensureAudioCtx()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    try { await ctx.resume() } catch { return }
  }
  const vol = ((props.config.finish_sound_volume ?? 70) / 100) * 0.5
  try {
    const beep = (start: number, freq: number, dur: number, v = vol) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(v, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur)
      osc.start(start)
      osc.stop(start + dur + 0.05)
    }
    const now = ctx.currentTime
    beep(now,        660,  0.20)
    beep(now + 0.25, 880,  0.20)
    beep(now + 0.50, 660,  0.20)
    beep(now + 0.75, 880,  0.20)
    beep(now + 1.00, 1100, 0.80, vol * 1.1)
  } catch { /* AudioContext not available */ }
}

// ── Finished state (blink) ────────────────────────────────────────────────
const finished = ref(false)
let finishedTimer: ReturnType<typeof setTimeout> | null = null

function stopFinished() {
  finished.value = false
  if (finishedTimer) { clearTimeout(finishedTimer); finishedTimer = null }
}

function triggerFinished() {
  if (finished.value) return
  if (props.config.finish_blink !== false) {
    finished.value = true
    if (finishedTimer) clearTimeout(finishedTimer)
    finishedTimer = setTimeout(stopFinished, 5000)
  }
  void playFinishSound()
}

// ── Countdown ─────────────────────────────────────────────────────────────
const remainingSeconds = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

function clearCountdown() {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

function syncFromEntity() {
  const state = stateKey.value
  if (state === 'active') {
    const finishesAtRaw = entity.value?.attributes?.finishes_at as string | undefined
    if (finishesAtRaw) {
      const endMs = new Date(finishesAtRaw).getTime()
      remainingSeconds.value = (endMs - Date.now()) / 1000
    } else {
      remainingSeconds.value = parseHMS(entity.value?.attributes?.remaining as string | undefined)
    }
    clearCountdown()
    countdownInterval = setInterval(() => {
      remainingSeconds.value = Math.max(0, remainingSeconds.value - 1)
    }, 1000)
  } else {
    clearCountdown()
    remainingSeconds.value = parseHMS(entity.value?.attributes?.remaining as string | undefined)
  }
}

// ── Watchers ──────────────────────────────────────────────────────────────
// Track entity switches to avoid false finish triggers
let switchingEntity = false

watch(selectedEntry, (newEntry, oldEntry) => {
  if (newEntry?.entity_id !== oldEntry?.entity_id) {
    switchingEntity = true
    stopFinished()
    clearCountdown()
    syncFromEntity()
    void nextTick(() => { switchingEntity = false })
  }
}, { immediate: true })

// Sync on any HA attribute update (e.g. finishes_at changes)
watch(entity, () => {
  if (!switchingEntity) syncFromEntity()
}, { deep: false })

// Handle state transitions
watch(stateKey, (newState, oldState) => {
  if (switchingEntity) return
  if (newState === 'active') stopFinished()
  else if (newState === 'idle' && oldState === 'active') triggerFinished()
})

// Countdown hits zero while timer entity hasn't updated yet
watch(remainingSeconds, (newVal, oldVal) => {
  if (newVal === 0 && oldVal > 0 && stateKey.value === 'active') triggerFinished()
})

onUnmounted(() => {
  clearCountdown()
  stopFinished()
  audioCtx?.close()
})

// ── Display computeds ─────────────────────────────────────────────────────
const widgetTitle = computed(() => props.config.name ?? null)

const displayName = computed(() => {
  if (isSingle.value) {
    return props.config.name
      ?? (entity.value?.attributes?.friendly_name as string | undefined)
      ?? selectedEntry.value?.entity_id
      ?? ''
  }
  const entry = selectedEntry.value
  return entry?.name
    ?? (entity.value?.attributes?.friendly_name as string | undefined)
    ?? entry?.entity_id?.split('.').pop()
    ?? ''
})

const displayTime = computed(() => formatSeconds(remainingSeconds.value))

const durationLabel = computed(() => {
  const raw = entity.value?.attributes?.duration as string | undefined
  if (!raw) return null
  return formatSeconds(parseHMS(raw))
})

const finishesAt = computed(() => {
  const raw = entity.value?.attributes?.finishes_at as string | undefined
  if (!raw) return null
  try {
    return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(new Date(raw))
  } catch {
    return null
  }
})

const busy = ref(false)

async function callService(domain: string, service: string) {
  if (busy.value || !selectedEntry.value?.entity_id) return
  busy.value = true
  ensureAudioCtx()
  try {
    await client.callService({ domain, service, target: { entity_id: selectedEntry.value.entity_id } })
  } finally {
    window.setTimeout(() => { busy.value = false }, 500)
  }
}
</script>

<style scoped>
.timer-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.timer-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
  border-radius: inherit;
}

.timer-card--active .timer-ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 100%, rgba(var(--v-theme-primary), 0.09) 0%, transparent 70%);
}

.timer-card--paused .timer-ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 100%, rgba(var(--v-theme-warning), 0.08) 0%, transparent 70%);
}

.timer-header,
.timer-chips,
.timer-card > .d-flex {
  position: relative;
  z-index: 1;
}

.timer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.timer-chips {
  gap: 4px;
}

.timer-preset-btn {
  height: 28px !important;
  min-width: 0 !important;
  font-size: 12px !important;
}

.timer-chip__dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  margin-right: 3px;
  flex-shrink: 0;
  animation: timer-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes timer-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.timer-display {
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace;
  opacity: 0.75;
  transition: color 0.3s ease, opacity 0.3s ease;
  position: relative;
  z-index: 1;
}

.timer-display--active {
  opacity: 1;
  color: rgb(var(--v-theme-primary));
}

.timer-display--paused {
  opacity: 0.55;
  color: rgb(var(--v-theme-warning));
}

.timer-card--finished .timer-ambient {
  animation: timer-finish-pulse 0.55s ease-in-out 9;
}

@keyframes timer-finish-pulse {
  0%, 100% { background: transparent; }
  50%       { background: radial-gradient(ellipse 130% 130% at 50% 50%, rgba(var(--v-theme-primary), 0.45) 0%, transparent 65%); }
}
</style>
