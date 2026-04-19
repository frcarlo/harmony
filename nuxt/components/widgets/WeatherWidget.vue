<template>
  <div class="h-100 d-flex flex-column pa-3 overflow-hidden">

    <!-- Top row: condition + temp (right) -->
    <div class="d-flex align-center justify-end mb-1">
      <span class="text-caption text-medium-emphasis">{{ conditionLabel }}, {{ Math.round(temp ?? 0) }}°C</span>
    </div>

    <!-- Center: weather icon + large clock -->
    <div class="d-flex align-center ga-3 mb-1">
      <v-icon :icon="conditionIcon" size="48" :color="iconColor" />
      <div class="d-flex flex-column">
        <span class="font-weight-bold tabular-nums" style="font-size: 2.4rem; line-height: 1">{{ currentTime }}</span>
        <span class="text-caption text-medium-emphasis">{{ currentDate }}</span>
      </div>
    </div>

    <!-- Forecast error -->
    <div v-if="forecastError" class="text-caption text-error mt-1">{{ forecastError }}</div>

    <!-- Forecast rows -->
    <div v-if="forecastRows > 0 && visibleForecast.length" class="mt-auto d-flex flex-column ga-1 pt-2"
      style="border-top: 1px solid rgba(255,255,255,0.08)">
      <div v-for="(f, i) in visibleForecast" :key="i" class="d-flex align-center ga-2">
        <!-- Day -->
        <span class="text-caption text-medium-emphasis" style="min-width: 24px">{{ formatDay(f.datetime) }}</span>
        <!-- Condition icon -->
        <v-icon :icon="CONDITION_ICONS[f.condition] ?? 'mdi-weather-cloudy'" size="16"
          :color="conditionColor(f.condition)" />
        <!-- Low temp -->
        <span class="text-caption text-medium-emphasis tabular-nums" style="min-width: 28px; text-align: right">{{
          Math.round(f.templow ?? f.temperature) }}°</span>
        <!-- Temp range bar -->
        <div class="flex-grow-1 rounded-pill overflow-hidden" style="height: 6px; background: rgba(255,255,255,0.08)">
          <div class="h-100 rounded-pill" :style="tempBarStyle(f)" />
        </div>
        <!-- High temp -->
        <span class="text-caption font-weight-medium tabular-nums" style="min-width: 28px">{{ Math.round(f.temperature)
        }}°</span>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import type { WeatherWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
// locale used for date formatting below
const CONDITION_LABELS = computed(() => ({
  sunny: t('weather.sunny'), clear_night: t('weather.clear_night'), partlycloudy: t('weather.partlycloudy'),
  cloudy: t('weather.cloudy'), fog: t('weather.fog'), hail: t('weather.hail'),
  lightning: t('weather.lightning'), lightning_rainy: t('weather.lightning_rainy'),
  pouring: t('weather.pouring'), rainy: t('weather.rainy'), snowy: t('weather.snowy'),
  snowy_rainy: t('weather.snowy_rainy'), windy: t('weather.windy'), windy_variant: t('weather.windy_variant'),
  exceptional: t('weather.exceptional'),
}))

const CONDITION_ICONS: Record<string, string> = {
  sunny: 'mdi-weather-sunny', clear_night: 'mdi-weather-night',
  partlycloudy: 'mdi-weather-partly-cloudy', cloudy: 'mdi-weather-cloudy',
  fog: 'mdi-weather-fog', hail: 'mdi-weather-hail',
  lightning: 'mdi-weather-lightning', lightning_rainy: 'mdi-weather-lightning-rainy',
  pouring: 'mdi-weather-pouring', rainy: 'mdi-weather-rainy',
  snowy: 'mdi-weather-snowy', snowy_rainy: 'mdi-weather-snowy-rainy',
  windy: 'mdi-weather-windy', windy_variant: 'mdi-weather-windy-variant',
  exceptional: 'mdi-weather-tornado',
}

const CONDITION_COLORS: Record<string, string> = {
  sunny: '#f59e0b', clear_night: '#818cf8', partlycloudy: '#94a3b8',
  cloudy: '#94a3b8', fog: '#94a3b8', rainy: '#60a5fa', pouring: '#3b82f6',
  lightning: '#facc15', lightning_rainy: '#facc15', snowy: '#bae6fd',
  snowy_rainy: '#93c5fd', windy: '#a3e635', windy_variant: '#a3e635',
  hail: '#94a3b8', exceptional: '#f87171',
}

type ForecastEntry = { datetime: string; condition: string; temperature: number; templow?: number }

const props = defineProps<{ config: WeatherWidgetConfig }>()
const entityStore = useEntityStore()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const state = computed(() => entity.value?.state ?? 'unknown')
const temp = computed(() => entity.value?.attributes?.temperature as number | undefined)

const conditionLabel = computed(() => (CONDITION_LABELS.value as Record<string, string>)[state.value] ?? state.value)
const conditionIcon = computed(() => CONDITION_ICONS[state.value] ?? 'mdi-weather-cloudy')
const iconColor = computed(() => CONDITION_COLORS[state.value] ?? '#94a3b8')

const forecastRows = computed(() => props.config.forecast_rows ?? 3)

// Fetch forecast from server (HA deprecated forecast in attributes)
const forecast = ref<ForecastEntry[]>([])
const forecastError = ref('')
async function fetchForecast() {
  if (!props.config.entity_id) return
  forecastError.value = ''
  try {
    const data = await $fetch<ForecastEntry[]>(`/api/ha/weather-forecast?entityId=${encodeURIComponent(props.config.entity_id)}`)
    forecast.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    forecastError.value = e?.message ?? 'Fehler'
    console.error('weather forecast:', e)
  }
}
onMounted(fetchForecast)
watch(() => props.config.entity_id, fetchForecast)

const visibleForecast = computed(() => forecast.value.slice(0, forecastRows.value))

// All forecast temps for relative bar scaling
const allTemps = computed(() => (forecast.value ?? []).slice(0, forecastRows.value).flatMap(f => [f.temperature, f.templow ?? f.temperature]))
const globalMin = computed(() => Math.min(...allTemps.value))
const globalMax = computed(() => Math.max(...allTemps.value))

function tempBarStyle(f: { temperature: number; templow?: number }) {
  const range = globalMax.value - globalMin.value || 1
  const low = f.templow ?? f.temperature

  const left = ((low - globalMin.value) / range) * 100
  const width = ((f.temperature - low) / range) * 100

  // Warmness-Faktor (0 bis 1)
  const warmness = (f.temperature - globalMin.value) / range

  /**
   * HUE (Farbton): 
   * 220° ist ein schönes Blau.
   * 40° ist ein warmes Gold/Orange.
   * Wir rechnen: Startwert - (Differenz * warmness)
   */
  const h = Math.round(220 - (warmness * 180)) // Von 220 (Blau) runter auf 40 (Orange)
  const s = 70 // Sättigung in % (konstant für kräftige, aber nicht grelle Farben)
  const l = 60 // Helligkeit in % (konstant für gute Lesbarkeit)

  return {
    marginLeft: `${left}%`,
    width: `${Math.max(width, 8)}%`,
    backgroundColor: `hsl(${h}, ${s}%, ${l}%)`,
    borderRadius: '4px'
  }
}

function conditionColor(condition: string) {
  return CONDITION_COLORS[condition] ?? '#94a3b8'
}

function formatDay(datetime: string) {
  return new Date(datetime).toLocaleDateString(locale.value, { weekday: 'short' })
}

// Live clock
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(timer))

const currentTime = computed(() =>
  now.value.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
)
const currentDate = computed(() =>
  now.value.toLocaleDateString(locale.value, { day: 'numeric', month: 'numeric', year: 'numeric' })
)
</script>
