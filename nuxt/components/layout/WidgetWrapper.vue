<template>
  <v-card height="100%" rounded="xl" class="overflow-hidden widget-card" style="position: relative;" :style="cardStyle" :class="{
    'ring-selected': isSelected,
    'cursor-pointer': hasGenericActions,
    'widget-glass': glassEnabled && !appearance.bg_color && !hasActiveBackground,
    'widget-glass-blur': glassEnabled && !!appearance.bg_color && !hasActiveBackground,
  }"
    :role="hasGenericActions && !editMode ? 'button' : undefined"
    :tabindex="hasGenericActions && !editMode ? 0 : undefined"
    :aria-label="hasGenericActions && !editMode ? genericActionLabel : undefined"
    @click.capture="handleGenericClick"
    @dblclick.capture="handleGenericDoubleClick"
    @keydown="handleGenericKeydown"
    @mousedown.capture="startHold"
    @mouseup.capture="cancelHold"
    @mouseleave.capture="cancelHold"
    @touchstart.passive.capture="startHold"
    @touchend.capture="cancelHold"
    @touchmove.capture="cancelHold">
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
      <v-btn icon="mdi-arrow-right-bold-box-outline" size="x-small" variant="tonal" density="comfortable"
        :title="t('widget.copy_to_dashboard')" @click="openCopyDialog" />
      <v-btn icon="mdi-close" size="x-small" variant="tonal" density="comfortable" color="error"
        :title="t('widget.remove')" @click="removeWithUndo" />
    </div>

    <!-- Unavailable entity indicator -->
    <div v-if="editMode && isEntityUnavailable" class="widget-entity-warning" :title="t('widget.entity_unavailable')">
      <v-icon icon="mdi-alert-circle-outline" size="12" />
      <span>{{ t('widget.entity_unavailable') }}</span>
    </div>

    <!-- Battery indicator -->
    <div v-if="!editMode && showBatteryIndicator" class="widget-battery-indicator" :title="`${batteryLevel}%`">
      <v-icon :icon="batteryIcon" :color="batteryColor" size="14" />
      <span v-if="showBatteryText" class="widget-battery-level">{{ batteryLevel }}%</span>
    </div>

    <!-- Widget content -->
    <div ref="contentEl" class="h-100" :style="{ pointerEvents: editMode ? 'none' : undefined }">
      <div v-if="widgetError" class="h-100 d-flex flex-column align-center justify-center pa-3 text-center">
        <v-icon icon="mdi-alert-circle-outline" size="28" color="error" class="mb-2" style="opacity:0.7" />
        <span class="text-caption text-medium-emphasis" style="opacity:0.8">{{ t('widget.render_error') }}</span>
        <v-btn v-if="editMode" size="x-small" variant="text" class="mt-2" @click="widgetError = false">
          {{ t('common.retry') }}
        </v-btn>
      </div>
      <div v-else-if="!shouldRender" class="h-100 d-flex align-center justify-center">
        <v-progress-circular indeterminate size="24" color="medium-emphasis" />
      </div>
      <template v-else>
        <LazySensorWidget v-if="widget.type === 'sensor'" :config="widget.config as any" :appearance="widget.appearance" />
        <LazyGaugeWidget v-else-if="widget.type === 'gauge'" :config="widget.config as any" />
        <LazyTemplateWidget v-else-if="widget.type === 'template'" :config="widget.config as any" />
        <LazySwitchWidget v-else-if="widget.type === 'switch'" :config="widget.config as any"
          :appearance="widget.appearance" />
        <LazyButtonWidget v-else-if="widget.type === 'button'" :config="widget.config as any" />
        <LazySelectWidget v-else-if="widget.type === 'select'" :config="widget.config as any" />
        <LazyLightWidget v-else-if="widget.type === 'light'" :config="widget.config as any" :appearance="widget.appearance" />
        <LazyChartWidget v-else-if="widget.type === 'chart'" :config="widget.config as any" />
        <LazyCameraWidget v-else-if="widget.type === 'camera'" :config="widget.config as any" />
        <LazyThermostatWidget v-else-if="widget.type === 'thermostat'" :config="widget.config as any"
          :appearance="widget.appearance" />
        <LazyMediaPlayerWidget v-else-if="widget.type === 'media_player'" :config="widget.config as any" />
        <LazyCoverDial2Widget v-else-if="widget.type === 'cover' || widget.type === 'cover_dial' || widget.type === 'cover_dial2'" :config="widget.config as any" />
        <LazyLockWidget v-else-if="widget.type === 'lock'" :config="widget.config as any" :appearance="widget.appearance" />
        <LazyWeatherWidget v-else-if="widget.type === 'weather'" :config="widget.config as any" />
        <LazyClockWidget v-else-if="widget.type === 'clock'" :config="widget.config as any" />
        <LazyLabelWidget v-else-if="widget.type === 'label'" :config="widget.config as any" />
        <LazyRoomCardWidget v-else-if="widget.type === 'room_card'" :config="widget.config as any" />
        <LazyCalendarWidget v-else-if="widget.type === 'calendar'" :config="widget.config as any" />
        <LazyCalendarV2Widget v-else-if="widget.type === 'calendar_v2'" :config="widget.config as any" />
        <LazyPersonWidget v-else-if="widget.type === 'person'" :config="widget.config as any" />
        <LazyEnergyWidget v-else-if="widget.type === 'energy'" :config="widget.config as any" />
        <LazyApplianceWidget v-else-if="widget.type === 'appliance'" :config="widget.config as any" />
        <LazyAlarmWidget v-else-if="widget.type === 'alarm'" :config="widget.config as any" />
        <LazyProblemOverviewWidget v-else-if="widget.type === 'problem_overview'" :config="widget.config as any" />
        <LazyStatusBarWidget v-else-if="widget.type === 'status_bar'" :config="widget.config as any" />
        <LazyVacuumWidget v-else-if="widget.type === 'vacuum'" :config="widget.config as any" />
        <LazyFanWidget v-else-if="widget.type === 'fan'" :config="widget.config as any" />
        <LazySceneWidget v-else-if="widget.type === 'scene'" :config="widget.config as any" />
        <LazyTimerWidget v-else-if="widget.type === 'timer'" :config="widget.config as any" />
        <LazyCameraStatusWidget v-else-if="widget.type === 'camera_status'" :config="widget.config as any" />
        <LazyPowerConsumersWidget v-else-if="widget.type === 'power_consumers'" :config="widget.config as any" />
        <div v-else class="pa-4 text-medium-emphasis text-body-2">{{ t('widget.unknown_type') }}</div>
      </template>
    </div>
  </v-card>

  <LazyLightDetailDialog v-if="detailOpen && detailEntityId && detailDomain === 'light'" v-model="detailOpen" :entity-id="detailEntityId" />
  <LazyUpdateDetailDialog v-else-if="detailOpen && detailEntityId && detailDomain === 'update'" v-model="detailOpen" :entity-id="detailEntityId" />
  <LazyMediaPlayerDetailDialog v-else-if="detailOpen && detailEntityId && detailDomain === 'media_player'" v-model="detailOpen" :entity-id="detailEntityId" />
  <LazyEntityDetailDialog v-else-if="detailOpen && detailEntityId" v-model="detailOpen" :entity-id="detailEntityId" />

  <!-- Copy widget to another dashboard -->
  <v-dialog v-model="copyDialogOpen" max-width="400">
    <v-card rounded="xl">
      <v-card-text class="pa-5">
        <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('widget.copy_to_dashboard') }}</div>
        <div class="text-body-2 text-medium-emphasis mb-4">{{ t('widget.copy_to_dashboard_hint') }}</div>
        <div v-if="copyDashboardsLoading" class="d-flex justify-center py-4">
          <v-progress-circular indeterminate size="28" />
        </div>
        <div v-else-if="copyDashboards.length === 0" class="text-body-2 text-medium-emphasis text-center py-4">
          {{ t('widget.copy_no_targets') }}
        </div>
        <v-list v-else density="compact" rounded="lg" class="pa-0" border>
          <template v-for="(db, i) in copyDashboards" :key="db.id">
            <v-divider v-if="i > 0" />
            <v-list-item
              :prepend-icon="db.icon || 'mdi-view-dashboard-outline'"
              :title="db.name"
              :active="copyTargetId === db.id"
              active-color="primary"
              rounded="lg"
              @click="copyTargetId = db.id"
            />
          </template>
        </v-list>
      </v-card-text>
      <v-card-actions class="px-5 pb-5">
        <v-spacer />
        <v-btn variant="text" @click="copyDialogOpen = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :loading="copyingWidget" :disabled="!copyTargetId"
          @click="confirmCopyWidget">
          {{ t('common.copy') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { useTheme } from 'vuetify'
import type { Widget } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ widget: Widget; editMode: boolean; quickEdit?: boolean }>()
const emit = defineEmits<{ quickEdit: [widgetId: string] }>()

const LAZY_RENDER_TYPES = new Set(['gauge', 'chart', 'camera', 'calendar', 'calendar_v2', 'energy', 'power_consumers'])
const isHeavyWidget = LAZY_RENDER_TYPES.has(props.widget.type)
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const isVisible = ref(!isHeavyWidget)
const shouldRender = computed(() => isVisible.value || props.editMode)

if (import.meta.client && isHeavyWidget) {
  const { stop } = useIntersectionObserver(
    contentEl,
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true
        stop()
      }
    },
    { rootMargin: '200px' },
  )
}

const dashboardStore = useDashboardStore()
const entityStore = useEntityStore()
const client = useHAClient()
const { glass } = useGlassEffect()
const { borders } = useWidgetBorders()
const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const detailOpen = ref(false)
const detailEntityId = ref<string | null>(null)
const widgetError = ref(false)

// Copy-to-dashboard state
const copyDialogOpen = ref(false)
const copyDashboards = ref<{ id: string; name: string; icon?: string }[]>([])
const copyDashboardsLoading = ref(false)
const copyTargetId = ref<string | null>(null)
const copyingWidget = ref(false)

async function openCopyDialog() {
  copyTargetId.value = null
  copyDialogOpen.value = true
  copyDashboardsLoading.value = true
  try {
    const all = await $fetch<{ id: string; name: string; icon?: string }[]>('/api/dashboards')
    copyDashboards.value = all.filter(db => db.id !== dashboardStore.dashboard?.id)
  } finally {
    copyDashboardsLoading.value = false
  }
}

async function confirmCopyWidget() {
  if (!copyTargetId.value) return
  copyingWidget.value = true
  try {
    const target = await $fetch<{ widgets: typeof props.widget[] }>(`/api/dashboards/${copyTargetId.value}`)
    const widgetCopy = {
      ...props.widget,
      id: crypto.randomUUID(),
      config: JSON.parse(JSON.stringify(props.widget.config)),
      ...(props.widget.appearance ? { appearance: JSON.parse(JSON.stringify(props.widget.appearance)) } : {}),
      ...(props.widget.visibility ? { visibility: JSON.parse(JSON.stringify(props.widget.visibility)) } : {}),
    }
    await $fetch(`/api/dashboards/${copyTargetId.value}`, {
      method: 'PUT',
      body: { ...target, widgets: [...(target.widgets ?? []), widgetCopy] },
    })
    copyDialogOpen.value = false
    const targetName = copyDashboards.value.find(db => db.id === copyTargetId.value)?.name ?? ''
    toast.success(t('widget.copy_success', { dashboard: targetName }))
  } catch {
    toast.error(t('widget.copy_error'))
  } finally {
    copyingWidget.value = false
  }
}

onErrorCaptured((err) => {
  console.error(`[WidgetWrapper] widget "${props.widget.type}" crashed:`, err)
  widgetError.value = true
  return false
})

const GENERIC_ACTION_EXCLUDED_TYPES = new Set(['light', 'room_card', 'status_bar'])
const BATTERY_EXCLUDED_TYPES = new Set(['status_bar', 'problem_overview', 'label', 'clock', 'template', 'camera', 'camera_status'])

const batterySourceEntityId = computed(() =>
  BATTERY_EXCLUDED_TYPES.has(props.widget.type) ? null : entityId.value,
)
const { batteryLevel, batteryIsNumeric, batteryIcon, batteryColor } = useBatteryInfo(batterySourceEntityId)

// Only show the % text for widget types whose header has enough room for it
const BATTERY_TEXT_TYPES = new Set(['sensor', 'gauge', 'chart'])
const showBatteryText = computed(() => batteryIsNumeric.value && BATTERY_TEXT_TYPES.has(props.widget.type))

const showBatteryIndicator = computed(() =>
  batteryLevel.value !== null && (batteryIsNumeric.value || batteryLevel.value === 0),
)
type GenericWidgetAction = 'none' | 'toggle' | 'open_detail' | 'call_service'

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
const isEntityUnavailable = computed(() => {
  if (!entityId.value) return false
  const entity = entityStore.entities[entityId.value]
  if (!entity) return true
  return entity.state === 'unavailable' || entity.state === 'unknown'
})
const detailDomain = computed(() => detailEntityId.value?.split('.')[0] ?? '')
const isActive = computed(() => {
  const s = entityState.value
  return s === 'on' || s === 'open' || s === 'unlocked' || s === 'playing'
})
const widgetConfig = computed(() => props.widget.config as Record<string, unknown>)
const genericActionsEnabled = computed(() => !GENERIC_ACTION_EXCLUDED_TYPES.has(props.widget.type))
const genericClickAction = computed(() => normalizeGenericAction(widgetConfig.value.card_click_action ?? widgetConfig.value.tap_action))
const genericDoubleClickAction = computed(() => normalizeGenericAction(widgetConfig.value.card_double_click_action ?? widgetConfig.value.double_tap_action))
const hasGenericActions = computed(() =>
  genericActionsEnabled.value
  && (genericClickAction.value !== 'none' || genericDoubleClickAction.value !== 'none'),
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
let quickEditTimer: ReturnType<typeof setTimeout> | null = null
let quickEditTriggered = false

function normalizeGenericAction(value: unknown): GenericWidgetAction {
  return value === 'toggle' || value === 'open_detail' || value === 'call_service' ? value : 'none'
}

function shouldIgnoreGenericAction(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) return false
  const match = target.closest([
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
  // The wrapper card itself may now carry role="button" for keyboard access;
  // matching only the card root must NOT count as an inner interactive element.
  return !!match && match !== event.currentTarget
}

function genericActionConfig(kind: 'click' | 'double_click') {
  const prefix = kind === 'click' ? 'card_click' : 'card_double_click'
  return {
    serviceName: widgetConfig.value[`${prefix}_service`] as string | undefined,
    targetEntityId: widgetConfig.value[`${prefix}_target_entity`] as string | undefined,
    serviceData: widgetConfig.value[`${prefix}_service_data`] as string | undefined,
  }
}

function parseServiceData(raw: string | undefined) {
  if (!raw?.trim()) return undefined
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined
  } catch {
    toast.error(t('config.action_service_data_invalid'))
    return null
  }
}

async function runGenericAction(action: GenericWidgetAction, kind: 'click' | 'double_click') {
  if (!genericActionsEnabled.value || action === 'none') return

  if (action === 'open_detail') {
    if (!entityId.value) return
    detailEntityId.value = entityId.value
    detailOpen.value = true
    return
  }

  if (action === 'call_service') {
    const { serviceName, targetEntityId, serviceData } = genericActionConfig(kind)
    const [domain, service] = (serviceName ?? '').split('.')
    if (!domain || !service) {
      toast.error(t('config.action_service_missing'))
      return
    }
    const parsedData = parseServiceData(serviceData)
    if (parsedData === null) return

    await client.callService({
      domain,
      service,
      target: targetEntityId ? { entity_id: targetEntityId } : undefined,
      service_data: parsedData,
    })
    return
  }

  if (!entityId.value) return
  const entity = entityStore.entities[entityId.value]
  if (!entity || entity.state === 'unavailable' || entity.state === 'unknown') return
  await client.callService({ domain: 'homeassistant', service: 'toggle', target: { entity_id: entityId.value } })
}

function handleGenericClick(event: MouseEvent) {
  if (quickEditTriggered) {
    event.stopPropagation()
    quickEditTriggered = false
    return
  }
  if (!genericActionsEnabled.value) return
  if (genericClickAction.value === 'none' || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  if (genericClickTimer) clearTimeout(genericClickTimer)
  genericClickTimer = setTimeout(() => {
    genericClickTimer = null
    runGenericAction(genericClickAction.value, 'click')
  }, 220)
}

function handleGenericDoubleClick(event: MouseEvent) {
  if (!genericActionsEnabled.value || genericDoubleClickAction.value === 'none' || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  if (genericClickTimer) { clearTimeout(genericClickTimer); genericClickTimer = null }
  runGenericAction(genericDoubleClickAction.value, 'double_click')
}

function handleGenericKeydown(event: KeyboardEvent) {
  if (props.editMode || !hasGenericActions.value) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  // Let inner interactive elements (buttons, switches) handle their own keys
  if (shouldIgnoreGenericAction(event)) return
  event.preventDefault()
  event.stopPropagation()
  const usesClick = genericClickAction.value !== 'none'
  runGenericAction(usesClick ? genericClickAction.value : genericDoubleClickAction.value, usesClick ? 'click' : 'double_click')
}

const genericActionLabel = computed(() => {
  const fn = entityId.value ? (entityStore.entities[entityId.value]?.attributes?.friendly_name as string | undefined) : undefined
  return fn ?? (widgetConfig.value.name as string | undefined) ?? props.widget.type
})

function startHold(event: MouseEvent | TouchEvent) {
  if (!props.quickEdit || props.editMode || shouldIgnoreGenericAction(event)) return

  event.stopPropagation()
  quickEditTriggered = false
  quickEditTimer = setTimeout(() => {
    quickEditTriggered = true
    quickEditTimer = null
    if (genericClickTimer) { clearTimeout(genericClickTimer); genericClickTimer = null }
    emit('quickEdit', props.widget.id)
  }, 650)
}

function cancelHold() {
  if (quickEditTimer) { clearTimeout(quickEditTimer); quickEditTimer = null }
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
  const transparentGlassBg = isCompactWidget.value ? 'rgba(var(--v-theme-surface), 0.42)' : 'rgba(var(--v-theme-surface), 0.50)'
  const neutralGlassBg = isCompactWidget.value ? 'rgba(var(--v-theme-surface), 0.55)' : 'rgba(var(--v-theme-surface), 0.62)'

  if (a.bg_color === 'transparent') style.backgroundColor = glassEnabled.value ? transparentGlassBg : 'transparent'
  else if (a.bg_color) {
    const bgOpacity = clampOpacity(a.bg_opacity, glassEnabled.value ? 55 : 100)
    style.backgroundColor = toSemiTransparent(a.bg_color, bgOpacity)
  }
  else if (isActive.value) {
    const isImplicitActive = props.widget.type === 'room_card' || props.widget.type === 'light'
    const activeColor = a.active_color ?? (isImplicitActive ? '#f59e0b' : undefined)
    if (activeColor) {
      if (isImplicitActive && !a.active_color) {
        // Ambient glow: warm fan from top-center
        // widget-glass class is suppressed (hasActiveBackground=true) so we inject backdropFilter manually
        const glowAlpha = glassEnabled.value ? 0.52 : 0.60
        const base = glassEnabled.value ? neutralGlassBg : 'rgba(var(--v-theme-surface), 0.88)'
        style.background = `radial-gradient(ellipse 120% 90% at 50% 0%, ${toSemiTransparent(activeColor, glowAlpha)} 0%, transparent 72%), ${base}`
        if (glassEnabled.value) style.backdropFilter = 'blur(16px) saturate(160%)'
      } else {
        style.backgroundColor = glassEnabled.value ? toSemiTransparent(activeColor, 0.72) : toSemiTransparent(activeColor, 0.88)
      }
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
  const isImplicitActiveState = isActive.value
    && (props.widget.type === 'room_card' || props.widget.type === 'light')
    && !appearance.value.active_color
    && !appearance.value.border_width
  const ring = isImplicitActiveState
    ? `0 0 0 1px ${toSemiTransparent('#f59e0b', 0.60)}, 0 0 18px ${toSemiTransparent('#f59e0b', 0.18)}`
    : isDark.value
      ? '0 0 0 1px rgba(255,255,255,0.12)'
      : glassEnabled.value ? '0 0 0 1px rgba(255,255,255,0.32)' : '0 0 0 1px rgba(0,0,0,0.08)'
  style.boxShadow = isPlainTransparentCard
    ? 'none'
    : (glassEnabled.value && isDark.value)
      ? `0 8px 32px rgba(0,0,0,0.35), ${ring}`
      : ring
  if (isSelected.value) style.outline = '2px solid rgb(var(--v-theme-primary))'
  return style
})
</script>

<style scoped>
.widget-card {
  transition: background 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
}

.ring-selected {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 0;
}

.widget-card:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.widget-entity-warning {
  position: absolute;
  bottom: 7px;
  left: 9px;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-error), 0.12);
  border: 1px solid rgba(var(--v-theme-error), 0.28);
  color: rgb(var(--v-theme-error));
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}

.widget-battery-indicator {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 5px 2px 3px;
  border-radius: 6px;
  background: rgba(var(--v-theme-surface), 0.55);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.widget-battery-level {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  opacity: 0.85;
}
</style>
