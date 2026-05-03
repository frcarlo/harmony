<template>
  <div class="h-100 d-flex flex-column align-center justify-center pa-4 text-center clock-widget" :class="{ 'clock-widget--led': isLed }">
    <div class="font-weight-bold font-monospace clock-widget__time">{{ timeStr }}</div>
    <div v-if="config.show_date !== false" class="text-body-2 text-medium-emphasis mt-1 clock-widget__date">{{ dateStr }}</div>
  </div>
</template>

<script setup lang="ts">
import type { ClockWidgetConfig } from '~/types/dashboard'

const props = defineProps<{ config: ClockWidgetConfig }>()
const now = ref(new Date())
const isLed = computed(() => props.config.style === 'led')

onMounted(() => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const tick = () => {
    now.value = new Date()
    const updateMs = props.config.show_seconds === false ? 60_000 - (now.value.getSeconds() * 1000 + now.value.getMilliseconds()) : 1_000
    timer = setTimeout(tick, Math.max(250, updateMs))
  }
  tick()
  onUnmounted(() => { if (timer) clearTimeout(timer) })
})

const timeStr = computed(() => now.value.toLocaleTimeString('de-DE', {
  hour: '2-digit',
  minute: '2-digit',
  ...(props.config.show_seconds !== false ? { second: '2-digit' as const } : {}),
  hour12: props.config.format_24h === false,
  timeZone: props.config.timezone,
}))
const dateStr = computed(() => now.value.toLocaleDateString('de-DE', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: props.config.timezone,
}))
</script>

<style scoped>
.clock-widget__time {
  font-size: clamp(1.4rem, 5vw, 3rem);
  line-height: 1;
}

.clock-widget--led .clock-widget__time {
  color: #ffd08a;
  text-shadow:
    0 0 6px rgba(255, 208, 138, 0.35),
    0 0 18px rgba(255, 208, 138, 0.18);
  letter-spacing: 0.04em;
}

.clock-widget--led .clock-widget__date {
  color: rgba(255, 208, 138, 0.82) !important;
}
</style>
