<template>
  <div class="h-100 d-flex flex-column pa-3">
    <!-- Header: title + current time -->
    <div class="d-flex align-center justify-space-between mb-2">
      <div class="d-flex align-center ga-2">
        <v-icon icon="mdi-calendar-today" size="14" color="medium-emphasis" />
        <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
      </div>
      <span v-if="props.config.show_time !== false" class="text-caption font-weight-medium tabular-nums">{{ currentTime }}</span>
    </div>

    <!-- Navigation -->
    <div class="d-flex align-center justify-space-between mb-2">
      <v-btn icon="mdi-chevron-left" size="x-small" variant="text" density="compact" @click="changeOffset(-1)" />
      <div class="d-flex align-center ga-1">
        <span class="text-caption text-medium-emphasis">{{ rangeLabel }}</span>
        <v-btn v-if="dayOffset !== 0" size="x-small" variant="tonal" density="compact" color="primary" class="ml-1" @click="dayOffset = 0">Heute</v-btn>
      </div>
      <v-btn icon="mdi-chevron-right" size="x-small" variant="text" density="compact" @click="changeOffset(1)" />
    </div>

    <!-- Events grouped by day -->
    <div class="flex-grow-1 overflow-y-auto">
      <div v-if="loading" class="h-100 d-flex align-center justify-center">
        <v-progress-circular indeterminate size="20" />
      </div>

      <div v-else-if="!groupedEvents.some(g => g.events.length > 0)" class="text-caption text-medium-emphasis text-center pt-4">
        Keine Termine im Zeitraum
      </div>

      <template v-else>
        <div v-for="group in groupedEvents.filter(g => g.events.length > 0)" :key="group.dateKey" class="mb-3">
          <!-- Day header -->
          <div class="d-flex align-center ga-2 mb-1">
            <span class="text-caption font-weight-bold" :class="group.isToday ? 'text-primary' : 'text-medium-emphasis'">
              {{ group.label }}
            </span>
            <v-divider />
          </div>

          <!-- Events for this day -->
          <div
            v-for="event in group.events"
            :key="(event.uid ?? event.summary) + group.dateKey"
            class="d-flex align-start ga-2 pa-2 rounded mb-1"
            style="background: rgba(var(--v-theme-surface-variant), 0.5)"
          >
            <div class="d-flex flex-column align-center" style="min-width: 40px">
              <span class="text-caption font-weight-medium tabular-nums">{{ formatStart(event) }}</span>
              <span v-if="!event.allDay && formatEnd(event)" class="text-caption text-medium-emphasis tabular-nums">{{ formatEnd(event) }}</span>
            </div>
            <div class="flex-grow-1 overflow-hidden">
              <div class="text-body-2 font-weight-medium text-truncate">{{ event.summary }}</div>
              <div v-if="event.location" class="text-caption text-medium-emphasis text-truncate">
                <v-icon icon="mdi-map-marker" size="10" class="mr-1" />{{ event.location }}
              </div>
            </div>
            <v-chip v-if="event.allDay" size="x-small" variant="tonal" color="primary">Ganztag</v-chip>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CalendarWidgetConfig } from '~/types/dashboard'

interface CalendarEvent {
  summary: string
  uid?: string
  location?: string
  allDay?: boolean
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

const props = defineProps<{ config: CalendarWidgetConfig }>()
const entityStore = useEntityStore()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const days = computed(() => props.config.days ?? 1)

// Clock
const now = ref(new Date())
let clockTimer: ReturnType<typeof setInterval>
onMounted(() => { clockTimer = setInterval(() => { now.value = new Date() }, 1000) })
onUnmounted(() => clearInterval(clockTimer))
const currentTime = computed(() =>
  now.value.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
)

// Navigation — offset in steps of `days`
const dayOffset = ref(0)

const startDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset.value)
  d.setHours(0, 0, 0, 0)
  return d
})

function changeOffset(direction: number) {
  dayOffset.value += direction * days.value
}

const rangeLabel = computed(() => {
  if (days.value === 1) {
    if (dayOffset.value === 0) return startDate.value.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
    if (dayOffset.value === 1) return 'Morgen, ' + startDate.value.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    if (dayOffset.value === -1) return 'Gestern, ' + startDate.value.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })
    return startDate.value.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })
  }
  const end = new Date(startDate.value)
  end.setDate(end.getDate() + days.value - 1)
  return `${startDate.value.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`
})

// Events
const allEvents = ref<CalendarEvent[]>([])
const loading = ref(true)

watch([dayOffset, days], fetchEvents)
onMounted(fetchEvents)

async function fetchEvents() {
  if (!props.config.entity_id) return
  loading.value = true
  try {
    const dateStr = startDate.value.toISOString().split('T')[0]
    const data = await $fetch<CalendarEvent[]>(
      `/api/ha/calendar?entityId=${encodeURIComponent(props.config.entity_id)}&date=${dateStr}&days=${days.value}`
    )
    allEvents.value = data ?? []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// Group events by day
const groupedEvents = computed(() => {
  const todayKey = new Date().toISOString().split('T')[0]
  const groups = []
  for (let i = 0; i < days.value; i++) {
    const d = new Date(startDate.value)
    d.setDate(d.getDate() + i)
    const dateKey = d.toISOString().split('T')[0]
    const label = days.value === 1
      ? ''
      : d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
    const dayEvents = allEvents.value.filter((e) => {
      const eDate = (e.start.dateTime ?? e.start.date ?? '').slice(0, 10)
      return eDate === dateKey
    }).sort((a, b) => {
      const ta = a.start.dateTime ?? a.start.date ?? ''
      const tb = b.start.dateTime ?? b.start.date ?? ''
      return ta.localeCompare(tb)
    })
    groups.push({ dateKey, label, isToday: dateKey === todayKey, events: dayEvents })
  }
  // For single day, only show if there are events (no empty state per group)
  return days.value === 1 ? groups : groups
})

const hasAnyEvent = computed(() => groupedEvents.value.some((g) => g.events.length > 0))

function formatStart(e: CalendarEvent): string {
  if (e.allDay || !e.start.dateTime) return ''
  return new Date(e.start.dateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
function formatEnd(e: CalendarEvent): string {
  if (!e.end?.dateTime) return ''
  return new Date(e.end.dateTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}
</script>
