<template>
  <div class="h-100 d-flex flex-column pa-3 ga-2 timer-card" :class="`timer-card--${stateKey}`">
    <div class="timer-ambient" />

    <!-- Header -->
    <div class="d-flex align-center ga-2 timer-header">
      <v-icon icon="mdi-timer-outline" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="timer-name">{{ name }}</span>
      <v-chip
        size="x-small"
        rounded="pill"
        variant="tonal"
        :color="stateColor"
        class="flex-shrink-0"
      >
        {{ stateLabel }}
      </v-chip>
    </div>

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
    <div v-if="!isUnavailable" class="d-flex ga-2">
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
import type { TimerWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const props = defineProps<{ config: TimerWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string | undefined) ?? props.config.entity_id)
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

watch(entity, () => syncFromEntity(), { immediate: true, deep: false })
watch(stateKey, () => syncFromEntity())

onUnmounted(() => clearCountdown())

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
  if (busy.value) return
  busy.value = true
  try {
    await client.callService({ domain, service, target: { entity_id: props.config.entity_id } })
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
</style>
