<template>
  <div
    class="lock-card h-100 d-flex flex-column"
    :class="`lock-s-${lockState}`"
  >
    <!-- Ambient state glow -->
    <div class="lock-ambient" />

    <!-- Header -->
    <div class="lock-header">
      <v-icon icon="mdi-lock" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="lock-name">{{ name }}</span>
      <v-btn
        v-if="showDoorButton && !confirmingDoor"
        icon="mdi-door-open"
        variant="text"
        size="x-small"
        :disabled="isUnavailable"
        :title="t('door.open')"
        @click="confirmingDoor = true"
      />
    </div>

    <!-- Center: icon + state info -->
    <div class="lock-center flex-grow-1 d-flex align-center ga-3">
      <div class="lock-icon-wrap flex-shrink-0">
        <v-icon
          :icon="lockIcon"
          size="34"
          :color="lockColor"
          :class="{ 'lock-spin': isAnimating }"
        />
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="lock-state-label" :class="stateLabelColor">{{ stateLabel }}</div>
        <div class="d-flex align-center ga-2 mt-1">
          <v-btn
            v-if="doorSensor"
            :icon="isDoorOpen ? sensorOpenIcon : sensorClosedIcon"
            :color="isDoorOpen ? 'warning' : 'success'"
            :variant="isDoorOpen ? 'tonal' : 'text'"
            size="x-small"
            rounded="circle"
            density="comfortable"
            :title="isDoorOpen ? t('lock.door_open') : t('lock.door_closed')"
            @click.stop="sensorDialogOpen = true"
          />
          <span class="lock-last-changed">{{ lastChanged }}</span>
        </div>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="d-flex ga-2">
      <template v-if="!confirming && !confirmingDoor">
        <v-btn
          :prepend-icon="toggleIcon"
          :text="toggleLabel"
          variant="tonal"
          :color="toggleColor"
          rounded="lg"
          size="small"
          class="flex-grow-1 text-none"
          :disabled="isToggleDisabled"
          @click="handleToggle"
        />
      </template>
      <template v-else-if="confirming">
        <v-btn :text="t('common.cancel')" variant="tonal" size="small" class="flex-grow-1 text-none" @click="confirming = false" />
        <v-btn prepend-icon="mdi-check" :text="t('common.confirm')" variant="tonal" color="warning" size="small" class="flex-grow-1 text-none" @click="doAction" />
      </template>
      <template v-else-if="confirmingDoor">
        <v-btn :text="t('common.cancel')" variant="tonal" size="small" class="flex-grow-1 text-none" @click="confirmingDoor = false" />
        <v-btn prepend-icon="mdi-door-open" :text="t('door.open')" variant="tonal" color="warning" size="small" class="flex-grow-1 text-none" @click="openDoorAction" />
      </template>
    </div>
  </div>

  <LazyEntityDetailDialog
    v-if="sensorDialogOpen && props.config.door_sensor_entity"
    v-model="sensorDialogOpen"
    :entity-id="props.config.door_sensor_entity"
    icon="mdi-door-open"
    active-color="warning"
    active-state="on"
  />
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/it'
import type { LockWidgetConfig } from '~/types/dashboard'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const { glass } = useGlassEffect()
defineOptions({ inheritAttrs: false })
const props = defineProps<{ config: LockWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? entity.value?.attributes?.friendly_name ?? 'Lock')
const lockState = computed(() => entity.value?.state ?? 'unavailable')
const isLocked = computed(() => lockState.value === 'locked')
const isTransitioning = computed(() => ['locking', 'unlocking', 'opening'].includes(lockState.value))
const isJammed = computed(() => lockState.value === 'jammed')
const isUnavailable = computed(() => !entity.value || lockState.value === 'unavailable')
const lockType = computed(() => props.config.lock_type ?? 'lock')
const isGate = computed(() => lockType.value === 'gate')
const doorSensor = computed(() => props.config.door_sensor_entity ? entityStore.entities[props.config.door_sensor_entity] : undefined)
const isDoorOpen = computed(() => { const s = doorSensor.value?.state; return s === 'on' || s === 'open' || s === 'unlocked' })
const sensorOpenIcon = computed(() => lockType.value === 'gate' ? 'mdi-garage-open' : 'mdi-door-open')
const sensorClosedIcon = computed(() => lockType.value === 'gate' ? 'mdi-garage' : 'mdi-door-closed')
const supportsDoorOpen = computed(() => ((entity.value?.attributes?.supported_features as number) ?? 0) & 1)
const showDoorButton = computed(() => !!supportsDoorOpen.value && props.config.show_door_button !== false)
const sensorDialogOpen = ref(false)
const confirming = ref(false)
const confirmingDoor = ref(false)

const isPending = ref(false)
let pendingTimer: ReturnType<typeof setTimeout> | null = null
const lastGateService = ref<'lock' | 'unlock' | 'open' | null>(null)
function clearPending() {
  isPending.value = false
  if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
}
function setPending(service?: 'lock' | 'unlock' | 'open') {
  isPending.value = true
  if (isGate.value && service) lastGateService.value = service
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = setTimeout(clearPending, isGate.value ? 35_000 : 20_000)
}
const isAnimating = computed(() => isTransitioning.value || isPending.value)
const isGateMoving = computed(() => isGate.value && (isTransitioning.value || isPending.value))

const lockIcon = computed(() => {
  switch (lockState.value) {
    case 'locked': return props.config.locked_icon ?? 'mdi-lock'
    case 'locking': return 'mdi-lock-clock'
    case 'unlocking': return props.config.unlocked_icon ?? 'mdi-lock-open-variant'
    case 'unlocked': return props.config.unlocked_icon ?? 'mdi-lock-open-variant'
    case 'open': return props.config.unlocked_icon ?? 'mdi-lock-open'
    case 'opening': return props.config.unlocked_icon ?? 'mdi-door-open'
    case 'jammed': return 'mdi-lock-alert'
    default: return props.config.locked_icon ?? 'mdi-lock-question'
  }
})
const lockColor = computed(() => {
  switch (lockState.value) {
    case 'locked': return 'success'
    case 'locking': case 'unlocking': case 'opening': return 'primary'
    case 'open': return 'info'
    case 'jammed': return 'error'
    default: return 'warning'
  }
})
const stateLabel = computed(() => {
  if (isGateMoving.value) return isTransitioning.value ? t(`lock.state.${lockState.value}`) : t('lock.state.moving')
  if (isGate.value && doorSensor.value) return isDoorOpen.value ? t('lock.type.gate.unlocked') : t('lock.type.gate.locked')
  switch (lockState.value) {
    case 'locked': return t(`lock.type.${lockType.value}.locked`)
    case 'unlocked': return t(`lock.type.${lockType.value}.unlocked`)
    default: return t(`lock.state.${lockState.value}`, lockState.value)
  }
})
const stateLabelColor = computed(() => {
  if (lockState.value === 'locked') return 'text-success'
  if (isJammed.value) return 'text-error'
  if (isTransitioning.value || isGateMoving.value) return 'text-primary'
  return 'text-warning'
})
const gateOpenService = computed<'unlock' | 'open'>(() => supportsDoorOpen.value ? 'open' : 'unlock')
const nextService = computed<'lock' | 'unlock' | 'open'>(() => isLocked.value ? gateOpenService.value : 'lock')
const stopService = computed<'lock' | 'unlock' | 'open'>(() => {
  if (lastGateService.value) return lastGateService.value
  if (lockState.value === 'locking') return 'lock'
  if (lockState.value === 'unlocking' || lockState.value === 'opening') return gateOpenService.value
  return nextService.value
})
const toggleIcon = computed(() => {
  if (isGateMoving.value) return 'mdi-stop'
  return isLocked.value ? (props.config.unlocked_icon ?? 'mdi-lock-open-variant') : (props.config.locked_icon ?? 'mdi-lock')
})
const toggleLabel = computed(() => isGateMoving.value ? t('cover_detail.stop') : (isLocked.value ? t(`lock.type.${lockType.value}.do_unlock`) : t(`lock.type.${lockType.value}.do_lock`)))
const toggleColor = computed(() => isGateMoving.value ? 'warning' : (isLocked.value ? 'primary' : 'warning'))
const isToggleDisabled = computed(() => isUnavailable.value || (!isGate.value && isTransitioning.value) || isJammed.value)

const now = useNow({ interval: 60_000 })
const lastChanged = computed(() => {
  void now.value
  const ts = entity.value?.last_changed
  if (!ts) return '–'
  return dayjs(ts).locale(locale.value).fromNow()
})

function handleToggle() {
  if (isUnavailable.value) return
  if (isGateMoving.value) { void stopGate(); return }
  if (isLocked.value && props.config.require_confirmation !== false) confirming.value = true
  else doAction()
}
async function doAction() {
  if (isUnavailable.value) return
  const service = nextService.value
  setPending(service)
  try { await client.callService({ domain: 'lock', service, target: { entity_id: props.config.entity_id } }) }
  finally { confirming.value = false }
}
async function openDoorAction() {
  if (isUnavailable.value) return
  setPending('open')
  try { await client.callService({ domain: 'lock', service: 'open', target: { entity_id: props.config.entity_id } }) }
  finally { confirmingDoor.value = false }
}
async function stopGate() {
  if (isUnavailable.value) return
  const service = stopService.value
  try { await client.callService({ domain: 'lock', service, target: { entity_id: props.config.entity_id } }) }
  finally { confirming.value = false; confirmingDoor.value = false; clearPending() }
}

watch(lockState, (s) => {
  if (s === 'locked' || s === 'unlocked' || s === 'open' || s === 'jammed') {
    confirming.value = false
    confirmingDoor.value = false
    if (!isGate.value || s === 'jammed') clearPending()
  }
})
watch([isDoorOpen, lastGateService], ([open, service]) => {
  if (!isGate.value || !doorSensor.value || !isPending.value) return
  if ((service === 'lock' && !open) || ((service === 'unlock' || service === 'open') && open)) clearPending()
})
</script>

<style scoped>
/* ── Shell ──────────────────────────────────── */
.lock-card {
  position: relative;
  overflow: hidden;
  padding: 10px 12px 12px;
  gap: 6px;
}

/* ── Ambient glow (state-based) ─────────────── */
.lock-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
  background: radial-gradient(ellipse 75% 70% at 18% 50%, rgba(var(--v-theme-on-surface), 0) 0%, transparent 70%);
}
.lock-s-locked    .lock-ambient { background: radial-gradient(ellipse 75% 70% at 18% 50%, rgba(var(--v-theme-success), 0.08) 0%, transparent 70%); }
.lock-s-unlocked  .lock-ambient,
.lock-s-open      .lock-ambient { background: radial-gradient(ellipse 75% 70% at 18% 50%, rgba(var(--v-theme-warning), 0.08) 0%, transparent 70%); }
.lock-s-jammed    .lock-ambient { background: radial-gradient(ellipse 75% 70% at 18% 50%, rgba(var(--v-theme-error),   0.08) 0%, transparent 70%); }
.lock-s-locking   .lock-ambient,
.lock-s-unlocking .lock-ambient,
.lock-s-opening   .lock-ambient { background: radial-gradient(ellipse 75% 70% at 18% 50%, rgba(var(--v-theme-primary), 0.07) 0%, transparent 70%); }

/* ── Header ─────────────────────────────────── */
.lock-header {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  padding-right: 22px;
}
.lock-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

/* ── Center ─────────────────────────────────── */
.lock-center {
  position: relative;
  z-index: 1;
}
.lock-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  transition: background 0.4s ease, border-color 0.4s ease;
}
.lock-s-locked   .lock-icon-wrap { background: rgba(var(--v-theme-success), 0.12); border-color: rgba(var(--v-theme-success), 0.22); }
.lock-s-unlocked .lock-icon-wrap,
.lock-s-open     .lock-icon-wrap { background: rgba(var(--v-theme-warning), 0.12); border-color: rgba(var(--v-theme-warning), 0.22); }
.lock-s-jammed   .lock-icon-wrap { background: rgba(var(--v-theme-error),   0.12); border-color: rgba(var(--v-theme-error),   0.22); }

.lock-state-label {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.1;
  transition: color 0.4s ease;
}
.lock-last-changed {
  font-size: 10px;
  opacity: 0.38;
  letter-spacing: 0.02em;
}

/* ── Animation ──────────────────────────────── */
@keyframes lock-spin { to { transform: rotate(360deg); } }
.lock-spin { animation: lock-spin 1.2s linear infinite; }
</style>
