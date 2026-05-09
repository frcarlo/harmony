<template>
  <div
    ref="cardEl"
    class="gauge-card h-100 d-flex flex-column align-center justify-center pa-3"
    :class="[`gauge-card--value-${valuePosition}`, { 'gauge-card--tiny': isTiny }]"
  >
    <GaugeValue v-if="valuePosition === 'top'" />

    <div class="gauge-card__main">
      <GaugeValue v-if="valuePosition === 'left'" />

      <div class="gauge-card__chart" :style="{ maxWidth: chartMaxWidth }">
        <svg class="gauge-card__svg" viewBox="0 0 220 138" aria-hidden="true">
          <path
            v-for="segment in segments"
            :key="segment.key"
            class="gauge-card__segment"
            :d="segment.path"
            :stroke="segment.color"
          />
          <g v-if="isNumeric" class="gauge-card__needle" :style="{ transform: `rotate(${needleAngle}deg)` }">
            <path d="M 110 116 L 105 112 L 110 40 L 115 112 Z" />
            <circle cx="110" cy="116" r="5" />
          </g>
        </svg>

        <GaugeValue v-if="valuePosition === 'center'" overlay />
      </div>

      <GaugeValue v-if="valuePosition === 'right'" />
    </div>

    <GaugeValue v-if="valuePosition === 'bottom'" />

    <div class="gauge-card__name text-truncate font-weight-medium">
      {{ name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'
import type { GaugeWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

type GaugeSegment = {
  key: string
  from: number
  to: number
  color: string
  path: string
}

const { locale } = useI18n()
const props = defineProps<{ config: GaugeWidgetConfig }>()
const entityStore = useEntityStore()
const cardEl = ref<HTMLDivElement | null>(null)
const cardSize = ref({ width: 0, height: 0 })

const entity = computed(() => entityStore.entities[props.config.entity_id])
const rawState = computed(() => entity.value?.state ?? 'unknown')
const numericState = computed(() => Number.parseFloat(rawState.value))
const isNumeric = computed(() => Number.isFinite(numericState.value))
const isUnavailable = computed(() => rawState.value === 'unavailable' || rawState.value === 'unknown' || !isNumeric.value)
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const unit = computed(() => props.config.unit ?? (entity.value?.attributes?.unit_of_measurement as string) ?? '')
const minValue = computed(() => finiteOr(props.config.min, 0))
const maxValue = computed(() => Math.max(minValue.value + 1, finiteOr(props.config.max, 100)))
const yellowFrom = computed(() => clamp(finiteOr(props.config.yellow_from, 70), minValue.value, maxValue.value))
const redFrom = computed(() => clamp(finiteOr(props.config.red_from, 90), minValue.value, maxValue.value))
const greenColor = computed(() => props.config.green_color || '#43a047')
const yellowColor = computed(() => props.config.yellow_color || '#ffb300')
const redColor = computed(() => props.config.red_color || '#e53935')
const valuePosition = computed(() => props.config.value_position ?? 'top')
const severityDirection = computed(() => props.config.severity_direction ?? 'high_bad')
const valueColor = computed(() => {
  if (!isNumeric.value) return 'rgb(var(--v-theme-surface-variant))'
  if (severityDirection.value === 'low_bad') {
    if (clampedValue.value <= redFrom.value) return redColor.value
    if (clampedValue.value <= yellowFrom.value) return yellowColor.value
    return greenColor.value
  }
  if (clampedValue.value >= redFrom.value) return redColor.value
  if (clampedValue.value >= yellowFrom.value) return yellowColor.value
  return greenColor.value
})
const valueTextColor = computed(() => readableTextColor(valueColor.value))
const isTiny = computed(() => cardSize.value.width < 260 || cardSize.value.height < 150)
const chartMaxWidth = computed(() => {
  if (isTiny.value) return '190px'
  if (valuePosition.value === 'center') return '360px'
  if (valuePosition.value === 'left' || valuePosition.value === 'right') return '240px'
  return '235px'
})
const clampedValue = computed(() => clamp(numericState.value, minValue.value, maxValue.value))
const progress = computed(() => {
  if (!isNumeric.value) return 0
  return (clampedValue.value - minValue.value) / (maxValue.value - minValue.value)
})
const needleAngle = computed(() => -90 + progress.value * 180)

const displayState = computed(() => {
  if (!isNumeric.value) return rawState.value
  if (props.config.decimal_places !== undefined) return numericState.value.toFixed(props.config.decimal_places)
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(numericState.value)
})

const segments = computed<GaugeSegment[]>(() => {
  const stops = severityDirection.value === 'low_bad'
    ? [
        { key: 'red', from: minValue.value, to: redFrom.value, color: redColor.value },
        { key: 'yellow', from: redFrom.value, to: yellowFrom.value, color: yellowColor.value },
        { key: 'green', from: yellowFrom.value, to: maxValue.value, color: greenColor.value },
      ]
    : [
        { key: 'green', from: minValue.value, to: yellowFrom.value, color: greenColor.value },
        { key: 'yellow', from: yellowFrom.value, to: redFrom.value, color: yellowColor.value },
        { key: 'red', from: redFrom.value, to: maxValue.value, color: redColor.value },
      ]

  return stops
    .filter((segment) => segment.to > segment.from)
    .map((segment) => ({
      ...segment,
      path: describeArc(valueToAngle(segment.from), valueToAngle(segment.to)),
    }))
})

function finiteOr(value: unknown, fallback: number) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function valueToAngle(value: number) {
  const normalized = (value - minValue.value) / (maxValue.value - minValue.value)
  return -180 + clamp(normalized, 0, 1) * 180
}

function polarToCartesian(angle: number, radius = 72) {
  const radians = (angle * Math.PI) / 180
  return {
    x: 110 + radius * Math.cos(radians),
    y: 116 + radius * Math.sin(radians),
  }
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A 72 72 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
}

function readableTextColor(color: string) {
  const hex = color.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!hex) return '#fff'

  const [, rHex, gHex, bHex] = hex
  const r = Number.parseInt(rHex, 16) / 255
  const g = Number.parseInt(gHex, 16) / 255
  const b = Number.parseInt(bHex, 16) / 255
  const luminance = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  return luminance > 0.52 ? '#1f2430' : '#fff'
}

function srgbToLinear(value: number) {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

onMounted(() => {
  if (!cardEl.value) return
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
})

const GaugeValue = defineComponent({
  props: {
    overlay: {
      type: Boolean,
      default: false,
    },
  },
  setup(valueProps) {
    return () => h('div', {
      class: ['gauge-card__value', { 'gauge-card__value--overlay': valueProps.overlay }],
      style: {
        backgroundColor: valueColor.value,
        color: valueTextColor.value,
      },
    }, isUnavailable.value
      ? [h('span', { class: 'gauge-card__number gauge-card__number--unavailable font-weight-bold' }, 'N/A')]
      : [
          h('span', { class: 'gauge-card__number font-weight-bold' }, displayState.value),
          unit.value ? h('span', { class: 'gauge-card__unit' }, unit.value) : null,
        ])
  },
})
</script>

<style scoped>
.gauge-card {
  min-width: 0;
  overflow: hidden;
  gap: 2px;
}

.gauge-card__main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.gauge-card__chart {
  position: relative;
  width: 100%;
  aspect-ratio: 220 / 138;
  margin-top: -4px;
  min-height: 0;
}

.gauge-card__svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gauge-card__segment {
  fill: none;
  stroke-width: 28;
  stroke-linecap: butt;
}

.gauge-card__needle {
  fill: rgb(var(--v-theme-on-surface));
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.38));
  opacity: 0.9;
  transform-box: view-box;
  transform-origin: 110px 116px;
  transition: transform 220ms ease;
}

.gauge-card__needle path {
  stroke: rgb(var(--v-theme-surface));
  stroke-linejoin: round;
  stroke-width: 2.5;
}

.gauge-card__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  max-width: 100%;
  min-width: 0;
  padding: 4px 11px 5px;
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
  line-height: 1;
}

.gauge-card__value--overlay {
  position: absolute;
  top: 50%;
  left: 22%;
  right: 22%;
  z-index: 1;
}

.gauge-card__number {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.75rem;
  line-height: 1;
  white-space: nowrap;
}

.gauge-card__number--unavailable {
  color: rgb(var(--v-theme-on-surface-variant));
}

.gauge-card__unit {
  font-size: 0.7rem;
  white-space: nowrap;
  opacity: 0.82;
}

.gauge-card__name {
  max-width: 100%;
  margin-top: 2px;
  font-size: 0.9rem;
  text-align: center;
}

.gauge-card--tiny {
  padding: 8px !important;
}

.gauge-card--value-left .gauge-card__chart,
.gauge-card--value-right .gauge-card__chart {
  flex: 1 1 0;
}

.gauge-card--value-left .gauge-card__value,
.gauge-card--value-right .gauge-card__value {
  flex: 0 1 42%;
}

.gauge-card--tiny .gauge-card__segment {
  stroke-width: 24;
}

.gauge-card--tiny .gauge-card__number {
  font-size: 1.25rem;
}

.gauge-card--tiny .gauge-card__unit,
.gauge-card--tiny .gauge-card__name {
  font-size: 0.75rem;
}
</style>
