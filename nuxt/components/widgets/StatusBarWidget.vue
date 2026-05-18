<template>
  <div
    ref="rootEl"
    class="h-100 d-flex px-2 py-2 statusbar-root"
    :class="[
      isVertical ? 'flex-column align-center' : 'align-center',
      {
        'statusbar-root--stacked': shouldStackRows,
        'statusbar-root--compact': isCompactMobile,
      },
    ]"
  >

    <!-- Nav group at start -->
    <div
      v-if="navBadges.length && navAtStart"
      class="nav-group"
      :class="[isVertical ? 'flex-column' : 'flex-row']"
    >
      <v-tooltip v-for="(badge, i) in navBadges" :key="'ns' + i" location="bottom">
        <template #activator="{ props: tp }">
          <div
            v-bind="tp"
            class="badge d-flex flex-column align-center ga-1"
            @click="handleBadgeClick($event, badge)"
            @dblclick="handleBadgeDoubleClick($event, badge)"
            @mousedown="startBadgeHold($event, badge)"
            @mouseup="cancelBadgeHold"
            @mouseleave="cancelBadgeHold"
            @touchstart.passive="startBadgeHold($event, badge)"
            @touchend="cancelBadgeHold"
            @touchmove="cancelBadgeHold"
          >
            <v-icon :icon="badge.entry.icon || 'mdi-arrow-right-circle-outline'"
              :color="badge.entry.icon_color || 'medium-emphasis'" :size="iconSize(badge.entry)" />
            <span v-if="showLabels" class="badge-label">{{ badge.entry.label || '' }}</span>
          </div>
        </template>
        <span>{{ badge.tooltipText }}</span>
      </v-tooltip>
    </div>

    <!-- Status badges (single + group) -->
    <div
      class="status-group flex-grow-1"
      :class="[isVertical ? 'flex-column' : 'flex-row']"
    >
      <template v-for="(badge, i) in statusBadges" :key="'st' + i">
        <div
          v-if="badge.type === 'divider'"
          class="statusbar-entry-divider"
          :class="{ 'statusbar-entry-divider--vertical': isVertical }"
          aria-hidden="true"
        />
        <v-tooltip v-else location="bottom">
          <template #activator="{ props: tp }">
            <div
              v-bind="tp"
              class="badge d-flex flex-column align-center ga-1"
              @click="handleBadgeClick($event, badge)"
              @dblclick="handleBadgeDoubleClick($event, badge)"
              @mousedown="startBadgeHold($event, badge)"
              @mouseup="cancelBadgeHold"
              @mouseleave="cancelBadgeHold"
              @touchstart.passive="startBadgeHold($event, badge)"
              @touchend="cancelBadgeHold"
              @touchmove="cancelBadgeHold"
            >
              <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
                <v-icon
                  :icon="badge.type === 'single' ? resolveIcon(badge) : badge.type === 'problem' ? problemIcon(badge) : (badge.entry.icon || (badge.type === 'room' ? 'mdi-sofa-outline' : 'mdi-circle'))"
                  :color="badge.type === 'problem' ? problemColor(badge) : badge.type === 'single' ? singleColor(badge) : badge.active ? (badge.entry.active_color || 'primary') : (badge.entry.inactive_color || 'medium-emphasis')"
                  :size="iconSize(badge.entry)"
                />
                <span v-if="(badge.type === 'group' && badge.entry.show_badge && badge.activeCount > 0) || (badge.type === 'problem' && badge.entry.show_badge !== false && badge.problemCount > 0)" class="status-badge">
                  {{ badge.type === 'group' ? badge.activeCount : badge.problemCount }}
                </span>
              </div>
              <span v-if="showLabels" class="badge-label"
                :style="{ color: badge.type === 'problem' ? (badge.active ? (badge.entry.active_color || undefined) : undefined) : badge.active ? (badge.entry.active_color || undefined) : undefined }">
                {{ badge.type === 'problem' ? problemLabel(badge) : badge.type === 'single' ? singleLabel(badge) : badge.entry.label || '' }}
              </span>
            </div>
          </template>
          <span>{{ badge.tooltipText }}</span>
        </v-tooltip>
      </template>
    </div>

    <!-- Nav group at end -->
    <div
      v-if="navBadges.length && !navAtStart"
      class="nav-group"
      :class="[isVertical ? 'flex-column' : 'flex-row']"
    >
      <v-tooltip v-for="(badge, i) in navBadges" :key="'ne' + i" location="bottom">
        <template #activator="{ props: tp }">
          <div
            v-bind="tp"
            class="badge d-flex flex-column align-center ga-1"
            @click="handleBadgeClick($event, badge)"
            @dblclick="handleBadgeDoubleClick($event, badge)"
            @mousedown="startBadgeHold($event, badge)"
            @mouseup="cancelBadgeHold"
            @mouseleave="cancelBadgeHold"
            @touchstart.passive="startBadgeHold($event, badge)"
            @touchend="cancelBadgeHold"
            @touchmove="cancelBadgeHold"
          >
            <v-icon :icon="badge.entry.icon || 'mdi-arrow-right-circle-outline'"
              :color="badge.entry.icon_color || 'medium-emphasis'" :size="iconSize(badge.entry)" />
            <span v-if="showLabels" class="badge-label">{{ badge.entry.label || '' }}</span>
          </div>
        </template>
        <span>{{ badge.tooltipText }}</span>
      </v-tooltip>
    </div>

  </div>

  <!-- Single entity detail -->
  <LazyLightDetailDialog v-if="singleDialogOpen && singleEntityId && singleDialogDomain === 'light'" v-model="singleDialogOpen" :entity-id="singleEntityId" />
  <LazyUpdateDetailDialog v-else-if="singleDialogOpen && singleEntityId && singleDialogDomain === 'update'" v-model="singleDialogOpen" :entity-id="singleEntityId" />
  <LazyEntityDetailDialog v-else-if="singleDialogOpen && singleEntityId && !isMediaPlayer" v-model="singleDialogOpen" :entity-id="singleEntityId" />

  <!-- Media player detail -->
  <LazyMediaPlayerDetailDialog v-if="singleDialogOpen && singleEntityId && isMediaPlayer" v-model="singleDialogOpen" :entity-id="singleEntityId" />

  <!-- Group detail -->
  <LazyStatusBarGroupDetail
    v-if="groupDetailOpen && groupEntry"
    v-model="groupDetailOpen"
    :filter="groupEntry.filter"
    :icon="groupEntry.icon"
    :label="groupEntry.label"
    :active-color="groupEntry.active_color"
    :inactive-color="groupEntry.inactive_color"
  />

  <LazyRoomCardDetailDialog
    v-if="roomDialogOpen && roomEntry"
    v-model="roomDialogOpen"
    :config="{
      name: roomEntry.label || 'Room',
      light_entity: roomEntry.light_entity,
      climate_entity: roomEntry.climate_entity,
      sensor_entity: roomEntry.sensor_entity,
      sensor_icon: roomEntry.sensor_icon,
      sensor_entities: roomEntry.sensor_entities ?? [],
      status_entities: roomEntry.status_entities ?? [],
      show_temp_control: true,
      icon: roomEntry.icon,
      card_click_action: 'none',
      card_double_click_action: 'toggle_light',
    }"
  />

  <v-dialog
    v-model="problemDialogOpen"
    max-width="520"
    :content-props="{ class: 'statusbar-problem-dialog-content' }"
  >
    <v-card rounded="xl" class="statusbar-problem-dialog">
      <LazyProblemOverviewWidget v-if="problemDialogConfig" :config="problemDialogConfig" class="statusbar-problem-overview" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { StatusBarWidgetConfig, StatusBarEntry, StatusBarGroupEntry, StatusBarNavEntry, StatusBarRoomEntry, StatusBarProblemEntry, StatusBarDividerEntry, StatusBarEntryAction } from '~/types/dashboard'
import type { HAState } from '~/types/ha'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: StatusBarWidgetConfig }>()
const { t } = useI18n()
const isVertical = computed(() => props.config.orientation === 'vertical')
const navAtStart = computed(() => props.config.nav_position === 'start')
const rootEl = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
const entityStore = useEntityStore()
const { getFilteredEntities } = useEntityGroupFilter()
const { formatEntityState } = useLocalizedEntityState()
const { autoEntityIcon, autoEntityLabel, entityIsActive, entityStateColor } = useEntityPresentation()
const router = useRouter()
const client = useHAClient()
const isNarrowMobile = computed(() => !isVertical.value && containerWidth.value > 0 && containerWidth.value < 420)
const shouldStackRows = computed(() => isNarrowMobile.value && containerHeight.value >= 84)
const isCompactMobile = computed(() => isNarrowMobile.value && !shouldStackRows.value)
const showLabels = computed(() => props.config.show_labels && !isCompactMobile.value)

type SingleBadge = { type: 'single'; entry: StatusBarEntry; active: boolean; state: string; tooltipText: string }
type GroupBadge  = { type: 'group';  entry: StatusBarGroupEntry; active: boolean; activeCount: number; tooltipText: string }
type NavBadge    = { type: 'nav';    entry: StatusBarNavEntry; tooltipText: string }
type RoomBadge   = { type: 'room';   entry: StatusBarRoomEntry; active: boolean; tooltipText: string }
type ProblemBadge = { type: 'problem'; entry: StatusBarProblemEntry; active: boolean; problemCount: number; tooltipText: string }
type DividerBadge = { type: 'divider'; entry: StatusBarDividerEntry; tooltipText: string }

const resolvedBadges = computed((): (SingleBadge | GroupBadge | NavBadge | RoomBadge | ProblemBadge | DividerBadge)[] => {
  return (props.config.entries ?? []).map((entry) => {
    if (entry.entry_type === 'divider') {
      return { type: 'divider' as const, entry, tooltipText: 'Divider' }
    }
    if (entry.entry_type === 'nav') {
      return { type: 'nav' as const, entry, tooltipText: entry.label || entry.dashboard_id }
    }
    if (entry.entry_type === 'room') {
      const roomEntry = entry as StatusBarRoomEntry
      return {
        type: 'room' as const,
        entry: roomEntry,
        active: isRoomEntryActive(roomEntry),
        tooltipText: roomEntry.label || roomEntry.light_entity || roomEntry.climate_entity || roomEntry.sensor_entity || 'room',
      }
    }
    if (entry.entry_type === 'problem') {
      const problemEntry = entry as StatusBarProblemEntry
      const problemCount = countProblems(problemEntry)
      return {
        type: 'problem' as const,
        entry: problemEntry,
        active: problemCount > 0,
        problemCount,
        tooltipText: problemTooltip(problemEntry, problemCount),
      }
    }
    if (entry.entry_type === 'group') {
      const filtered = getFilteredEntities(entry.filter)
      const activeCount = filtered.filter(e => isEntityActive(e)).length
      return {
        type: 'group' as const,
        entry,
        active: activeCount > 0,
        activeCount,
        tooltipText: entry.label ?? `${activeCount}/${filtered.length}`,
      }
    }
    const e = entry as StatusBarEntry
    const entity = entityStore.entities[e.entity_id]
    const state = entity?.state ?? 'unknown'
    const activeState = e.active_state || undefined
    const label = e.label || autoEntityLabel(entity, e.entity_id)
    return {
      type: 'single' as const,
      entry: e,
      active: entityIsActive(entity ?? e.entity_id, activeState),
      state,
      tooltipText: entity ? `${label}: ${formatEntityState(entity)}` : label,
    }
  })
})

const statusBadges = computed(() => resolvedBadges.value.filter(b => b.type !== 'nav') as (SingleBadge | GroupBadge | RoomBadge | ProblemBadge | DividerBadge)[])
const navBadges = computed(() => resolvedBadges.value.filter(b => b.type === 'nav') as NavBadge[])

const singleDialogOpen = ref(false)
const singleEntityId = ref<string | null>(null)
const singleDialogDomain = computed(() => singleEntityId.value?.split('.')[0] ?? '')
const isMediaPlayer = computed(() => singleEntityId.value?.startsWith('media_player.') ?? false)
const groupDetailOpen = ref(false)
const groupEntry = ref<StatusBarGroupEntry | null>(null)
const roomDialogOpen = ref(false)
const roomEntry = ref<StatusBarRoomEntry | null>(null)
const problemDialogOpen = ref(false)
const problemEntry = ref<StatusBarProblemEntry | null>(null)
const problemDialogConfig = computed(() => problemEntry.value ? { ...problemEntry.value, max_items: 9999 } : null)
let clickTimer: ReturnType<typeof setTimeout> | null = null
let holdTimer: ReturnType<typeof setTimeout> | null = null
let holdTriggered = false

onMounted(() => {
  if (!rootEl.value) return
  const updateSize = () => {
    if (!rootEl.value) return
    containerWidth.value = rootEl.value.clientWidth
    containerHeight.value = rootEl.value.clientHeight
  }
  updateSize()
  const observer = new ResizeObserver(updateSize)
  observer.observe(rootEl.value)
  onUnmounted(() => observer.disconnect())
})

onUnmounted(() => {
  if (clickTimer) clearTimeout(clickTimer)
  if (holdTimer) clearTimeout(holdTimer)
})

type ActionBadge = SingleBadge | GroupBadge | NavBadge | RoomBadge | ProblemBadge | DividerBadge
type StatusBarActionKind = 'click' | 'double_click' | 'hold'
const DEFAULT_IGNORED_OFFLINE_PLATFORMS = ['music_assistant', 'device_pulse', 'better_thermostat', 'fritz_profiles']
const DEFAULT_IGNORED_OFFLINE_DOMAINS = ['button']

function runDefaultAction(badge: ActionBadge) {
  if (badge.type === 'nav') {
    router.push(`/dashboard/${badge.entry.dashboard_id}`)
  } else if (badge.type === 'divider') {
    return
  } else if (badge.type === 'room') {
    roomEntry.value = badge.entry
    roomDialogOpen.value = true
  } else if (badge.type === 'problem') {
    problemEntry.value = badge.entry
    problemDialogOpen.value = true
  } else if (badge.type === 'group') {
    groupEntry.value = badge.entry
    groupDetailOpen.value = true
  } else {
    singleEntityId.value = badge.entry.entity_id
    singleDialogOpen.value = true
  }
}

function resolveBadgeAction(badge: ActionBadge, kind: StatusBarActionKind): StatusBarEntryAction {
  if (badge.type === 'divider') return 'none'
  const entry = badge.entry as StatusBarEntry | StatusBarGroupEntry | StatusBarNavEntry | StatusBarRoomEntry | StatusBarProblemEntry
  if (kind === 'click') return entry.click_action ?? 'default'
  if (kind === 'double_click') return entry.double_click_action ?? 'none'
  return entry.hold_action ?? 'none'
}

function badgeActionConfig(badge: ActionBadge, kind: StatusBarActionKind) {
  if (badge.type === 'divider') return { serviceName: undefined, targetEntityId: undefined, serviceData: undefined }
  const entry = badge.entry as unknown as Record<string, unknown>
  const prefix = kind
  return {
    serviceName: entry[`${prefix}_service`] as string | undefined,
    targetEntityId: entry[`${prefix}_target_entity`] as string | undefined,
    serviceData: entry[`${prefix}_service_data`] as string | undefined,
  }
}

function toggleEntityIdsForBadge(badge: ActionBadge) {
  if (badge.type === 'single') return [badge.entry.entity_id]
  if (badge.type === 'room') {
    const entityId = badge.entry.light_entity || badge.entry.climate_entity || badge.entry.sensor_entity
    return entityId ? [entityId] : []
  }
  if (badge.type === 'group') {
    return getFilteredEntities(badge.entry.filter)
      .filter((entity) => entity.state !== 'unavailable' && entity.state !== 'unknown')
      .map((entity) => entity.entity_id)
  }
  return []
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

async function runBadgeAction(badge: ActionBadge, kind: StatusBarActionKind) {
  const action = resolveBadgeAction(badge, kind)
  if (action === 'none') return
  if (action === 'default') {
    runDefaultAction(badge)
    return
  }
  if (action === 'open_detail') {
    runDefaultAction(badge)
    return
  }
  if (action === 'call_service') {
    const { serviceName, targetEntityId, serviceData } = badgeActionConfig(badge, kind)
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
  if (action === 'toggle') {
    const entityIds = toggleEntityIdsForBadge(badge)
    if (!entityIds.length) return
    await client.callService({
      domain: 'homeassistant',
      service: 'toggle',
      target: { entity_id: entityIds.length === 1 ? entityIds[0] : entityIds },
    })
  }
}

function handleBadgeClick(event: MouseEvent, badge: ActionBadge) {
  if (holdTriggered) {
    event.stopPropagation()
    holdTriggered = false
    return
  }
  const action = resolveBadgeAction(badge, 'click')
  if (action === 'none') return

  event.stopPropagation()
  if (clickTimer) clearTimeout(clickTimer)
  clickTimer = setTimeout(() => {
    clickTimer = null
    void runBadgeAction(badge, 'click')
  }, 220)
}

function handleBadgeDoubleClick(event: MouseEvent, badge: ActionBadge) {
  const action = resolveBadgeAction(badge, 'double_click')
  if (action === 'none') return

  event.stopPropagation()
  if (clickTimer) {
    clearTimeout(clickTimer)
    clickTimer = null
  }
  void runBadgeAction(badge, 'double_click')
}

function startBadgeHold(event: MouseEvent | TouchEvent, badge: ActionBadge) {
  const action = resolveBadgeAction(badge, 'hold')
  if (action === 'none') return

  event.stopPropagation()
  holdTriggered = false
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = setTimeout(() => {
    holdTriggered = true
    holdTimer = null
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    void runBadgeAction(badge, 'hold')
  }, 650)
}

function cancelBadgeHold() {
  if (holdTimer) {
    clearTimeout(holdTimer)
    holdTimer = null
  }
}

function resolveIcon(badge: SingleBadge): string {
  const entry = badge.entry
  const entity = entityStore.entities[entry.entity_id]
  if (entry.icon) return badge.active ? entry.icon : ((entry as any).inactive_icon || entry.icon)
  return autoEntityIcon(entity ?? entry.entity_id, badge.active)
}

function singleLabel(badge: SingleBadge) {
  const entity = entityStore.entities[badge.entry.entity_id]
  return badge.entry.label || autoEntityLabel(entity, shortState(badge.entry.entity_id))
}

function singleColor(badge: SingleBadge) {
  const entity = entityStore.entities[badge.entry.entity_id]
  if (badge.active) return badge.entry.active_color || entityStateColor(entity ?? badge.entry.entity_id, true)
  return badge.entry.inactive_color || entityStateColor(entity ?? badge.entry.entity_id, false)
}

function iconSize(entry: { icon_size?: string }) {
  if (isCompactMobile.value) return 18
  if (entry.icon_size === 'sm') return 16
  if (entry.icon_size === 'lg') return 26
  return 20
}

function isRoomEntryActive(entry: StatusBarRoomEntry) {
  const activeSource = entry.active_source ?? 'light'
  if (activeSource === 'light' && entry.light_entity) {
    return entityStore.entities[entry.light_entity]?.state === 'on'
  }
  if (activeSource === 'climate' && entry.climate_entity) {
    const state = entityStore.entities[entry.climate_entity]?.state
    return !!state && state !== 'off' && state !== 'unavailable'
  }
  if (activeSource === 'custom' && entry.active_entity_id) {
    const entity = entityStore.entities[entry.active_entity_id]
    return entityIsActive(entity ?? entry.active_entity_id, entry.active_state)
  }
  return false
}

function countProblems(entry: StatusBarProblemEntry) {
  let count = 0
  if (entry.show_system !== false && entityStore.hasConnectedOnce && !entityStore.connected) count++
  if (entry.show_repairs !== false) count += entityStore.repairIssues.filter(issue => !issue.ignored).length
  const ignoredOfflinePlatforms = ignoredOfflinePlatformsFor(entry)
  const ignoredOfflineDomains = ignoredOfflineDomainsFor(entry)
  const unavailableDeviceKeys = new Set<string>()
  const batteryDeviceKeys = new Set<string>()
  for (const entity of Object.values(entityStore.entities)) {
    if (!entity?.entity_id) continue
    if (entry.show_unavailable !== false && isUnavailable(entity, ignoredOfflinePlatforms, ignoredOfflineDomains)) {
      const key = problemGroupKey(entity, 'unavailable')
      if (!unavailableDeviceKeys.has(key)) {
        unavailableDeviceKeys.add(key)
        count++
      }
    }
    else if (entry.show_updates !== false && isPendingUpdate(entity)) count++
    else if (entry.show_alerts !== false && isAlert(entity)) count++
    else if (entry.show_batteries !== false && isLowBattery(entity, Number(entry.battery_threshold ?? 20))) {
      const key = problemGroupKey(entity, 'battery')
      if (!batteryDeviceKeys.has(key)) {
        batteryDeviceKeys.add(key)
        count++
      }
    }
    else if (entry.show_openings !== false && isOpen(entity)) count++
  }
  return count
}

function problemGroupKey(entity: HAState, kind: 'unavailable' | 'battery') {
  const name = friendlyName(entity).trim().toLowerCase()
  if (kind === 'unavailable') return `${kind}:fallback:${name}`

  const deviceId = entityStore.entityDeviceMap[entity.entity_id]
  if (deviceId) return `device:${deviceId}`

  const areaId = entityStore.entityAreaMap[entity.entity_id] ?? 'no-area'
  return `${kind}:fallback:${areaId}:${name}`
}

function problemTooltip(entry: StatusBarProblemEntry, count: number) {
  if (entry.label) return count > 0 ? `${entry.label}: ${count}` : entry.label
  return count > 0 ? t('problem_overview.count', { n: count }) : t('problem_overview.all_clear')
}

function problemLabel(badge: ProblemBadge) {
  return badge.entry.label || (badge.problemCount > 0 ? String(badge.problemCount) : t('problem_overview.all_clear'))
}

function problemIcon(badge: ProblemBadge) {
  if (badge.active) return badge.entry.icon || 'mdi-home-alert'
  return badge.entry.inactive_icon || 'mdi-shield-check-outline'
}

function problemColor(badge: ProblemBadge) {
  if (badge.active) return badge.entry.active_color || 'warning'
  return badge.entry.inactive_color || 'success'
}

function domainOf(entity: HAState) {
  return entity.entity_id.split('.')[0] ?? ''
}

function deviceClassOf(entity: HAState) {
  return entity.attributes.device_class as string | undefined
}

function friendlyName(entity: HAState) {
  return (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id
}

function isUnavailable(
  entity: HAState,
  ignoredOfflinePlatforms = ignoredOfflinePlatformsFor(),
  ignoredOfflineDomains = ignoredOfflineDomainsFor(),
) {
  if (ignoredOfflineDomains.has(domainOf(entity))) return false
  if (ignoredOfflinePlatforms.has(entityStore.entityPlatformMap[entity.entity_id] ?? '')) return false
  return entity.state === 'unavailable' || entity.state === 'unknown'
}

function ignoredOfflinePlatformsFor(entry?: StatusBarProblemEntry) {
  return new Set(
    (entry?.ignored_offline_platforms ?? DEFAULT_IGNORED_OFFLINE_PLATFORMS)
      .map(platform => platform.trim())
      .filter(Boolean),
  )
}

function ignoredOfflineDomainsFor(entry?: StatusBarProblemEntry) {
  return new Set(
    (entry?.ignored_offline_domains ?? DEFAULT_IGNORED_OFFLINE_DOMAINS)
      .map(platform => platform.trim())
      .filter(Boolean),
  )
}

function isPendingUpdate(entity: HAState) {
  return domainOf(entity) === 'update' && (entity.state === 'on' || isUpdateRunning(entity))
}

function isUpdateRunning(entity: HAState) {
  const raw = entity.attributes.in_progress
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw > 0
  if (typeof raw === 'string') return raw === 'true' || raw === 'installing' || raw === 'downloading'
  return false
}

function isAlert(entity: HAState) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'alarm_control_panel') return ['triggered', 'pending'].includes(entity.state)
  if (domain !== 'binary_sensor' || entity.state !== 'on') return false
  return ['problem', 'safety', 'smoke', 'moisture', 'gas', 'heat', 'tamper'].includes(deviceClass ?? '')
}

function isLowBattery(entity: HAState, threshold: number) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'binary_sensor' && deviceClass === 'battery') return entity.state === 'on'
  if (domain !== 'sensor') return false

  if (deviceClass !== 'battery' || !isPlainNumericState(entity.state)) return false

  const value = Number.parseFloat(entity.state)
  return Number.isFinite(value) && value <= threshold
}

function isOpen(entity: HAState) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'binary_sensor') {
    return entity.state === 'on' && ['door', 'window', 'garage_door'].includes(deviceClass ?? '')
  }
  if (domain === 'cover') return ['open', 'opening'].includes(entity.state)
  return false
}

function isPlainNumericState(state: string) {
  return /^-?\d+(\.\d+)?$/.test(state.trim())
}

function isEntityActive(entity: { entity_id: string; state: string }): boolean {
  return entityIsActive({ ...entity, attributes: {} })
}

function shortState(entityId: string) {
  const label = formatEntityState(entityStore.entities[entityId])
  return label.length > 6 ? label.slice(0, 5) + '…' : label
}
</script>

<style scoped>
.statusbar-root {
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.statusbar-root::-webkit-scrollbar {
  display: none;
}

.statusbar-root--compact {
  gap: 4px;
}

.statusbar-root--stacked {
  flex-wrap: wrap;
  align-content: flex-start;
  overflow: visible;
  touch-action: auto;
}

.statusbar-root--stacked .nav-group,
.statusbar-root--stacked .status-group {
  width: 100%;
  flex: 0 0 100%;
}

.statusbar-root--stacked .status-group {
  justify-content: flex-start;
}

.nav-group,
.status-group {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 8px;
  row-gap: 4px;
}

.nav-group.flex-column,
.status-group.flex-column {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 6px;
}

.statusbar-entry-divider {
  align-self: stretch;
  width: 1px;
  min-height: 22px;
  flex: 0 0 1px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.16);
}

.statusbar-entry-divider--vertical {
  align-self: stretch;
  width: auto;
  height: 1px;
  min-height: 0;
  min-width: 22px;
  flex: 0 0 1px;
}

.badge {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.15s;
  min-width: 24px;
  align-items: center;
}

.statusbar-root--compact .nav-group,
.statusbar-root--compact .status-group {
  flex-wrap: nowrap;
  gap: 4px;
  row-gap: 0;
}

.statusbar-root--compact .badge {
  padding: 1px 2px;
  min-width: 20px;
}

.badge:hover {
  background: rgba(255, 255, 255, 0.08);
}

.badge-label {
  font-size: 9px;
  line-height: 1.2;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  word-break: break-word;
  white-space: normal;
  max-width: 56px;
}

.status-badge {
  position: absolute;
  top: -2px;
  right: -4px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

:global(.statusbar-problem-dialog-content) {
  width: min(520px, calc(100vw - 32px));
  height: min(545px, calc(100vh - 80px));
  max-height: calc(100vh - 80px);
}

.statusbar-problem-dialog {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}

.statusbar-problem-overview {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
