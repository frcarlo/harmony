<template>
  <div class="h-100 d-flex flex-column overflow-hidden calv2" :class="{ 'calv2-glass': glass }">
    <!-- Header: nav + view toggle -->
    <div class="d-flex align-center px-2 pt-1 pb-1 ga-1 flex-shrink-0">
      <v-btn icon="mdi-chevron-left" size="x-small" variant="text" density="compact" @click="calRef?.prev()" />
      <div class="text-caption font-weight-medium text-center flex-grow-1 text-truncate cursor-pointer"
        @click="goToday">{{ calRef?.title ?? periodLabel }}</div>
      <v-btn icon="mdi-chevron-right" size="x-small" variant="text" density="compact" @click="calRef?.next()" />
      <v-divider vertical class="mx-1 align-self-center" style="height:14px" />
      <v-btn-toggle v-model="currentType" mandatory density="compact" variant="tonal" rounded="lg" class="calv2-toggle">
        <v-btn value="day" size="x-small" class="text-none" style="min-width:28px">{{ t('calendar_v2.day') }}</v-btn>
        <v-btn value="week" size="x-small" class="text-none" style="min-width:28px">{{ t('calendar_v2.week') }}</v-btn>
        <v-btn value="month" size="x-small" class="text-none" style="min-width:36px">{{ t('calendar_v2.month') }}</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Calendar -->
    <div class="flex-grow-1 overflow-hidden position-relative">
      <v-progress-linear v-if="loading" indeterminate absolute top color="primary" height="2" />
      <VCalendar
        ref="calRef"
        v-model="focusDateStr"
        :type="currentType"
        :events="calendarEvents"
        :weekdays="[1,2,3,4,5,6,0]"
        class="calv2-cal h-100"
        @change="onRangeChange"
      >
        <template #event="{ event }">
          <div class="calv2-event-slot" @click.stop="onEventClick(event as CalEvent)">
            {{ (event as CalEvent).name }}
          </div>
        </template>
      </VCalendar>
    </div>

    <!-- Calendar legend (if multiple) -->
    <div v-if="legendItems.length > 1" class="d-flex flex-wrap ga-1 px-2 pb-1 flex-shrink-0">
      <div v-for="item in legendItems" :key="item.id" class="d-flex align-center ga-1">
        <div class="calv2-dot" :style="{ background: item.cssColor }" />
        <span class="text-caption text-disabled" style="font-size:0.62rem">{{ item.name }}</span>
      </div>
    </div>

    <!-- Event detail dialog -->
    <v-dialog v-model="dialog" max-width="360" @mousedown.stop>
      <v-card v-if="selectedEvent" rounded="xl" class="calv2-detail-card">
        <div class="calv2-detail-bar" :style="{ background: selectedEvent.color }" />
        <v-card-text class="pt-4 pb-3">
          <div class="text-body-1 font-weight-semibold mb-2">{{ selectedEvent.name }}</div>
          <div class="d-flex align-center ga-2 text-caption text-medium-emphasis">
            <v-icon icon="mdi-clock-outline" size="14" />
            <span>{{ formatEventTime(selectedEvent) }}</span>
          </div>
          <div v-if="selectedEvent.description" class="text-caption text-medium-emphasis mt-2">
            {{ selectedEvent.description }}
          </div>
          <div v-if="selectedEvent.location" class="d-flex align-center ga-2 text-caption text-medium-emphasis mt-1">
            <v-icon icon="mdi-map-marker-outline" size="14" />
            <span>{{ selectedEvent.location }}</span>
          </div>
        </v-card-text>
        <v-card-actions class="pt-0 pb-3 px-4">
          <v-spacer />
          <v-btn variant="tonal" size="small" @click="dialog = false">{{ t('common.close') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { VCalendar } from 'vuetify/components'
import type { CalendarV2WidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const props = defineProps<{ config: CalendarV2WidgetConfig }>()
const entityStore = useEntityStore()
const { glass } = useGlassEffect()

// --- View & navigation ---
type CalType = 'day' | 'week' | 'month'
const currentType = ref<CalType>(props.config.view ?? 'month')
const calRef = ref<InstanceType<typeof VCalendar> | null>(null)

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}
const focusDateStr = ref(toDateStr(new Date()))

function goToday() {
  focusDateStr.value = toDateStr(new Date())
}

function scrollToNow() {
  if (currentType.value !== 'day' && currentType.value !== 'week') return
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  nextTick(() => calRef.value?.scrollToTime(time))
}

watch(currentType, scrollToNow)
onMounted(() => nextTick(scrollToNow))

// --- Period label fallback ---
const periodLabel = computed(() => {
  const d = new Date(focusDateStr.value)
  const loc = locale.value
  if (currentType.value === 'day') return d.toLocaleDateString(loc, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
  return d.toLocaleDateString(loc, { month: 'long', year: 'numeric' })
})

// --- Events fetch ---
const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#f97316', '#14b8a6']

interface HAEvent {
  summary: string
  start: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  description?: string
  location?: string
}
interface CalEvent {
  name: string
  start: string
  end: string
  color: string
  timed: boolean
  description?: string
  location?: string
}

const rawEvents = ref<CalEvent[]>([])
const loading = ref(false)
let currentStart = ''
let currentEnd = ''

async function fetchForRange(start: string, end: string) {
  const calendars = (props.config.calendars ?? []).filter(Boolean)
  if (!calendars.length) { rawEvents.value = []; return }
  currentStart = start
  currentEnd = end
  loading.value = true
  try {
    const results = await Promise.all(
      calendars.map((id, idx) =>
        $fetch<HAEvent[]>('/api/ha/calendar-range', { params: { entityId: id, start: start + 'T00:00:00', end: end + 'T23:59:59' } })
          .then(evs => evs.map(e => {
            const timed = !!e.start.dateTime
            const s = timed ? e.start.dateTime!.slice(0, 16).replace('T', ' ') : e.start.date!
            const en = timed ? (e.end?.dateTime ?? e.start.dateTime)!.slice(0, 16).replace('T', ' ') : (e.end?.date ?? e.start.date)!
            return {
              name: e.summary,
              start: s,
              end: en,
              color: props.config.calendar_colors?.[idx] ?? COLORS[idx % COLORS.length],
              timed,
              description: e.description,
              location: e.location,
            } as CalEvent
          }))
          .catch(() => [] as CalEvent[])
      )
    )
    rawEvents.value = results.flat()
  } finally {
    loading.value = false
  }
}

function onRangeChange(range: { start: { date: string }; end: { date: string } }) {
  fetchForRange(range.start.date, range.end.date)
}

watch(() => props.config.calendars, () => {
  if (currentStart) fetchForRange(currentStart, currentEnd)
}, { deep: true })

const calendarEvents = computed(() => rawEvents.value)

// --- Event detail dialog ---
const dialog = ref(false)
const selectedEvent = ref<CalEvent | null>(null)

function onEventClick(event: CalEvent) {
  selectedEvent.value = event
  dialog.value = true
}

function formatEventTime(ev: CalEvent): string {
  if (!ev.timed) return t('calendar_v2.all_day')
  const fmt = (s: string) => {
    const d = new Date(s.replace(' ', 'T'))
    return d.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' })
  }
  const startDate = new Date(ev.start.replace(' ', 'T'))
  const endDate = new Date(ev.end.replace(' ', 'T'))
  const sameDay = startDate.toDateString() === endDate.toDateString()
  const dateStr = startDate.toLocaleDateString(locale.value, { weekday: 'short', day: 'numeric', month: 'short' })
  return sameDay
    ? `${dateStr}, ${fmt(ev.start)} – ${fmt(ev.end)}`
    : `${dateStr} ${fmt(ev.start)} – ${new Date(ev.end.replace(' ', 'T')).toLocaleDateString(locale.value, { day: 'numeric', month: 'short' })} ${fmt(ev.end)}`
}

// --- Legend ---
const legendItems = computed(() =>
  (props.config.calendars ?? []).filter(Boolean).map((id, idx) => ({
    id,
    name: entityStore.entities[id]?.attributes?.friendly_name as string ?? id,
    cssColor: props.config.calendar_colors?.[idx] ?? COLORS[idx % COLORS.length],
  }))
)
</script>

<style scoped>
.calv2 :deep(.v-calendar) {
  background: transparent !important;
  border: none !important;
}

.calv2 :deep(.v-calendar-monthly) {
  background: transparent !important;
}

.calv2 :deep(.v-calendar-daily) {
  background: transparent !important;
}

.calv2 :deep(.v-calendar-weekly__day) {
  border-color: rgba(var(--v-border-color), 0.08) !important;
}

.calv2 :deep(.v-calendar-weekly__day.v-outside) {
  background: transparent !important;
  opacity: 0.35;
}

.calv2 :deep(.v-calendar-daily__intervals-body),
.calv2 :deep(.v-calendar-daily__day-container) {
  background: transparent !important;
}

.calv2 :deep(.v-event) {
  font-size: 0.7rem;
  cursor: pointer;
}

.calv2-event-slot {
  width: 100%;
  height: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 2px;
  cursor: pointer;
}

.calv2-toggle :deep(.v-btn) {
  font-size: 0.68rem !important;
  padding: 0 6px !important;
}

.calv2-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.calv2-detail-card {
  overflow: hidden;
}

.calv2-detail-bar {
  height: 4px;
  width: 100%;
}
</style>
