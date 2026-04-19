<template>
  <div class="h-100 d-flex flex-column pa-3">
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-chart-line" size="14" color="medium-emphasis" />
        <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
      </div>

      <div class="d-flex ga-1">
        <v-btn v-for="p in periods" :key="p" :variant="period === p ? 'flat' : 'text'"
          :color="period === p ? 'primary' : undefined" size="x-small" density="compact" @click="selectPeriod(p)">{{ p
          }}</v-btn>
      </div>
    </div>
    <div class="flex-grow-1 position-relative">
      <div v-if="loading" class="h-100 d-flex align-center justify-center">
        <v-progress-circular indeterminate size="24" />
      </div>
      <div ref="chartEl" class="w-100 h-100" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import type { ChartWidgetConfig } from '~/types/dashboard'

const props = defineProps<{ config: ChartWidgetConfig }>()
const entityStore = useEntityStore()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const unit = computed(() => props.config.unit ?? (entity.value?.attributes?.unit_of_measurement as string) ?? '')
const color = computed(() => props.config.color ?? '#6366f1')
const chartType = computed(() => props.config.chart_type ?? 'area')

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const periods = ['1h', '6h', '24h', '7d', '30d'] as const
const period = ref(props.config.period ?? '24h')
const loading = ref(true)
const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let cachedPoints: Array<[number, number]> = []

onMounted(() => {
  if (!chartEl.value) return
  chart = echarts.init(chartEl.value, 'dark', { renderer: 'canvas' })
  const observer = new ResizeObserver(() => chart?.resize())
  observer.observe(chartEl.value)
  onUnmounted(() => { observer.disconnect(); chart?.dispose(); chart = null })
  fetchHistory()
})

// Data changes → re-fetch
watch([period, () => props.config.entity_id], fetchHistory)

// Visual changes → just re-render with cached data
watch([chartType, color, () => props.config.area_color], () => {
  if (cachedPoints.length > 0) renderChart(cachedPoints)
})

function selectPeriod(p: typeof periods[number]) {
  period.value = p
  props.config.period = p
}

async function fetchHistory() {
  if (!props.config.entity_id) return
  loading.value = true
  try {
    const data = await $fetch<Array<{ state: string; last_changed: string }>>(
      `/api/ha/history?entityId=${encodeURIComponent(props.config.entity_id)}&period=${period.value}`
    )
    cachedPoints = data
      .filter((d) => d.state !== 'unavailable' && d.state !== 'unknown')
      .map((d) => [new Date(d.last_changed).getTime(), parseFloat(d.state)] as [number, number])
      .filter((d) => !isNaN(d[1]))
    renderChart(cachedPoints)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function renderChart(points: Array<[number, number]>) {
  if (!chart) return
  const type = chartType.value
  const c = color.value

  chart.clear()
  chart.setOption({
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: 8, bottom: 24, containLabel: true },
    xAxis: {
      type: 'time',
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      axisLine: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => `${v}${unit.value}` },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series: [{
      type: type === 'bar' ? 'bar' : 'line',
      data: points,
      smooth: true,
      symbol: 'none',
      lineStyle: { color: c, width: 2 },
      itemStyle: { color: c },
      ...(type === 'area' ? {
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 5, [
            { offset: 0, color: hexToRgba(props.config.area_color ?? c, 0.5) },
            { offset: 1, color: hexToRgba(props.config.area_color ?? c, 0) },
          ]),
        },
      } : {}),
    }],
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const p = (params as Array<{ value: [number, number] }>)[0]
        if (!p) return ''
        return `${new Date(p.value[0]).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}: ${p.value[1].toFixed(1)}${unit.value}`
      },
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9', fontSize: 12 },
    },
    dataZoom: [{ type: 'inside' }],
  })
}
</script>
