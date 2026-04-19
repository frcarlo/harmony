<template>
  <div class="lock-card d-flex flex-column pa-3">
    <div class="d-flex justify-space-between align-start mb-2">
      <div>
        <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase letter-spacing-1"
          style="font-size: 0.7rem;">
          {{ name }}
        </div>
      </div>
      <div class="text-right d-flex flex-column align-end ga-1">
        <div class="d-flex align-center ga-2">
          <v-btn v-if="props.config.door_sensor_entity"
            :icon="isDoorOpen ? 'mdi-door-open' : 'mdi-door-closed'"
            :color="isDoorOpen ? 'warning' : 'medium-emphasis'" size="x-small"
            :variant="isDoorOpen ? 'tonal' : 'text'" density="comfortable"
            :title="isDoorOpen ? t('lock.door_open') : t('lock.door_closed')"
            @click.stop="sensorDialogOpen = true" />
          <v-icon :icon="isLocked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'"
            :color="isLocked ? 'medium-emphasis' : 'error'" size="20" />
        </div>
        <div class="text-caption text-disabled" style="font-size: 0.65rem;">{{ lastChanged }}</div>
      </div>
    </div>

    <div class="flex-grow-1 d-flex align-center justify-center py-4">
      <div class="horizontal-pill-container" :class="{ unlocked: !isLocked, confirming }" @click="handleClick">
        <div class="pill-track">
          <!-- Background fill -->
          <div class="pill-fill" :style="{ width: isLocked ? '48px' : '100%' }" />

          <!-- Normal state -->
          <Transition name="pill-swap" mode="out-in">
            <div v-if="!confirming" key="normal" class="pill-content d-flex align-center px-3">
              <v-icon :icon="isLocked ? 'mdi-chevron-right' : 'mdi-check'" color="white" size="20"
                class="pill-status-icon" />
              <div class="flex-grow-1 text-center pr-8">
                <span class="text-body-1 font-weight-light text-white">
                  {{ isLocked ? t('common.locked') : t('common.unlocked') }}
                </span>
              </div>
            </div>

            <!-- Confirm state: two halves inside the pill -->
            <div v-else key="confirm" class="pill-content d-flex align-stretch">
              <div class="pill-half pill-half-cancel d-flex align-center justify-center flex-grow-1"
                @click.stop="confirming = false">
                <span class="text-body-2 text-white">{{ t('common.cancel') }}</span>
              </div>
              <div class="pill-divider" />
              <div class="pill-half pill-half-confirm d-flex align-center justify-center flex-grow-1"
                @click.stop="doAction">
                <v-icon icon="mdi-lock-open-variant" color="white" size="16" class="mr-1" />
                <span class="text-body-2 font-weight-bold text-white">{{ t('common.unlock') }}</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <div class="mt-2">
      <Transition name="pill-swap" mode="out-in">
        <div v-if="!confirmingDoor" key="door-btn" class="door-btn-track" @click="confirmingDoor = true">
          <v-icon icon="mdi-door-open" size="18" color="white" class="mr-2" />
          <span class="text-caption font-weight-bold text-white">{{ t('door.open') }}</span>
        </div>
        <div v-else key="door-confirm" class="door-btn-track d-flex align-stretch pa-0" style="overflow: hidden;">
          <div class="door-half door-cancel d-flex align-center justify-center flex-grow-1"
            @click="confirmingDoor = false">
            <span class="text-body-2 text-white">{{ t('common.cancel') }}</span>
          </div>
          <div class="pill-divider" />
          <div class="door-half door-confirm d-flex align-center justify-center flex-grow-1" @click="openDoorAction">
            <v-icon icon="mdi-door-open" color="white" size="16" class="mr-1" />
            <span class="text-body-2 font-weight-bold text-white">{{ t('door.open') }}</span>
          </div>
        </div>
      </Transition>
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
const sensorDialogOpen = ref(false)
const confirming = ref(false)
const confirmingDoor = ref(false)

const now = useNow({ interval: 60_000 })
const lastChanged = computed(() => {
  void now.value
  const ts = entity.value?.last_changed
  if (!ts) return '–'
  return dayjs(ts).locale(locale.value).fromNow()
})

function handleClick() {
  if (isUnavailable.value || confirming.value) return
  if (props.config.require_confirmation !== false && !isLocked.value) {
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
.lock-card {
  background: transparent;
  min-height: 180px;
}

.horizontal-pill-container {
  width: 100%;
  max-width: 340px;
  height: 52px;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.horizontal-pill-container:active {
  transform: scale(0.97);
}

.pill-track {
  position: relative;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.pill-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: #ff8a80;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.3;
}

.unlocked .pill-fill {
  opacity: 1;
  box-shadow: 0 0 20px rgba(255, 138, 128, 0.4);
}

.pill-content {
  position: relative;
  z-index: 2;
  height: 100%;
  width: 100%;
}

.pill-status-icon {
  transition: all 0.4s ease;
}

/* Confirm halves */
.pill-half {
  cursor: pointer;
  transition: background 0.15s ease;
}

.pill-half-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
}

.pill-half-confirm {
  background: rgba(255, 80, 80, 0.35);
}

.pill-half-confirm:hover {
  background: rgba(255, 80, 80, 0.55);
}

.pill-divider {
  width: 1px;
  background: rgba(255, 255, 255, 0.2);
  align-self: stretch;
  margin: 10px 0;
}

/* Pill content swap transition */
.pill-swap-enter-active,
.pill-swap-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.pill-swap-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.pill-swap-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.door-btn-track {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s ease;
}

.door-btn-track:hover {
  background: rgba(255, 255, 255, 0.09);
}

.door-half {
  height: 100%;
  cursor: pointer;
  transition: background 0.15s ease;
}

.door-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
}

.door-confirm {
  background: rgba(255, 80, 80, 0.35);
}

.door-confirm:hover {
  background: rgba(255, 80, 80, 0.55);
}

.letter-spacing-1 {
  letter-spacing: 1px !important;
}
</style>
