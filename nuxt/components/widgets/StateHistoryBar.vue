<template>
  <div class="history-bar-wrap">
    <!-- Segments -->
    <div class="history-bar">
      <div
        v-for="(seg, i) in segments" :key="i"
        class="history-seg"
        :style="{ width: seg.pct + '%', background: colorFor(seg.state) }"
        :title="seg.state"
      />
    </div>

    <!-- Time labels -->
    <div class="history-ticks">
      <div v-for="tick in ticks" :key="tick.label" class="history-tick" :style="{ left: tick.pct + '%' }">
        {{ tick.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  entityId: string
  hours?: number
  activeColor?: string
}>()

interface Segment { state: string; pct: number }

const segments = ref<Segment[]>([])
const ticks = ref<{ label: string; pct: number }[]>([])

const ACTIVE_STATES = new Set(['on', 'open', 'unlocked', 'playing', 'home', 'heating', 'cooling', 'drying'])

function colorFor(state: string): string {
  if (state === 'unavailable' || state === 'unknown') return 'rgba(255,80,80,0.25)'
  if (ACTIVE_STATES.has(state)) return props.activeColor ?? 'rgb(var(--v-theme-warning))'
  return 'rgba(255,255,255,0.15)'
}

function buildTicks(start: number, end: number) {
  const total = end - start
  const result: { label: string; pct: number }[] = []
  // aim for ~4 ticks
  const intervalMs = total / 4
  for (let i = 1; i < 4; i++) {
    const t = new Date(start + i * intervalMs)
    const label = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    result.push({ label, pct: (i / 4) * 100 })
  }
  return result
}

async function load() {
  if (!props.entityId) return
  const hours = props.hours ?? 12
  try {
    const data = await $fetch<Array<{ state: string; last_changed: string }>>(
      `/api/ha/history?entityId=${encodeURIComponent(props.entityId)}&period=${hours}h`
    )
    if (!data?.length) return

    const now = Date.now()
    const startMs = now - hours * 3600_000
    const totalMs = now - startMs

    // build segments
    const segs: Segment[] = []
    for (let i = 0; i < data.length; i++) {
      const segStart = Math.max(new Date(data[i].last_changed).getTime(), startMs)
      const segEnd = i < data.length - 1 ? new Date(data[i + 1].last_changed).getTime() : now
      const pct = ((segEnd - segStart) / totalMs) * 100
      if (pct > 0) segs.push({ state: data[i].state, pct })
    }
    segments.value = segs
    ticks.value = buildTicks(startMs, now)
  } catch { /* silently ignore */ }
}

onMounted(load)
watch(() => props.entityId, load)
</script>

<style scoped>
.history-bar-wrap {
  position: relative;
  padding-bottom: 16px;
}

.history-bar {
  display: flex;
  height: 20px;
  border-radius: 4px;
  overflow: hidden;
  gap: 1px;
  background: rgba(255, 255, 255, 0.06);
}

.history-seg {
  height: 100%;
  min-width: 1px;
  transition: opacity 0.15s;
}

.history-seg:hover {
  opacity: 0.8;
}

.history-ticks {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 14px;
}

.history-tick {
  position: absolute;
  transform: translateX(-50%);
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}
</style>
