<template>
  <div class="h-100 d-flex flex-column pa-3 ga-2 vacuum-card" :class="`vacuum-card--${stateKey}`">
    <div class="ambient" />

    <!-- Header -->
    <div class="d-flex align-center ga-2 vacuum-header">
      <v-icon icon="mdi-robot-vacuum" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="vacuum-name">{{ name }}</span>
      <v-chip
        size="x-small"
        rounded="pill"
        variant="tonal"
        :color="stateColor"
        class="flex-shrink-0"
      >
        {{ stateLabel }}
      </v-chip>
    </div>

    <!-- Center -->
    <div class="d-flex flex-column align-center justify-center flex-grow-1 ga-1">
      <div class="vacuum-icon-wrap" :class="`vacuum-icon-wrap--${stateKey}`">
        <v-icon icon="mdi-robot-vacuum" :size="44" :color="stateColor" />
      </div>
      <div v-if="batteryLevel !== null" class="d-flex align-center ga-1 mt-1">
        <v-icon :icon="batteryIcon" size="14" color="medium-emphasis" />
        <span class="text-caption text-medium-emphasis">{{ batteryLevel }}%</span>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="!isUnavailable" class="d-flex ga-2">
      <template v-if="stateKey === 'cleaning'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" :disabled="busy" @click="callService('vacuum', 'pause')">
          {{ t('vacuum.action.pause') }}
        </v-btn>
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" :disabled="busy" @click="callService('vacuum', 'stop')">
          {{ t('vacuum.action.stop') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'paused'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="primary" :disabled="busy" @click="callService('vacuum', 'start')">
          {{ t('vacuum.action.resume') }}
        </v-btn>
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" :disabled="busy" @click="callService('vacuum', 'return_to_base')">
          {{ t('vacuum.action.return') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'docked' || stateKey === 'idle'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="primary" :disabled="busy" @click="callService('vacuum', 'start')">
          {{ t('vacuum.action.start') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'returning'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" :disabled="busy" @click="callService('vacuum', 'stop')">
          {{ t('vacuum.action.stop') }}
        </v-btn>
      </template>
      <template v-else-if="stateKey === 'error'">
        <v-btn variant="tonal" size="small" rounded="lg" class="flex-grow-1 text-none" color="error" :disabled="busy" @click="callService('vacuum', 'return_to_base')">
          {{ t('vacuum.action.return') }}
        </v-btn>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VacuumWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: VacuumWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string | undefined) ?? props.config.entity_id)
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const stateKey = computed(() => isUnavailable.value ? 'unavailable' : (entity.value?.state ?? 'unavailable'))
const batteryLevel = computed(() => {
  const raw = entity.value?.attributes?.battery_level
  if (raw == null) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
})
const batteryIcon = computed(() => {
  const lvl = batteryLevel.value
  if (lvl === null) return 'mdi-battery'
  if (lvl >= 90) return 'mdi-battery'
  if (lvl >= 70) return 'mdi-battery-70'
  if (lvl >= 50) return 'mdi-battery-50'
  if (lvl >= 30) return 'mdi-battery-30'
  return 'mdi-battery-alert'
})

const stateColor = computed(() => {
  switch (stateKey.value) {
    case 'cleaning': return 'primary'
    case 'returning': return 'warning'
    case 'docked': return 'success'
    case 'paused': return 'warning'
    case 'error': return 'error'
    case 'idle': return undefined
    default: return undefined
  }
})

const stateLabel = computed(() => {
  if (isUnavailable.value) return t('common.unavailable')
  const key = `vacuum.state.${stateKey.value}`
  const tr = t(key)
  return tr === key ? stateKey.value : tr
})

const busy = ref(false)

async function callService(domain: string, service: string) {
  if (busy.value || isUnavailable.value) return
  busy.value = true
  try {
    await client.callService({ domain, service, target: { entity_id: props.config.entity_id } })
  } finally {
    window.setTimeout(() => { busy.value = false }, 500)
  }
}
</script>

<style scoped>
.vacuum-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
  border-radius: inherit;
}

.vacuum-card--cleaning .ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(var(--v-theme-primary), 0.10) 0%, transparent 70%);
}

.vacuum-card--docked .ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(var(--v-theme-success), 0.08) 0%, transparent 70%);
}

.vacuum-card--returning .ambient,
.vacuum-card--paused .ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(var(--v-theme-warning), 0.09) 0%, transparent 70%);
}

.vacuum-card--error .ambient {
  background: radial-gradient(ellipse 80% 70% at 50% 0%, rgba(var(--v-theme-error), 0.10) 0%, transparent 70%);
}

.vacuum-header,
.vacuum-card > .d-flex {
  position: relative;
  z-index: 1;
}

.vacuum-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.vacuum-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
  transition: background 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  z-index: 1;
}

.vacuum-icon-wrap--cleaning {
  background: rgba(var(--v-theme-primary), 0.12);
  box-shadow: 0 0 0 6px rgba(var(--v-theme-primary), 0.06);
  animation: vacuum-spin 4s linear infinite;
}

.vacuum-icon-wrap--returning {
  background: rgba(var(--v-theme-warning), 0.12);
  box-shadow: 0 0 0 6px rgba(var(--v-theme-warning), 0.06);
}

.vacuum-icon-wrap--docked {
  background: rgba(var(--v-theme-success), 0.10);
}

.vacuum-icon-wrap--error {
  background: rgba(var(--v-theme-error), 0.12);
  animation: vacuum-alert 1s ease-in-out infinite;
}

@keyframes vacuum-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes vacuum-alert {
  0%, 100% { box-shadow: 0 0 0 4px rgba(var(--v-theme-error), 0.08); }
  50% { box-shadow: 0 0 0 10px rgba(var(--v-theme-error), 0.04); }
}
</style>
