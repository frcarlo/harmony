<template>
  <div class="h-100 d-flex flex-column pa-3 ga-1 alarm-card" :class="alarmToneClass">
    <div class="d-flex align-center ga-3" style="min-width: 0;">
      <div
        class="alarm-card__icon-wrap"
        :class="{
          'alarm-card__icon-wrap--active': isArmed,
          'alarm-card__icon-wrap--busy': isTransitioning,
          'alarm-card__icon-wrap--triggered': currentState === 'triggered',
        }"
      >
        <v-icon :icon="currentIcon" size="34" :color="stateColor" />
      </div>

      <div class="flex-grow-1 overflow-hidden">
        <div class="text-body-1 font-weight-bold text-truncate">{{ stateLabel }}</div>
        <div class="text-body-2 text-medium-emphasis text-truncate">{{ title }}</div>
      </div>
    </div>

    <div class="d-flex ga-2 flex-wrap" :class="actionsAlignClass">
      <v-btn
        v-for="action in availableActions"
        :key="action.key"
        :icon="action.icon"
        size="small"
        rounded="xl"
        variant="tonal"
        class="alarm-card__action"
        :color="currentState === action.activeState ? 'primary' : undefined"
        :title="action.label"
        :disabled="isUnavailable || busy"
        @click="runAction(action)"
      />
    </div>

    <v-dialog v-model="codeDialogOpen" max-width="360">
      <v-card rounded="xl" :class="{ 'dialog-glass': glass }" class="alarm-code-card">
        <v-card-title class="text-subtitle-1 font-weight-semibold">
          {{ t('alarm.enter_code') }}
        </v-card-title>
        <v-card-text class="pt-2">
          <div class="alarm-code-dialog">
            <v-text-field
              v-model="dialogCode"
              class="alarm-code-dialog__input"
              :label="t('config.alarm_code')"
              :mask="maskPattern"
              inputmode="numeric"
              autocomplete="one-time-code"
              :placeholder="codePlaceholder"
              variant="outlined"
              density="comfortable"
              hide-details
              autofocus
              :readonly="useKeypad"
              @keyup.enter="confirmCodeDialog"
            />
            <div v-if="useKeypad" class="alarm-code-dialog__keypad">
              <v-btn
                v-for="key in keypadKeys"
                :key="key.value"
                class="alarm-code-dialog__key"
                rounded="xl"
                variant="tonal"
                @click="handleKeypadPress(key.value)"
              >
                <v-icon v-if="key.icon" :icon="key.icon" size="18" />
                <span v-else>{{ key.text }}</span>
              </v-btn>
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="closeCodeDialog">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="tonal" :disabled="dialogCode.length !== codeLength" @click="confirmCodeDialog">{{ t('common.confirm') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { AlarmWidgetConfig } from '~/types/dashboard'

type AlarmAction = {
  key: 'disarm' | 'arm_home' | 'arm_away' | 'arm_night' | 'trigger'
  service: 'alarm_disarm' | 'alarm_arm_home' | 'alarm_arm_away' | 'alarm_arm_night' | 'alarm_trigger'
  activeState: string
  icon: string
  label: string
  feature?: number
}

const { t } = useI18n()
const { glass } = useGlassEffect()
const { mobile: isMobile } = useDisplay()
const props = defineProps<{ config: AlarmWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.config.entity_id])
const currentState = computed(() => entity.value?.state ?? 'unavailable')
const supportedFeatures = computed(() => Number(entity.value?.attributes?.supported_features ?? 0))
const isUnavailable = computed(() => !entity.value || ['unavailable', 'unknown'].includes(currentState.value))
const isArmed = computed(() => currentState.value.startsWith('armed'))
const isTransitioning = computed(() => ['arming', 'pending', 'disarming'].includes(currentState.value))
const busy = ref(false)
const codeDialogOpen = ref(false)
const dialogCode = ref('')
const pendingAction = ref<AlarmAction | null>(null)
const keypadKeys = [
  { value: '1', text: '1' },
  { value: '2', text: '2' },
  { value: '3', text: '3' },
  { value: '4', text: '4' },
  { value: '5', text: '5' },
  { value: '6', text: '6' },
  { value: '7', text: '7' },
  { value: '8', text: '8' },
  { value: '9', text: '9' },
  { value: 'clear', icon: 'mdi-close' },
  { value: '0', text: '0' },
  { value: 'backspace', icon: 'mdi-backspace-outline' },
] as const
const actionsAlignClass = computed(() => {
  switch (props.config.actions_align) {
    case 'center': return 'justify-center'
    case 'end': return 'justify-end'
    default: return 'justify-start'
  }
})
const codeLength = computed(() => {
  const raw = Number(props.config.code_length ?? 4)
  if (!Number.isFinite(raw)) return 4
  return Math.max(1, Math.min(8, Math.round(raw)))
})
const useKeypad = computed(() => (
  props.config.use_keypad !== false
  || (props.config.use_keypad_on_mobile !== false && isMobile.value)
))
const maskPattern = computed(() => '#'.repeat(codeLength.value))
const codePlaceholder = computed(() => '_'.repeat(codeLength.value))

const title = computed(() =>
  props.config.name
  || (entity.value?.attributes?.friendly_name as string | undefined)
  || t('widget.alarm.label'),
)

const stateColor = computed(() => {
  if (currentState.value === 'triggered') return 'error'
  if (isArmed.value) return 'primary'
  if (['arming', 'pending', 'disarming'].includes(currentState.value)) return 'warning'
  return 'medium-emphasis'
})

const alarmToneClass = computed(() => {
  switch (currentState.value) {
    case 'triggered':
      return 'alarm-card--tone-error'
    case 'armed_home':
    case 'armed_away':
    case 'armed_night':
      return 'alarm-card--tone-armed'
    case 'arming':
    case 'pending':
    case 'disarming':
      return 'alarm-card--tone-warning'
    default:
      return 'alarm-card--tone-idle'
  }
})

const currentIcon = computed(() => {
  if (props.config.icon) return props.config.icon
  switch (currentState.value) {
    case 'armed_home': return 'mdi-home-lock'
    case 'armed_night': return 'mdi-weather-night'
    case 'armed_away': return 'mdi-shield-lock'
    case 'triggered': return 'mdi-shield-alert'
    case 'arming': return 'mdi-shield-sync'
    default: return 'mdi-shield-half-full'
  }
})

const stateLabel = computed(() => {
  const key = `alarm.state.${currentState.value}`
  const translated = t(key)
  return translated === key ? currentState.value : translated
})

const actions = computed<AlarmAction[]>(() => [
  {
    key: 'arm_home',
    service: 'alarm_arm_home',
    activeState: 'armed_home',
    icon: 'mdi-home-variant',
    label: t('alarm.action.arm_home'),
    feature: 1,
  },
  {
    key: 'arm_night',
    service: 'alarm_arm_night',
    activeState: 'armed_night',
    icon: 'mdi-weather-night',
    label: t('alarm.action.arm_night'),
    feature: 4,
  },
  {
    key: 'arm_away',
    service: 'alarm_arm_away',
    activeState: 'armed_away',
    icon: 'mdi-lock',
    label: t('alarm.action.arm_away'),
    feature: 2,
  },
  {
    key: 'disarm',
    service: 'alarm_disarm',
    activeState: 'disarmed',
    icon: 'mdi-shield-off-outline',
    label: t('alarm.action.disarm'),
  },
  {
    key: 'trigger',
    service: 'alarm_trigger',
    activeState: 'triggered',
    icon: 'mdi-bell-ring-outline',
    label: t('alarm.action.trigger'),
    feature: 8,
  },
])

const availableActions = computed(() => actions.value.filter((action) =>
  action.feature == null || (supportedFeatures.value & action.feature) === action.feature,
))

async function runAction(action: AlarmAction) {
  if (busy.value || isUnavailable.value) return
  if (props.config.prompt_for_code) {
    pendingAction.value = action
    dialogCode.value = ''
    codeDialogOpen.value = true
    return
  }
  await submitAction(action, props.config.code)
}

function closeCodeDialog() {
  codeDialogOpen.value = false
  dialogCode.value = ''
  pendingAction.value = null
}

function handleKeypadPress(value: typeof keypadKeys[number]['value']) {
  if (value === 'clear') {
    dialogCode.value = ''
    return
  }

  if (value === 'backspace') {
    dialogCode.value = dialogCode.value.slice(0, -1)
    return
  }

  if (dialogCode.value.length >= codeLength.value) return
  dialogCode.value += value
}

async function confirmCodeDialog() {
  const action = pendingAction.value
  if (!action || dialogCode.value.length !== codeLength.value) return
  codeDialogOpen.value = false
  await submitAction(action, dialogCode.value.trim())
  dialogCode.value = ''
  pendingAction.value = null
}

async function submitAction(action: AlarmAction, code?: string) {
  if (busy.value || isUnavailable.value) return
  busy.value = true
  try {
    await client.callService({
      domain: 'alarm_control_panel',
      service: action.service,
      target: { entity_id: props.config.entity_id },
      service_data: code ? { code } : undefined,
    })
  } finally {
    window.setTimeout(() => {
      busy.value = false
    }, 500)
  }
}
</script>

<style scoped>
.alarm-card {
  min-width: 0;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.alarm-card::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at top right, var(--alarm-accent, rgba(var(--v-theme-on-surface), 0.06)) 0%, transparent 52%),
    linear-gradient(180deg, var(--alarm-surface, rgba(var(--v-theme-on-surface), 0.02)) 0%, rgba(255, 255, 255, 0) 100%);
  opacity: 1;
}

.alarm-card > * {
  position: relative;
  z-index: 1;
}

.alarm-card--tone-idle {
  --alarm-accent: rgba(var(--v-theme-on-surface), 0.05);
  --alarm-surface: rgba(var(--v-theme-on-surface), 0.015);
}

.alarm-card--tone-armed {
  --alarm-accent: rgba(var(--v-theme-primary), 0.16);
  --alarm-surface: rgba(var(--v-theme-primary), 0.08);
}

.alarm-card--tone-warning {
  --alarm-accent: rgba(var(--v-theme-warning), 0.16);
  --alarm-surface: rgba(var(--v-theme-warning), 0.08);
}

.alarm-card--tone-error {
  --alarm-accent: rgba(var(--v-theme-error), 0.18);
  --alarm-surface: rgba(var(--v-theme-error), 0.1);
}

.alarm-card__icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(var(--v-theme-on-surface), 0.06);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}

.alarm-card__icon-wrap--active {
  background: rgba(var(--v-theme-primary), 0.16);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.15);
}

.alarm-card__icon-wrap--busy {
  animation: alarm-icon-breathe 1.2s ease-in-out infinite;
}

.alarm-card__icon-wrap--busy :deep(.v-icon) {
  animation: alarm-icon-sway 1.2s ease-in-out infinite;
}

.alarm-card__icon-wrap--triggered {
  animation: alarm-icon-alert 0.75s ease-in-out infinite;
}

.alarm-card__action {
  min-width: 40px;
  width: 40px;
  height: 40px;
}

.alarm-code-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-code-dialog__input :deep(.v-field) {
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.045);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}

.alarm-code-dialog__input :deep(input) {
  text-align: center;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.32em;
}

.alarm-code-dialog__keypad {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.alarm-code-dialog__key {
  min-width: 0;
  height: 42px;
  border-radius: 14px !important;
  font-size: 0.96rem;
  font-weight: 650;
}

.alarm-code-card :deep(.v-card-text) {
  padding-top: 6px !important;
}

.alarm-code-card :deep(.v-btn--variant-tonal) {
  background: rgba(var(--v-theme-on-surface), 0.055);
}

@keyframes alarm-icon-breathe {
  0%,
  100% {
    transform: scale(1);
    box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.15);
  }

  50% {
    transform: scale(1.06);
    box-shadow:
      inset 0 0 0 1px rgba(var(--v-theme-primary), 0.2),
      0 0 0 6px rgba(var(--v-theme-warning), 0.08);
  }
}

@keyframes alarm-icon-sway {
  0%,
  100% {
    transform: rotate(0deg);
  }

  25% {
    transform: rotate(-8deg);
  }

  75% {
    transform: rotate(8deg);
  }
}

@keyframes alarm-icon-alert {
  0%,
  100% {
    transform: scale(1);
    box-shadow:
      inset 0 0 0 1px rgba(var(--v-theme-error), 0.2),
      0 0 0 0 rgba(var(--v-theme-error), 0.16);
  }

  50% {
    transform: scale(1.08);
    box-shadow:
      inset 0 0 0 1px rgba(var(--v-theme-error), 0.28),
      0 0 0 8px rgba(var(--v-theme-error), 0.08);
  }
}
</style>
