<template>
  <v-card height="100%" rounded="xl" class="overflow-hidden widget-card" style="position: relative;" :style="cardStyle" :class="{
    'ring-selected': isSelected,
    'cursor-pointer': hasGenericActions,
    'widget-glass': glassEnabled && !appearance.bg_color && !hasActiveBackground,
    'widget-glass-blur': glassEnabled && !!appearance.bg_color && !hasActiveBackground,
  }"
    @click.capture="handleGenericClick"
    @dblclick.capture="handleGenericDoubleClick"
    @mousedown.capture="startGenericHold"
    @mouseup.capture="cancelGenericHold"
    @mouseleave.capture="cancelGenericHold"
    @touchstart.passive.capture="startGenericHold"
    @touchend.capture="cancelGenericHold"
    @touchmove.capture="cancelGenericHold">
    <!-- Drag handle -->
    <div v-if="editMode" class="drag-handle">
      <v-icon icon="mdi-drag-horizontal" size="16" color="medium-emphasis" />
    </div>

    <!-- Edit controls -->
    <div v-if="editMode" class="widget-edit-controls">
      <v-btn icon="mdi-cog" size="x-small" variant="tonal" density="comfortable"
        :color="isSelected ? 'primary' : undefined" :title="t('widget.configure')"
        @click="dashboardStore.setSelectedWidget(isSelected ? null : widget.id)" />
      <v-btn icon="mdi-content-copy" size="x-small" variant="tonal" density="comfortable" :title="t('widget.clone')"
        @click="dashboardStore.cloneWidget(widget.id)" />
      <v-btn icon="mdi-close" size="x-small" variant="tonal" density="comfortable" color="error"
        :title="t('widget.remove')" @click="removeWithUndo" />
    </div>

    <!-- Widget content -->
    <div class="h-100" :style="{ pointerEvents: editMode ? 'none' : undefined }">
      <SensorWidget v-if="widget.type === 'sensor'" :config="widget.config as any" :appearance="widget.appearance" />
      <SwitchWidget v-else-if="widget.type === 'switch'" :config="widget.config as any"
        :appearance="widget.appearance" />
      <LightWidget v-else-if="widget.type === 'light'" :config="widget.config as any" :appearance="widget.appearance" />
      <ChartWidget v-else-if="widget.type === 'chart'" :config="widget.config as any" />
      <CameraWidget v-else-if="widget.type === 'camera'" :config="widget.config as any" />
      <ThermostatWidget v-else-if="widget.type === 'thermostat'" :config="widget.config as any"
        :appearance="widget.appearance" />
      <MediaPlayerWidget v-else-if="widget.type === 'media_player'" :config="widget.config as any" />
      <CoverDial2Widget v-else-if="widget.type === 'cover' || widget.type === 'cover_dial' || widget.type === 'cover_dial2'" :config="widget.config as any" />
      <LockWidget v-else-if="widget.type === 'lock'" :config="widget.config as any" :appearance="widget.appearance" />
      <WeatherWidget v-else-if="widget.type === 'weather'" :config="widget.config as any" />
      <ClockWidget v-else-if="widget.type === 'clock'" :config="widget.config as any" />
      <LabelWidget v-else-if="widget.type === 'label'" :config="widget.config as any" />
      <RoomCardWidget v-else-if="widget.type === 'room_card'" :config="widget.config as any" />
      <CalendarWidget v-else-if="widget.type === 'calendar'" :config="widget.config as any" />
      <CalendarV2Widget v-else-if="widget.type === 'calendar_v2'" :config="widget.config as any" />
      <PersonWidget v-else-if="widget.type === 'person'" :config="widget.config as any" />
      <EnergyWidget v-else-if="widget.type === 'energy'" :config="widget.config as any" />
      <ApplianceWidget v-else-if="widget.type === 'appliance'" :config="widget.config as any" />
      <AlarmWidget v-else-if="widget.type === 'alarm'" :config="widget.config as any" />
      <StatusBarWidget v-else-if="widget.type === 'status_bar'" :config="widget.config as any" />
      <div v-else class="pa-4 text-medium-emphasis text-body-2">{{ t('widget.unknown_type') }}</div>
    </div>
  </v-card>

  <LightDetailDialog v-if="detailOpen && detailEntityId && detailDomain === 'light'" v-model="detailOpen" :entity-id="detailEntityId" />
  <UpdateDetailDialog v-else-if="detailOpen && detailEntityId && detailDomain === 'update'" v-model="detailOpen" :entity-id="detailEntityId" />
  <MediaPlayerDetailDialog v-else-if="detailOpen && detailEntityId && detailDomain === 'media_player'" v-model="detailOpen" :entity-id="detailEntityId" />
  <EntityDetailDialog v-else-if="detailOpen && detailEntityId" v-model="detailOpen" :entity-id="detailEntityId" />
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useTheme } from 'vuetify'
import type { Widget } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ widget: Widget; editMode: boolean }>()

const dashboardStore = useDashboardStore()
const entityStore = useEntityStore()
const client = useHAClient()
const { glass } = useGlassEffect()
const { borders } = useWidgetBorders()
const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const detailOpen = ref(false)
const detailEntityId = ref<string | null>(null)

const GENERIC_ACTION_EXCLUDED_TYPES = new Set(['light', 'room_card', 'status_bar'])
type GenericWidgetAction = 'none' | 'toggle' | 'open_detail'

const isSelected = computed(() => dashboardStore.selectedWidgetId === props.widget.id)

function removeWithUndo() {
  const snapshot = JSON.parse(JSON.stringify(props.widget)) as Widget
  dashboardStore.removeWidget(snapshot.id)
  toast(t('widget.removed'), {
    duration: 5000,
    action: {
      label: t('common.undo'),
      onClick: () => dashboardStore.addWidget(snapshot),
    },
  })
}

const entityId = computed(() => {
  const c = props.widget.config as Record<string, unknown>
  if (props.widget.type === 'room_card') return c?.light_entity as string | undefined
  return c?.entity_id as string | undefined
})
const entityState = computed(() => entityId.value ? entityStore.entities[entityId.value]?.state : undefined)
const detailDomain = computed(() => detailEntityId.value?.split('.')[0] ?? '')
const isActive = computed(() => {
  const s = entityState.value
  return s === 'on' || s === 'open' || s === 'unlocked' || s === 'playing'
})
const widgetConfig = computed(() => props.widget.config as Record<string, unknown>)
const genericActionsEnabled = computed(() => !GENERIC_ACTION_EXCLUDED_TYPES.has(props.widget.type) && !!entityId.value)
const genericClickAction = computed(() => normalizeGenericAction(widgetConfig.value.card_click_action ?? widgetConfig.value.tap_action))
const genericDoubleClickAction = computed(() => normalizeGenericAction(widgetConfig.value.card_double_click_action ?? widgetConfig.value.double_tap_action))
const genericHoldAction = computed(() => normalizeGenericAction(widgetConfig.value.card_hold_action ?? widgetConfig.value.hold_action))
const hasGenericActions = computed(() =>
  genericActionsEnabled.value
  && (genericClickAction.value !== 'none' || genericDoubleClickAction.value !== 'none' || genericHoldAction.value !== 'none'),
)

const appearance = computed(() => props.widget.appearance ?? {})
const glassEnabled = computed(() => glass.value && appearance.value.disable_glass !== true)

const hasActiveBackground = computed(() =>
  isActive.value && (appearance.value.active_color != null || props.widget.type === 'room_card' || props.widget.type === 'light'),
)

const isCompactWidget = computed(() => {
  const { w, h } = props.widget.layout
  return w <= 4 || h <= 2
})

let genericClickTimer: ReturnType<typeof setTimeout> | null = null
let genericHoldTimer: ReturnType<typeof setTimeout> | null = null
let genericHoldTriggered = false

function normalizeGenericAction(value: unknown): GenericWidgetAction {
  return value === 'toggle' || value === 'open_detail' ? value : 'none'
}

function shouldIgnoreGenericAction(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) return false
  return !!target.closest([
    '[data-no-widget-action]',
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[contenteditable="true"]',
    '[role="button"]',
    '[role="slider"]',
    '.v-btn',
    '.v-slider',
    '.v-switch',
    '.v-selection-control',
  ].join(','))
}

async function runGenericAction(action: GenericWidgetAction) {
  if (!genericActionsEnabled.value || action === 'none' || !entityId.value) return

  if (action === 'open_detail') {
    detailEntityId.value = entityId.value
    detailOpen.value = true
    return
  }

  const entity = entityStore.entities[entityId.value]
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return
  await client.callService({ domain: 'homeassistant', service: 'toggle', target: { entity_id: entityId.value } })
}

function handleGenericClick(event: MouseEvent) {
  if (!genericActionsEnabled.value) return
  if (genericHoldTriggered) {
    event.stopPropagation()
    genericHoldTriggered = false
    return
  }
  if (genericClickAction.value === 'none' || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  if (genericClickTimer) clearTimeout(genericClickTimer)
  genericClickTimer = setTimeout(() => {
    genericClickTimer = null
    runGenericAction(genericClickAction.value)
  }, 220)
}

function handleGenericDoubleClick(event: MouseEvent) {
  if (!genericActionsEnabled.value || genericDoubleClickAction.value === 'none' || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  if (genericClickTimer) { clearTimeout(genericClickTimer); genericClickTimer = null }
  runGenericAction(genericDoubleClickAction.value)
}

function startGenericHold(event: MouseEvent | TouchEvent) {
  if (!genericActionsEnabled.value || genericHoldAction.value === 'none' || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  genericHoldTriggered = false
  genericHoldTimer = setTimeout(() => {
    genericHoldTriggered = true
    genericHoldTimer = null
    if (genericClickTimer) { clearTimeout(genericClickTimer); genericClickTimer = null }
    runGenericAction(genericHoldAction.value)
  }, 500)
}

function cancelGenericHold() {
  if (genericHoldTimer) { clearTimeout(genericHoldTimer); genericHoldTimer = null }
}

function toSemiTransparent(color: string, alpha = 0.55): string {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

function clampOpacity(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(1, Math.max(0, numeric / 100))
}

const cardStyle = computed(() => {
  const a = appearance.value
  const style: Record<string, string> = {}
  const isPlainTransparentCard = a.bg_color === 'transparent' && !glassEnabled.value
  const transparentGlassBg = isCompactWidget.value ? 'rgba(var(--v-theme-surface), 0.18)' : 'rgba(var(--v-theme-surface), 0.24)'
  const neutralGlassBg = isCompactWidget.value ? 'rgba(var(--v-theme-surface), 0.32)' : 'rgba(var(--v-theme-surface), 0.38)'

  if (a.bg_color === 'transparent') style.backgroundColor = glassEnabled.value ? transparentGlassBg : 'transparent'
  else if (a.bg_color) {
    const bgOpacity = clampOpacity(a.bg_opacity, glassEnabled.value ? 55 : 100)
    style.backgroundColor = toSemiTransparent(a.bg_color, bgOpacity)
  }
  else if (isActive.value) {
    const activeColor = a.active_color ?? (props.widget.type === 'room_card' || props.widget.type === 'light' ? '#f59e0b' : undefined)
    if (activeColor) {
      style.backgroundColor = glassEnabled.value ? toSemiTransparent(activeColor, 0.72) : toSemiTransparent(activeColor, 0.88)
    }
  } else if (glassEnabled.value) {
    style.backgroundColor = neutralGlassBg
  }
  if (a.text_color) style.color = a.text_color
  const bw = (borders.value && (a.border_width ?? 0) > 0) ? (a.border_width ?? 0) : 0
  if (bw > 0) {
    const customColor = (isActive.value && a.active_color) ? a.active_color : a.border_color
    const rawColor = customColor ?? 'rgb(var(--v-theme-primary))'
    style.borderColor = toSemiTransparent(rawColor, 0.45)
    style.borderWidth = `${bw}px`
    style.borderStyle = 'solid'
  } else {
    style.border = 'none'
  }
  const ring = isDark.value
    ? '0 0 0 1px rgba(255,255,255,0.12)'
    : glassEnabled.value ? '0 0 0 1px rgba(255,255,255,0.32)' : '0 0 0 1px rgba(0,0,0,0.08)'
  style.boxShadow = isPlainTransparentCard
    ? 'none'
    : (glassEnabled.value && isDark.value) ? `0 8px 32px rgba(0,0,0,0.35), ${ring}` : ring
  if (isSelected.value) style.outline = '2px solid rgb(var(--v-theme-primary))'
  return style
})
</script>

<style scoped>
.ring-selected {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 0;
}

</style>
