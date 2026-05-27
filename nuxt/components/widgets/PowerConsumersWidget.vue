<template>
  <div class="h-100 d-flex flex-column pa-3 power-consumers-widget">
    <!-- Header row -->
    <div class="d-flex align-center justify-space-between mb-2 flex-shrink-0">
      <div class="d-flex align-center ga-2 min-width-0">
        <v-icon icon="mdi-flash" size="14" color="medium-emphasis" />
        <span class="text-caption text-medium-emphasis text-truncate">{{ title }}</span>
      </div>
      <div v-if="hasConsumers" class="d-flex ga-1 flex-shrink-0">
        <v-btn
          v-for="p in periods" :key="p.key"
          :variant="period === p.key ? 'flat' : 'text'"
          :color="period === p.key ? 'primary' : undefined"
          size="x-small" density="compact"
          @click="selectPeriod(p.key)"
        >{{ p.label }}</v-btn>
      </div>
    </div>

    <!-- View toggle -->
    <div v-if="hasConsumers" class="d-flex ga-1 mb-2 flex-shrink-0">
      <v-btn
        :variant="view === 'table' ? 'tonal' : 'text'"
        size="x-small" density="compact"
        prepend-icon="mdi-table"
        @click="view = 'table'"
      >{{ t('power_consumers.table') }}</v-btn>
      <v-btn
        :variant="view === 'chart' ? 'tonal' : 'text'"
        size="x-small" density="compact"
        prepend-icon="mdi-chart-line"
        @click="view = 'chart'"
      >{{ t('power_consumers.chart') }}</v-btn>
    </div>

    <!-- No consumers configured -->
    <div v-if="!hasConsumers" class="flex-grow-1 d-flex align-center justify-center text-center">
      <div class="text-body-2 text-medium-emphasis">{{ t('power_consumers.no_consumers') }}</div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="flex-grow-1 d-flex align-center justify-center">
      <v-progress-circular indeterminate size="24" />
    </div>

    <!-- Table view -->
    <div v-else-if="view === 'table'" class="flex-grow-1 overflow-auto">
      <table class="pc-table w-100">
        <thead>
          <tr>
            <th class="text-left text-caption text-medium-emphasis pb-1">{{ t('power_consumers.consumer') }}</th>
            <th class="text-right text-caption text-medium-emphasis pb-1">{{ t('power_consumers.consumption') }}</th>
            <th v-if="showCosts" class="text-right text-caption text-medium-emphasis pb-1">{{ t('power_consumers.cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.entityId" class="pc-row">
            <td class="text-body-2 py-1 pr-2">
              <div class="d-flex align-center ga-2">
                <span class="pc-dot" :style="{ background: row.color }" />
                <span class="text-truncate">{{ row.name }}</span>
              </div>
            </td>
            <td class="text-right text-body-2 py-1 pr-2 text-no-wrap">{{ formatKwh(row.kwh) }}</td>
            <td v-if="showCosts" class="text-right text-body-2 py-1 text-no-wrap">{{ formatCost(row.kwh) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="tableRows.length > 1">
          <tr class="pc-total">
            <td class="text-body-2 font-weight-bold py-1 pr-2">{{ t('power_consumers.total') }}</td>
            <td class="text-right text-body-2 font-weight-bold py-1 pr-2 text-no-wrap">{{ formatKwh(totalKwh) }}</td>
            <td v-if="showCosts" class="text-right text-body-2 font-weight-bold py-1 text-no-wrap">{{ formatCost(totalKwh) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Chart view -->
    <div v-else class="flex-grow-1 position-relative">
      <div ref="chartEl" class="w-100 h-100" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { graphic, init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { PowerConsumersWidgetConfig } from '~/types/dashboard'

use([BarChart, CanvasRenderer, GridComponent, LegendComponent, LineChart, TooltipComponent])

const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#34d399', '#f87171', '#a78bfa', '#fb923c', '#38bdf8']

const props = defineProps<{ config: PowerConsumersWidgetConfig }>()
const { t } = useI18n()

const title = computed(() => props.config.name ?? t('widget.power_consumers.label'))
const hasConsumers = computed(() => (props.config.consumers?.length ?? 0) > 0)
const pricePerKwh = computed(() => props.config.price_per_kwh ?? 0)
const currencySymbol = computed(() => props.config.currency_symbol ?? '€')
const showCosts = computed(() => pricePerKwh.value > 0)

type PeriodKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month'
const periods = computed(() => [
  { key: 'today' as PeriodKey, label: t('power_consumers.today') },
  { key: 'yesterday' as PeriodKey, label: t('power_consumers.yesterday') },
  { key: 'this_week' as PeriodKey, label: t('power_consumers.this_week') },
  { key: 'last_week' as PeriodKey, label: t('power_consumers.last_week') },
  { key: 'this_month' as PeriodKey, label: t('power_consumers.this_month') },
  { key: 'last_month' as PeriodKey, label: t('power_consumers.last_month') },
])

const period = ref<PeriodKey>('today')
const view = ref<'table' | 'chart'>('table')
const loading = ref(false)
const chartEl = ref<HTMLDivElement | null>(null)
let chart: ECharts | null = null

interface EntityResult {
  total_kwh: number
  granularity: 'hour' | 'day'
  daily: { label: string; kwh: number }[]
}
const results = ref<Record<string, EntityResult>>({})

const tableRows = computed(() =>
  (props.config.consumers ?? []).map((c, i) => ({
    entityId: c.entity_id,
    name: c.name || c.entity_id,
    kwh: results.value[c.entity_id]?.total_kwh ?? 0,
    color: COLORS[i % COLORS.length],
  }))
)

const totalKwh = computed(() => tableRows.value.reduce((s, r) => s + r.kwh, 0))

function formatKwh(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(2)} MWh`
  if (v >= 10) return `${v.toFixed(1)} kWh`
  return `${v.toFixed(3)} kWh`
}

function formatCost(kwh: number): string {
  return `${(kwh * pricePerKwh.value).toFixed(2)} ${currencySymbol.value}`
}

function selectPeriod(p: PeriodKey) {
  period.value = p
}

async function fetchData() {
  if (!hasConsumers.value) return
  loading.value = true
  try {
    const entityIds = (props.config.consumers ?? []).map(c => c.entity_id).join(',')
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const data = await $fetch<Record<string, EntityResult>>(
      `/api/ha/energy-period?entityIds=${encodeURIComponent(entityIds)}&period=${period.value}&timezone=${encodeURIComponent(timezone)}`
    )
    results.value = data
  } catch (e) {
    console.error('PowerConsumersWidget fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch([period, () => props.config.consumers], fetchData, { deep: true })

onMounted(() => {
  fetchData()
})

let resizeObserver: ResizeObserver | null = null

function destroyChart() {
  resizeObserver?.disconnect()
  resizeObserver = null
  chart?.dispose()
  chart = null
}

// Re-create chart every time the element appears/disappears (v-else toggles DOM node)
watch(chartEl, (el) => {
  destroyChart()
  if (!el) return
  chart = init(el, 'dark', { renderer: 'canvas' })
  resizeObserver = new ResizeObserver(() => { chart?.resize() })
  resizeObserver.observe(el)
  if (Object.keys(results.value).length > 0) {
    chart.setOption(buildChartOption(), true)
    nextTick(() => chart?.resize())
  }
}, { flush: 'post' })

// Update chart when new data arrives
watch(results, () => {
  if (!chart || !chartEl.value) return
  chart.setOption(buildChartOption(), true)
})

onUnmounted(destroyChart)

function buildChartOption() {
  const consumers = props.config.consumers ?? []

  // Detect granularity from first entity result
  const firstResult = Object.values(results.value)[0]
  const isHourly = firstResult?.granularity === 'hour'

  const allLabels = new Set<string>()
  for (const c of consumers) {
    const daily = results.value[c.entity_id]?.daily ?? []
    daily.forEach(d => allLabels.add(d.label))
  }
  let labels = Array.from(allLabels).sort()

  // Fill all expected buckets so missing ones render as 0
  if (isHourly) {
    labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)
  } else if (labels.length >= 2) {
    const filled: string[] = []
    const cur = new Date(labels[0] + 'T12:00:00Z')
    const last = new Date(labels[labels.length - 1] + 'T12:00:00Z')
    while (cur <= last) {
      filled.push(cur.toISOString().slice(0, 10))
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    labels = filled
  }

  const series = consumers.map((c, i) => {
    const daily = results.value[c.entity_id]?.daily ?? []
    const dataMap = Object.fromEntries(daily.map(d => [d.label, d.kwh]))
    const color = COLORS[i % COLORS.length]

    if (isHourly) {
      return {
        name: c.name || c.entity_id,
        type: 'bar' as const,
        data: labels.map(l => dataMap[l] ?? 0),
        itemStyle: { color, borderRadius: [3, 3, 0, 0] },
      }
    }
    return {
      name: c.name || c.entity_id,
      type: 'line' as const,
      data: labels.map(l => dataMap[l] ?? 0),
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: color + '55' },
          { offset: 1, color: color + '00' },
        ]),
      },
    }
  })

  return {
    backgroundColor: 'transparent',
    grid: { left: 8, right: 8, top: consumers.length > 1 ? 32 : 8, bottom: 24, containLabel: true },
    legend: consumers.length > 1 ? {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 12,
      itemHeight: 8,
    } : { show: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        fontSize: 10,
        color: '#94a3b8',
        formatter: (v: string) => isHourly ? v : v.slice(5), // HH:MM or MM-DD
      },
      axisLine: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, color: '#94a3b8', formatter: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}M` : v >= 10 ? `${v.toFixed(1)}` : `${v.toFixed(2)}` },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
    },
    series,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9', fontSize: 12 },
      formatter: (params: unknown) => {
        const ps = params as Array<{ seriesName: string; value: number; axisValue: string }>
        if (!ps.length) return ''
        const lines = ps.map(p => `${p.seriesName}: ${formatKwh(p.value)}`)
        return `${ps[0].axisValue}<br>${lines.join('<br>')}`
      },
    },
  }
}

</script>

<style scoped>
.power-consumers-widget {
  min-height: 0;
}

.pc-table {
  border-collapse: collapse;
  table-layout: fixed;
}

.pc-table th {
  border-bottom: 1px solid rgb(var(--v-border-color) / 0.2);
  padding-bottom: 4px;
}

.pc-row + .pc-row td {
  border-top: 1px solid rgb(var(--v-border-color) / 0.1);
}

.pc-total td {
  border-top: 1px solid rgb(var(--v-border-color) / 0.3);
  padding-top: 6px;
}

.pc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.min-width-0 {
  min-width: 0;
}
</style>
