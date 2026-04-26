<template>
  <div
    class="h-100 d-flex flex-column pa-3 ga-2 switch-card"
    :class="{
      'switch-card--off': !isOn,
      'switch-card--pending': isPending,
    }"
  >
    <div class="d-flex align-start justify-space-between ga-3">
      <div class="overflow-hidden flex-grow-1">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="d-flex align-center ga-2 mt-1 flex-wrap">
          <v-chip
            size="small"
            rounded="pill"
            variant="tonal"
            class="switch-card__state-chip"
            :color="isUnavailable ? undefined : (isOn ? 'success' : 'medium-emphasis')"
          >
            {{ isUnavailable ? 'N/A' : isOn ? t('common.on') : t('common.off') }}
          </v-chip>
          <span v-if="powerLabel" class="text-caption text-medium-emphasis">{{ powerLabel }}</span>
        </div>
      </div>
      <div class="switch-card__icon-wrap" :class="{ 'switch-card__icon-wrap--active': isOn }">
        <v-icon :icon="iconName" size="24" />
      </div>
    </div>

    <button class="switch-card__toggle" type="button" :disabled="isUnavailable" @click="toggle">
      <div class="switch-card__toggle-copy">
        <span class="text-body-2 font-weight-medium">{{ isOn ? t('switch.turn_off') : t('switch.turn_on') }}</span>
        <span class="text-caption text-medium-emphasis">
          {{ t('switch.tap_to_toggle') }}
        </span>
      </div>
      <UiSwitch :checked="isOn" :disabled="isUnavailable" @change="toggle" />
    </button>

    <div v-if="showPowerTrend && trendPath" class="switch-card__trend-wrap">
      <svg class="switch-card__trend" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        <path :d="trendAreaPath" class="switch-card__trend-area" />
        <path :d="trendPath" class="switch-card__trend-line" />
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SwitchWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()

const props = defineProps<{ config: SwitchWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const sensorEntity = computed(() => props.config.sensor_entity_id ? entityStore.entities[props.config.sensor_entity_id] : undefined)
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const isOn = computed(() => entity.value?.state === 'on')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const showPowerTrend = computed(() => props.config.show_sensor_trend !== false && !!props.config.sensor_entity_id)
const trendPoints = ref<Array<[number, number]>>([])
const iconName = computed(() => props.config.icon || (isOn.value ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'))
const isPending = ref(false)

const powerLabel = computed(() => {
  const raw = sensorEntity.value?.state
  if (!raw || raw === 'unknown' || raw === 'unavailable') return null
  const unit = sensorEntity.value?.attributes?.unit_of_measurement as string | undefined
  const num = Number(raw)
  const formatted = Number.isFinite(num)
    ? new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(num)
    : String(raw)
  return `${formatted}${unit ? ` ${unit}` : ''}`
})

const trendPath = computed(() => {
  if (trendPoints.value.length < 2) return ''
  const values = trendPoints.value.map(([, value]) => value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  return trendPoints.value
    .map(([, value], index) => {
      const x = trendPoints.value.length === 1 ? 0 : (index / (trendPoints.value.length - 1)) * 100
      const y = 22 - (((value - min) / range) * 18 + 2)
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
})

const trendAreaPath = computed(() => {
  if (!trendPath.value) return ''
  return `${trendPath.value} L 100 24 L 0 24 Z`
})

async function toggle() {
  if (isUnavailable.value || isPending.value) return
  isPending.value = true
  const domain = props.config.entity_id.split('.')[0]
  try {
    await client.callService({ domain, service: isOn.value ? 'turn_off' : 'turn_on', target: { entity_id: props.config.entity_id } })
  } finally {
    window.setTimeout(() => {
      isPending.value = false
    }, 500)
  }
}

async function loadTrend() {
  if (!showPowerTrend.value || !props.config.sensor_entity_id) {
    trendPoints.value = []
    return
  }

  try {
    const data = await $fetch<Array<{ state: string; last_changed: string }>>(
      `/api/ha/history?entityId=${encodeURIComponent(props.config.sensor_entity_id)}&period=24h`,
    )

    trendPoints.value = data
      .filter((entry) => entry.state !== 'unavailable' && entry.state !== 'unknown')
      .map((entry) => [new Date(entry.last_changed).getTime(), Number(entry.state)] as [number, number])
      .filter(([, value]) => Number.isFinite(value))
      .slice(-48)
  } catch {
    trendPoints.value = []
  }
}

watch(() => [props.config.sensor_entity_id, props.config.show_sensor_trend] as const, () => {
  loadTrend()
}, { immediate: true })
</script>

<style scoped>
.switch-card {
  position: relative;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.switch-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(var(--v-theme-on-surface), 0.62);
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: transform 0.22s ease, color 0.22s ease, background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.switch-card__icon-wrap--active {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.14);
  border-color: rgba(var(--v-theme-success), 0.22);
  box-shadow: 0 8px 18px rgba(var(--v-theme-success), 0.12);
}

.switch-card__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.055);
  cursor: pointer;
  transition: transform 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.switch-card__toggle:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.18);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
}

.switch-card__toggle:active {
  transform: scale(0.99);
}

.switch-card__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.switch-card__toggle-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.switch-card__state-chip {
  transition: transform 0.18s ease, opacity 0.18s ease, filter 0.18s ease;
}

.switch-card__trend-wrap {
  height: 30px;
  overflow: hidden;
  border-radius: 10px;
}

.switch-card__trend {
  display: block;
  width: 100%;
  height: 100%;
}

.switch-card__trend-line {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke 0.2s ease, opacity 0.2s ease;
}

.switch-card__trend-area {
  fill: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
}

.switch-card--pending .switch-card__icon-wrap {
  animation: switch-card-pulse 0.7s ease-in-out infinite;
}

.switch-card--pending .switch-card__state-chip {
  transform: translateY(-1px);
  filter: saturate(1.1);
}

.switch-card--pending .switch-card__toggle {
  border-color: rgba(var(--v-theme-primary), 0.24);
  box-shadow: 0 10px 24px rgba(var(--v-theme-primary), 0.08);
}

@keyframes switch-card-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
