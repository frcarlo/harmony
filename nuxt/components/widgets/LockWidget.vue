<template>
  <div class="h-100 d-flex flex-column pa-3 ">
    <!-- Top: icon + info -->
    <div class="d-flex align-center ga-3 flex-grow-1">
      <div class="lock-icon-wrapper">
        <v-icon :icon="lockIcon" size="44" :color="lockColor" :class="{ 'spin': isAnimating }" />
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="d-flex align-center ga-1">
          <div class="text-caption" :class="stateLabelColor">{{ stateLabel }}</div>
          <v-btn v-if="doorSensor"
            :icon="isDoorOpen ? sensorOpenIcon : sensorClosedIcon"
            :color="isDoorOpen ? 'warning' : 'success'" :variant="isDoorOpen ? 'tonal' : 'text'"
            size="x-small" rounded="circle" density="comfortable"
            :title="isDoorOpen ? t('lock.door_open') : t('lock.door_closed')"
            @click.stop="sensorDialogOpen = true" />
        </div>
        <div class="text-caption text-disabled">{{ lastChanged }}</div>
      </div>
       <v-btn v-if="showDoorButton && !confirmingDoor" icon="mdi-door-open" variant="tonal" size="small"
          :disabled="isUnavailable" :title="t('door.open')" @click="confirmingDoor = true" />
    </div>

    <!-- Bottom: action buttons -->
    <div class="d-flex ga-2">
      
      <template v-if="!confirming && !confirmingDoor">
        <v-btn :prepend-icon="toggleIcon" :text="toggleLabel" variant="tonal"
          :color="isLocked ? undefined : 'warning'" size="small" class="flex-grow-1 text-none"
          :disabled="isUnavailable || isTransitioning || isJammed"
          @click="handleToggle" />
      
      </template>
      <template v-else-if="confirming">
        <v-btn :text="t('common.cancel')" variant="tonal" size="small" class="flex-grow-1 text-none"
          @click="confirming = false" />
        <v-btn prepend-icon="mdi-check" :text="t('common.confirm')" variant="tonal"
          color="warning" size="small" class="flex-grow-1 text-none" @click="doAction" />
        
      </template>
      <template v-else-if="confirmingDoor">
        <v-btn :text="t('common.cancel')" variant="tonal" size="small" class="flex-grow-1 text-none"
          @click="confirmingDoor = false" />
        <v-btn prepend-icon="mdi-door-open" :text="t('door.open')" variant="tonal"
          color="warning" size="small" class="flex-grow-1 text-none" @click="openDoorAction" />
      </template>
    </div>
  </div>

  <EntityDetailDialog v-if="props.config.door_sensor_entity" v-model="sensorDialogOpen"
    :entity-id="props.config.door_sensor_entity" icon="mdi-door-open" active-color="warning" active-state="on" />
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
defineOptions({ inheritAttrs: false })
const props = defineProps<{ config: LockWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? entity.value?.attributes?.friendly_name ?? 'Lock')
const lockState = computed(() => entity.value?.state ?? '')
const isLocked = computed(() => lockState.value === 'locked')
const isTransitioning = computed(() => ['locking', 'unlocking', 'opening'].includes(lockState.value))
const isJammed = computed(() => lockState.value === 'jammed')
const isUnavailable = computed(() => !entity.value || lockState.value === 'unavailable')
const doorSensor = computed(() => props.config.door_sensor_entity ? entityStore.entities[props.config.door_sensor_entity] : undefined)
const isDoorOpen = computed(() => { const s = doorSensor.value?.state; return s === 'on' || s === 'open' || s === 'unlocked' })
const sensorOpenIcon = computed(() => lockType.value === 'gate' ? 'mdi-garage-open' : 'mdi-door-open')
const sensorClosedIcon = computed(() => lockType.value === 'gate' ? 'mdi-garage' : 'mdi-door-closed')
const supportsDoorOpen = computed(() => ((entity.value?.attributes?.supported_features as number) ?? 0) & 1)
const showDoorButton = computed(() => !!supportsDoorOpen.value && props.config.show_door_button !== false)
const sensorDialogOpen = ref(false)
const confirming = ref(false)
const confirmingDoor = ref(false)

// isPending: true from action dispatch until HA reports a stable state.
// Needed because some locks (e.g. garage) jump to locked/unlocked instantly
// while the physical mechanism is still running.
const isPending = ref(false)
let pendingTimer: ReturnType<typeof setTimeout> | null = null
function setPending() {
  isPending.value = true
  if (pendingTimer) clearTimeout(pendingTimer)
  pendingTimer = setTimeout(() => { isPending.value = false }, 20_000)
}
const isAnimating = computed(() => isTransitioning.value || isPending.value)

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
const lockType = computed(() => props.config.lock_type ?? 'lock')
const stateLabel = computed(() => {
  switch (lockState.value) {
    case 'locked': return t(`lock.type.${lockType.value}.locked`)
    case 'unlocked': return t(`lock.type.${lockType.value}.unlocked`)
    default: return t(`lock.state.${lockState.value}`, lockState.value)
  }
})
const stateLabelColor = computed(() => {
  if (lockState.value === 'locked') return 'text-medium-emphasis'
  if (isJammed.value) return 'text-error'
  if (isTransitioning.value) return 'text-primary'
  return 'text-warning'
})
const toggleIcon = computed(() => isLocked.value ? (props.config.unlocked_icon ?? 'mdi-lock-open-variant') : (props.config.locked_icon ?? 'mdi-lock'))
const toggleLabel = computed(() => isLocked.value ? t(`lock.type.${lockType.value}.do_unlock`) : t(`lock.type.${lockType.value}.do_lock`))

const now = useNow({ interval: 60_000 })
const lastChanged = computed(() => {
  void now.value
  const ts = entity.value?.last_changed
  if (!ts) return '–'
  return dayjs(ts).locale(locale.value).fromNow()
})

function handleToggle() {
  if (isUnavailable.value) return
  if (isLocked.value && props.config.require_confirmation !== false) {
    confirming.value = true
  } else {
    doAction()
  }
}

async function doAction() {
  if (isUnavailable.value) return
  setPending()
  try {
    await client.callService({
      domain: 'lock',
      service: isLocked.value ? 'unlock' : 'lock',
      target: { entity_id: props.config.entity_id },
    })
  } finally {
    confirming.value = false
  }
}

async function openDoorAction() {
  if (isUnavailable.value) return
  setPending()
  try {
    await client.callService({
      domain: 'lock',
      service: 'open',
      target: { entity_id: props.config.entity_id },
    })
  } finally {
    confirmingDoor.value = false
  }
}

// Only reset confirmation when lock reaches a stable state, not during transitions.
// Watching isLocked would fire on locked→locking too, clearing the confirm dialog prematurely.
watch(lockState, (s) => {
  if (s === 'locked' || s === 'unlocked' || s === 'open' || s === 'jammed') {
    confirming.value = false
    confirmingDoor.value = false
    isPending.value = false
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null }
  }
})
</script>

<style scoped>
.lock-icon-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.door-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  border-radius: 50%;
  padding: 1px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  animation: spin 1.2s linear infinite;
}
</style>
