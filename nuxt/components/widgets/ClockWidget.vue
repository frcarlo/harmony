<template>
  <div class="h-100 d-flex flex-column align-center justify-center pa-4 text-center">
    <div class="font-weight-bold font-monospace" style="font-size: clamp(1.4rem,5vw,3rem)">{{ timeStr }}</div>
    <div v-if="config.show_date !== false" class="text-body-2 text-medium-emphasis mt-1">{{ dateStr }}</div>
  </div>
</template>

<script setup lang="ts">
import type { ClockWidgetConfig } from '~/types/dashboard'

const props = defineProps<{ config: ClockWidgetConfig }>()
const now = ref(new Date())

onMounted(() => {
  const interval = setInterval(() => { now.value = new Date() }, 1000)
  onUnmounted(() => clearInterval(interval))
})

const timeStr = computed(() => now.value.toLocaleTimeString('de-DE', {
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: props.config.format_24h === false,
  timeZone: props.config.timezone,
}))
const dateStr = computed(() => now.value.toLocaleDateString('de-DE', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: props.config.timezone,
}))
</script>
