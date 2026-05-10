<template>
  <div
    ref="cardEl"
    class="h-100 d-flex flex-column pa-3 ga-2 sensor-card"
    :class="{ 'sensor-card--tiny': isTiny, 'sensor-card--no-trend': !hasTrend }"
    style="cursor:pointer"
    @click="dialogOpen = true"
  >
    <div class="d-flex align-center ga-2 flex-shrink-0">
      <v-icon :icon="iconName"
        :size="isTiny ? 22 : 32"
        :color="stateColor ?? 'medium-emphasis'" class="flex-shrink-0" />
      <span class="font-weight-medium text-truncate" :class="isTiny ? 'text-caption' : 'text-body-2'">{{ name }}</span>
    </div>
    <div class="sensor-card__value-wrap">
      <span v-if="isUnavailable" class="text-medium-emphasis text-body-2">N/A</span>
      <div v-else class="d-flex align-end ga-1 sensor-card__value-row">
        <span class="sensor-card__value font-weight-bold" :class="{ 'sensor-card__value--tiny': useCompactValue }" :style="valueStyle">{{ displayState }}</span>
        <span v-if="unit" class="text-medium-emphasis pb-1" :class="useCompactValue ? 'text-caption' : 'text-body-2'">{{ unit }}</span>
      </div>
    </div>
    <div v-if="hasTrend" class="sensor-card__trend-wrap" :class="{ 'sensor-card__trend-wrap--tiny': isTiny }">
      <svg class="sensor-card__trend" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
        <path :d="trendAreaPath" class="sensor-card__trend-area" />
        <path :d="trendPath" class="sensor-card__trend-line" :style="{ color: alertColor ?? 'rgb(var(--v-theme-primary))' }" />
      </svg>
    </div>
  </div>

  <LazySensorDetailDialog v-if="dialogOpen" v-model="dialogOpen" :config="props.config" />
</template>

<script setup lang="ts">
import type { SensorWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const { locale } = useI18n()
const props = defineProps<{ config: SensorWidgetConfig }>()
const dialogOpen = ref(false)
const entityStore = useEntityStore()
const { formatEntityState } = useLocalizedEntityState()
const { autoEntityIcon, entityIsActive, entityStateColor } = useEntityPresentation()
const cardEl = ref<HTMLDivElement | null>(null)
const cardSize = ref({ width: 0, height: 0 })
const entity = computed(() => entityStore.entities[props.config.entity_id])
const domain = computed(() => props.config.entity_id.split('.')[0] ?? '')
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? '—')
const isBinarySensor = computed(() => domain.value === 'binary_sensor')
const unit = computed(() => props.config.unit ?? (entity.value?.attributes?.unit_of_measurement as string) ?? '')
const isUnavailable = computed(() => state.value === 'unavailable' || state.value === 'unknown')
const showTrend = computed(() => props.config.show_trend !== false && !isUnavailable.value)
const isTiny = computed(() => cardSize.value.width < 240 || cardSize.value.height < 135)
const trendPoints = ref<Array<[number, number]>>([])
const hasTrend = computed(() => showTrend.value && !!trendPath.value)
const useCompactValue = computed(() => isTiny.value && hasTrend.value)

function stateAsNumber(raw: string) {
  if (raw === 'on' || raw === 'true') return 1
  if (raw === 'off' || raw === 'false') return 0
  const num = parseFloat(raw)
  return Number.isFinite(num) ? num : NaN
}

const displayState = computed(() => {
  if (isBinarySensor.value) return formatEntityState(entity.value)
  const num = parseFloat(state.value)
  if (!Number.isNaN(num)) {
    if (props.config.decimal_places !== undefined) return num.toFixed(props.config.decimal_places)
    return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(num)
  }
  return formatEntityState(entity.value)
})

const valueStyle = computed(() => {
  const style: Record<string, string | undefined> = { color: stateColor.value }
  if (hasTrend.value || !cardSize.value.width || !cardSize.value.height) return style

  const textLength = Math.max(displayState.value.length + (unit.value ? unit.value.length * 0.45 : 0), 2)
  const widthLimited = cardSize.value.width / (textLength * 0.48)
  const heightLimited = cardSize.value.height * 0.42
  const size = Math.max(28, Math.min(widthLimited, heightLimited, 56))
  style.fontSize = `${size.toFixed(1)}px`
  return style
})

const alertColor = computed(() => {
  const val = stateAsNumber(state.value)
  if (Number.isNaN(val)) return undefined
  if (props.config.alert_above !== undefined && val > props.config.alert_above) return 'rgb(var(--v-theme-error))'
  if (props.config.alert_below !== undefined && val < props.config.alert_below) return 'rgb(var(--v-theme-info))'
  return undefined
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

async function loadTrend() {
  if (!showTrend.value || !props.config.entity_id) {
    trendPoints.value = []
    return
  }

  try {
    const data = await $fetch<Array<{ state: string; last_changed: string }>>(
      `/api/ha/history?entityId=${encodeURIComponent(props.config.entity_id)}&period=24h`,
    )

    trendPoints.value = data
      .filter((entry) => entry.state !== 'unavailable' && entry.state !== 'unknown')
      .map((entry) => [new Date(entry.last_changed).getTime(), stateAsNumber(entry.state)] as [number, number])
      .filter(([, value]) => Number.isFinite(value))
      .slice(-48)
  } catch {
    trendPoints.value = []
  }
}

const stateColor = computed(() => {
  if (!entity.value) return undefined
  if (alertColor.value) return alertColor.value
  if (isBinarySensor.value && entityIsActive(entity.value)) return `rgb(var(--v-theme-${entityStateColor(entity.value, true)}))`
  return undefined
})

const iconName = computed(() => {
  if (!entity.value) return 'mdi-gauge'
  return autoEntityIcon(entity.value, entityIsActive(entity.value))
})

onMounted(() => {
  if (cardEl.value) {
    const updateSize = () => {
      if (!cardEl.value) return
      cardSize.value = {
        width: cardEl.value.clientWidth,
        height: cardEl.value.clientHeight,
      }
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(cardEl.value)
    onUnmounted(() => observer.disconnect())
  }
  loadTrend()
})

watch(() => [props.config.entity_id, props.config.show_trend] as const, () => {
  loadTrend()
}, { immediate: false })
</script>

<style scoped>
.sensor-card__trend-wrap {
  height: 34px;
  flex-shrink: 0;
  margin: 0;
  overflow: hidden;
  border-radius: 10px;
}

.sensor-card__trend-wrap--tiny {
  height: 24px;
}

.sensor-card__trend {
  display: block;
  width: 100%;
  height: 100%;
}

.sensor-card__trend-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sensor-card__trend-area {
  fill: color-mix(in srgb, rgb(var(--v-theme-primary)) 14%, transparent);
}

.sensor-card__value-wrap {
  flex: 1 1 auto;
  display: flex;
  align-items: flex-end;
  padding-top: 4px;
  min-height: 0;
  overflow: hidden;
}

.sensor-card__value-row {
  min-width: 0;
  max-width: 100%;
}

.sensor-card__value {
  font-size: clamp(1.2rem, 4vw, 2.2rem);
  line-height: 1;
  white-space: nowrap;
  max-width: 100%;
}

.sensor-card__value--tiny {
  font-size: 1.35rem;
}

.sensor-card--tiny {
  gap: 6px !important;
}

.sensor-card--tiny .sensor-card__value-wrap {
  flex: 0 0 auto;
  padding-top: 0;
  align-items: flex-start;
}

.sensor-card--no-trend .sensor-card__value-wrap {
  flex: 1 1 auto;
  align-items: center;
  padding-top: 0;
}

.sensor-card--no-trend.sensor-card--tiny .sensor-card__value-wrap {
  flex: 1 1 auto;
  align-items: center;
}
</style>
