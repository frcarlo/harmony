<template>
  <div class="h-100 d-flex flex-column pa-3 overflow-hidden appliance-card"
    :class="{ 'appliance-card--running': isRunning }">
    <div class="appliance-card__bg">
      <div class="appliance-card__icon-wrap">
        <div class="appliance-card__icon-orbit" />
        <v-icon :icon="iconName" class="appliance-card__icon" />
      </div>
    </div>

    <template v-if="isCompact">
      <div class="d-flex flex-column flex-grow-1 justify-space-between"
        style="min-width: 0; position: relative; z-index: 1;">
        <div class="pr-9">
          <div class="text-body-1 font-weight-bold text-truncate">{{ statusLabel }}</div>
          <div class="text-caption text-medium-emphasis text-truncate">
            {{ subtitle }}
          </div>
        </div>
        <div>
          <v-progress-linear :model-value="progressValue" :color="isRunning ? 'warning' : 'primary'"
            bg-color="rgba(var(--v-theme-on-surface), 0.14)" rounded height="8" class="appliance-card__progress" />
          <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-1">
            <span>{{ remainingShortLabel }}</span>
            <span>{{ endTimeLabel }}</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="d-flex flex-column flex-grow-1" style="min-width: 0; position: relative; z-index: 1;">
        <div class="d-flex flex-column" style="min-width: 0;">
          <div class="text-h6 font-weight-bold text-truncate">{{ statusLabel }}</div>
          <div class="text-body-2 text-medium-emphasis text-truncate pr-10">
            {{ subtitle }}
          </div>
          <div class="text-body-2 font-weight-medium mt-2">
            {{ remainingLabel }}
          </div>
        </div>

        <div class="mt-auto pt-3">
          <v-progress-linear :model-value="progressValue" :color="isRunning ? 'warning' : 'primary'"
            bg-color="rgba(var(--v-theme-on-surface), 0.14)" rounded height="10" class="appliance-card__progress" />
          <div class="d-flex justify-space-between text-caption text-medium-emphasis mt-2">
            <span>{{ startTimeLabel }}</span>
            <span>{{ endTimeLabel }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApplianceWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const props = defineProps<{ config: ApplianceWidgetConfig }>()
const entityStore = useEntityStore()
const now = useNow({ interval: 30_000 })

const statusEntity = computed(() => entityStore.entities[props.config.status_entity_id])
const progressEntity = computed(() => props.config.progress_entity_id ? entityStore.entities[props.config.progress_entity_id] : undefined)
const endTimeEntity = computed(() => props.config.end_time_entity_id ? entityStore.entities[props.config.end_time_entity_id] : undefined)
const countdownEntity = computed(() => props.config.countdown_entity_id ? entityStore.entities[props.config.countdown_entity_id] : undefined)
const programEntity = computed(() => props.config.program_entity_id ? entityStore.entities[props.config.program_entity_id] : undefined)
const powerEntity = computed(() => props.config.power_entity_id ? entityStore.entities[props.config.power_entity_id] : undefined)

const runningState = computed(() => props.config.running_state || 'run')
const isCompact = computed(() => props.config.compact ?? false)
const rawStatus = computed(() => statusEntity.value?.state ?? 'unknown')
const isUnavailable = computed(() => !statusEntity.value || rawStatus.value === 'unavailable' || rawStatus.value === 'unknown')
const isRunning = computed(() => rawStatus.value === runningState.value)
const isFinished = computed(() => rawStatus.value === 'finished')
const isIdleLike = computed(() => ['idle', 'ready', 'inactive', 'off'].includes(rawStatus.value))
const progressValue = computed(() => {
  if (isIdleLike.value) return 0
  if (isFinished.value) return 100
  const raw = Number(progressEntity.value?.state ?? 0)
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(100, raw))
})

const statusLabel = computed(() => {
  if (isUnavailable.value) return t('appliance.status.unavailable')
  const key = `appliance.status.${rawStatus.value}`
  const translated = t(key)
  return translated === key ? rawStatus.value : translated
})

function prettifyProgram(raw?: string) {
  if (!raw) return ''
  return raw
    .replace(/^dishcare_dishwasher_program_/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const programLabel = computed(() => prettifyProgram(programEntity.value?.state))
const powerLabel = computed(() => {
  const raw = powerEntity.value?.state
  if (!raw || raw === 'unknown' || raw === 'unavailable') return null
  if (raw === 'on' || raw === 'off') return null
  const unit = powerEntity.value?.attributes?.unit_of_measurement as string | undefined
  return `${raw}${unit ? ` ${unit}` : ''}`
})

const subtitle = computed(() => {
  let pLable = programLabel.value !== 'Unknown' ? programLabel.value : ""
  const parts = [
    props.config.name || ((statusEntity.value?.attributes?.friendly_name as string | undefined) ?? t('widget.appliance.label')),
    pLable || null,
    powerLabel.value,
  ].filter(Boolean)
  return parts.join(' • ')
})

const endDate = computed(() => {
  const raw = endTimeEntity.value?.state
  if (raw && raw !== 'unknown' && raw !== 'unavailable') {
    const dt = new Date(raw)
    if (!Number.isNaN(dt.getTime())) return dt
  }

  const countdown = Number(countdownEntity.value?.state)
  if (!Number.isFinite(countdown) || countdown <= 0) return null
  return new Date(now.value.getTime() + countdown * 1000)
})

const remainingMs = computed(() => {
  if (!endDate.value) return null
  return Math.max(0, endDate.value.getTime() - now.value.getTime())
})

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
    if (rawStatus.value === 'ready') return t('appliance.ready')
  }
  return `${t('appliance.remaining')}: ${formatDuration(remainingMs.value)}`
})

const remainingShortLabel = computed(() => {
  if (isUnavailable.value) return '—'
  if (!isRunning.value) return statusLabel.value
  return formatDuration(remainingMs.value)
})

function formatTime(value: Date | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(locale.value, { hour: '2-digit', minute: '2-digit' }).format(value)
}

const endTimeLabel = computed(() => formatTime(endDate.value))

const startDate = computed(() => {
  if (!endDate.value) return null
  const progress = progressValue.value
  if (!isRunning.value || progress <= 0 || progress >= 100) return null
  const remaining = remainingMs.value
  if (remaining == null) return null
  const totalMs = remaining / Math.max(0.0001, (100 - progress) / 100)
  return new Date(endDate.value.getTime() - totalMs)
})

const startTimeLabel = computed(() => formatTime(startDate.value))
const iconName = computed(() => props.config.icon || 'mdi-dishwasher')
</script>

<style scoped>
.appliance-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.appliance-card__bg {
  position: relative;
  z-index: 0;
}

.appliance-card__icon-wrap {
  position: absolute;
  right: -14px;
  top: -12px;
  width: 126px;
  height: 126px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0.34;
}

.appliance-card--running .appliance-card__icon-wrap {
  opacity: 0.52;
}

.appliance-card__icon-orbit {
  position: absolute;
  inset: 8px;
  border-radius: 999px;
  border: 11px solid rgba(var(--v-theme-on-surface), 0.06);
  border-left-color: rgba(var(--v-theme-primary), 0.58);
  border-top-color: rgba(var(--v-theme-primary), 0.28);
  box-shadow:
    inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.06),
    0 0 20px rgba(var(--v-theme-primary), 0.08);
  transform: rotate(18deg);
}

.appliance-card__icon {
  font-size: 44px;
  color: rgba(var(--v-theme-on-surface), 0.46);
}

.appliance-card__progress :deep(.v-progress-linear__background) {
  opacity: 1;
}

.appliance-card--running .appliance-card__icon-orbit {
  animation: appliance-rotate 2.6s linear infinite;
}

.appliance-card--running .appliance-card__icon {
  animation: appliance-breathe 3.4s ease-in-out infinite;
}

@keyframes appliance-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes appliance-breathe {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }

  50% {
    transform: scale(1.03);
    opacity: 1;
  }
}
</style>
