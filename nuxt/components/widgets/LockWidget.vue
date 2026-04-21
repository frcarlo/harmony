<template>
  <div class="h-100 d-flex flex-column pa-3 ">
    <!-- Top: icon + info -->
    <div class="d-flex align-center ga-3 flex-grow-1">
      <div class="lock-icon-wrapper" @click="sensorDialogOpen = !!props.config.door_sensor_entity">
        <v-icon :icon="lockIcon" size="44" :color="lockColor" />
        <v-icon v-if="doorSensor" class="door-badge"
          :icon="isDoorOpen ? 'mdi-door-open' : 'mdi-door-closed'"
          :color="isDoorOpen ? 'warning' : 'success'" size="16" />
      </div>
      <div class="flex-grow-1 overflow-hidden">
        <div class="text-body-2 font-weight-medium text-truncate">{{ name }}</div>
        <div class="text-caption" :class="isLocked ? 'text-medium-emphasis' : 'text-warning'">
          {{ isLocked ? t('common.locked') : t('common.unlocked') }}
        </div>
        <div class="text-caption text-disabled">{{ lastChanged }}</div>
      </div>
       <v-btn v-if="showDoorButton" icon="mdi-door-open" variant="tonal" size="small"
          :disabled="isUnavailable" :title="t('door.open')" @click="confirmingDoor = true" />
    </div>

    <!-- Bottom: action buttons -->
    <div class="d-flex ga-2">
      
      <template v-if="!confirming && !confirmingDoor">
        <v-btn :prepend-icon="toggleIcon" :text="toggleLabel" variant="tonal"
          :color="isLocked ? undefined : 'warning'" size="small" class="flex-grow-1 text-none"
          :disabled="isUnavailable" @click="handleToggle" />
      
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
const isLocked = computed(() => entity.value?.state === 'locked')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const doorSensor = computed(() => props.config.door_sensor_entity ? entityStore.entities[props.config.door_sensor_entity] : undefined)
const isDoorOpen = computed(() => doorSensor.value?.state === 'on')
const showDoorButton = computed(() => props.config.show_door_button !== false)
const sensorDialogOpen = ref(false)
const confirming = ref(false)
const confirmingDoor = ref(false)

const lockIcon = computed(() => isLocked.value ? 'mdi-lock' : 'mdi-lock-open-variant')
const lockColor = computed(() => isLocked.value ? 'success' : 'warning')
const toggleIcon = computed(() => isLocked.value ? 'mdi-lock-open-variant' : 'mdi-lock')
const toggleLabel = computed(() => isLocked.value ? t('common.unlock') : t('common.lock'))

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
  await client.callService({
    domain: 'lock',
    service: isLocked.value ? 'unlock' : 'lock',
    target: { entity_id: props.config.entity_id },
  })
  confirming.value = false
}

async function openDoorAction() {
  if (isUnavailable.value) return
  await client.callService({
    domain: 'lock',
    service: 'open',
    target: { entity_id: props.config.entity_id },
  })
  confirmingDoor.value = false
}

watch(isLocked, () => { confirming.value = false; confirmingDoor.value = false })
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
</style>
