<template>
  <div class="h-100 d-flex flex-column pa-3 ga-3 problem-overview">
    <div class="d-flex align-center ga-2 flex-shrink-0">
      <v-icon :icon="problemCount ? 'mdi-home-alert' : 'mdi-check-circle-outline'"
        :color="problemCount ? 'warning' : 'success'" size="28" />
      <div class="min-w-0">
        <div class="text-body-2 font-weight-semibold text-truncate">{{ title }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ problemCount ? t('problem_overview.count', { n: problemCount }) : t('problem_overview.all_clear') }}
        </div>
      </div>
    </div>

    <div v-if="problemCount" ref="tabsEl" class="problem-overview__tabs" @wheel.passive="handleTabsWheel">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="problem-overview__tab"
        :class="{ 'problem-overview__tab--active': activeTab === tab.key }"
        type="button"
        @click="activeTab = tab.key"
      >
        <v-icon :icon="tab.icon" size="16" />
        <span>{{ tab.label }}</span>
        <span class="problem-overview__tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <div v-if="visibleProblems.length" class="problem-overview__list">
      <button
        v-for="problem in visibleProblems"
        :key="`${problem.kind}:${problem.entityId}`"
        class="problem-overview__item"
        type="button"
        @click="openProblemDetail(problem)"
      >
        <v-icon :icon="problem.icon" :color="problem.color" size="22" class="flex-shrink-0" />
        <span class="problem-overview__item-text">
          <span class="problem-overview__item-name">{{ problem.name }}</span>
          <span class="problem-overview__item-state">{{ problem.label }}</span>
          <span v-if="problem.detail" class="problem-overview__item-detail">{{ problem.detail }}</span>
        </span>
      </button>
    </div>

    <div v-else class="problem-overview__empty">
      <v-icon icon="mdi-shield-check-outline" size="42" color="success" />
      <span>{{ t('problem_overview.empty_hint') }}</span>
    </div>

    <div v-if="hiddenCount > 0" class="text-caption text-medium-emphasis flex-shrink-0">
      {{ t('problem_overview.more', { n: hiddenCount }) }}
    </div>
  </div>

  <LazyUpdateDetailDialog v-if="detailOpen && detailEntityId?.startsWith('update.')" v-model="detailOpen" :entity-id="detailEntityId" />
  <LazyEntityDetailDialog v-else-if="detailOpen && detailEntityId" v-model="detailOpen" :entity-id="detailEntityId" />

  <v-dialog v-model="repairDialogOpen" max-width="460">
    <v-card v-if="selectedRepairIssue" rounded="lg">
      <v-card-title class="d-flex align-center ga-2">
        <v-icon :icon="selectedRepairIssue.translation_key === 'restart_required' ? 'mdi-restart-alert' : 'mdi-wrench-clock'" color="warning" />
        <span>{{ repairName(selectedRepairIssue) }}</span>
      </v-card-title>
      <v-card-text class="d-flex flex-column ga-3">
        <div>
          <div class="text-body-2 font-weight-medium">
            {{ selectedRepairIssue.translation_key === 'restart_required' ? t('problem_overview.restart_required') : t('problem_overview.repair') }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ repairDetail(selectedRepairIssue) }}
          </div>
        </div>

        <v-alert v-if="selectedRepairIssue.translation_key === 'restart_required'" type="warning" variant="tonal" density="compact">
          {{ t('problem_overview.restart_hint') }}
        </v-alert>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="repairDialogOpen = false">{{ t('common.close') }}</v-btn>
        <v-btn
          v-if="selectedRepairIssue.translation_key === 'restart_required'"
          color="warning"
          variant="flat"
          :loading="restartBusy"
          prepend-icon="mdi-restart"
          @click="restartHomeAssistant"
        >
          {{ t('problem_overview.restart_homeassistant') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { HARepairIssue, HAState } from '~/types/ha'
import type { ProblemOverviewWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: ProblemOverviewWidgetConfig }>()
const { t } = useI18n()
const { formatEntityState } = useLocalizedEntityState()
const { autoEntityIcon } = useEntityPresentation()
const entityStore = useEntityStore()
const client = useHAClient()

type ProblemKind = 'unavailable' | 'battery' | 'opening' | 'update' | 'alert' | 'repair' | 'system'
type ProblemTab = 'all' | ProblemKind
const DEFAULT_IGNORED_OFFLINE_PLATFORMS = ['music_assistant', 'device_pulse', 'better_thermostat', 'fritz_profiles']
const DEFAULT_IGNORED_OFFLINE_DOMAINS = ['button']

interface ProblemItem {
  entityId: string
  kind: ProblemKind
  name: string
  label: string
  detail?: string
  icon: string
  color: string
  priority: number
}

const detailOpen = ref(false)
const detailEntityId = ref<string | null>(null)
const repairDialogOpen = ref(false)
const selectedRepairEntityId = ref<string | null>(null)
const restartBusy = ref(false)
const tabsEl = ref<HTMLElement | null>(null)
const activeTab = ref<ProblemTab>('all')
const title = computed(() => props.config.name || t('widget.problem_overview.label'))
const threshold = computed(() => Number(props.config.battery_threshold ?? 20))
const maxItems = computed(() => Math.max(1, Number(props.config.max_items ?? 8)))

const ignoredOfflinePlatforms = computed(() => new Set(
  (props.config.ignored_offline_platforms ?? DEFAULT_IGNORED_OFFLINE_PLATFORMS)
    .map(platform => platform.trim())
    .filter(Boolean),
))

const ignoredOfflineDomains = computed(() => new Set(
  (props.config.ignored_offline_domains ?? DEFAULT_IGNORED_OFFLINE_DOMAINS)
    .map(domain => domain.trim())
    .filter(Boolean),
))

const allProblems = computed(() => dedupeAllProblems(problems.value))
const problemCount = computed(() => allProblems.value.length)
const filteredProblems = computed(() =>
  activeTab.value === 'all'
    ? allProblems.value
    : problems.value.filter(problem => problem.kind === activeTab.value),
)
const visibleProblems = computed(() => filteredProblems.value.slice(0, maxItems.value))
const hiddenCount = computed(() => Math.max(0, filteredProblems.value.length - visibleProblems.value.length))
const selectedRepairIssue = computed(() => selectedRepairEntityId.value
  ? entityStore.repairIssues.find(issue => repairEntityId(issue) === selectedRepairEntityId.value) ?? null
  : null)
const tabs = computed(() => {
  const counts = {
    all: allProblems.value.length,
    update: countKind('update'),
    battery: countKind('battery'),
    unavailable: countKind('unavailable'),
    repair: countKind('repair'),
    system: countKind('system'),
    opening: countKind('opening'),
    alert: countKind('alert'),
  }

  return [
    { key: 'all' as const, label: t('problem_overview.tab_all'), icon: 'mdi-format-list-bulleted', count: counts.all },
    { key: 'update' as const, label: t('problem_overview.tab_updates'), icon: 'mdi-update', count: counts.update },
    { key: 'battery' as const, label: t('problem_overview.tab_batteries'), icon: 'mdi-battery-alert-variant-outline', count: counts.battery },
    { key: 'unavailable' as const, label: t('problem_overview.tab_unavailable'), icon: 'mdi-cloud-alert-outline', count: counts.unavailable },
    { key: 'system' as const, label: t('problem_overview.tab_system'), icon: 'mdi-home-assistant', count: counts.system },
    { key: 'repair' as const, label: t('problem_overview.tab_repairs'), icon: 'mdi-wrench-clock', count: counts.repair },
    { key: 'opening' as const, label: t('problem_overview.tab_openings'), icon: 'mdi-door-open', count: counts.opening },
    { key: 'alert' as const, label: t('problem_overview.tab_alerts'), icon: 'mdi-alert-circle-outline', count: counts.alert },
  ].filter(tab => tab.key === 'all' || tab.count > 0)
})

const problems = computed(() => {
  const items: ProblemItem[] = []
  const unavailableByDevice = new Map<string, { item: ProblemItem; entity: HAState }>()
  const batteriesByDevice = new Map<string, { item: ProblemItem; entity: HAState }>()

  if (props.config.show_system !== false && entityStore.hasConnectedOnce && !entityStore.connected) {
    items.push(toSystemProblem())
  }

  if (props.config.show_repairs !== false) {
    items.push(...entityStore.repairIssues.filter(issue => !issue.ignored).map(toRepairProblem))
  }

  for (const entity of Object.values(entityStore.entities)) {
    if (!entity?.entity_id) continue

    if (props.config.show_unavailable !== false && isUnavailable(entity)) {
      addDeviceProblem(unavailableByDevice, entity, 'unavailable', unavailableEntityRank)
      continue
    }

    if (props.config.show_updates !== false && isPendingUpdate(entity)) {
      items.push(toProblem(entity, 'update'))
      continue
    }

    if (props.config.show_alerts !== false && isAlert(entity)) {
      items.push(toProblem(entity, 'alert'))
      continue
    }

    if (props.config.show_batteries !== false && isLowBattery(entity)) {
      addBatteryProblem(batteriesByDevice, entity)
      continue
    }

    if (props.config.show_openings !== false && isOpen(entity)) {
      items.push(toProblem(entity, 'opening'))
    }
  }

  items.push(...Array.from(unavailableByDevice.values()).map(entry => entry.item))
  items.push(...Array.from(batteriesByDevice.values()).map(entry => entry.item))
  return items.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
})

watch(tabs, (currentTabs) => {
  if (!currentTabs.some(tab => tab.key === activeTab.value)) activeTab.value = 'all'
})

function countKind(kind: ProblemKind) {
  return problems.value.filter(problem => problem.kind === kind).length
}

function dedupeAllProblems(items: ProblemItem[]) {
  const byDisplayKey = new Map<string, ProblemItem>()
  for (const item of items) {
    const key = problemDisplayKey(item)
    const current = byDisplayKey.get(key)
    if (!current || item.priority < current.priority) byDisplayKey.set(key, item)
  }
  return Array.from(byDisplayKey.values())
}

function problemDisplayKey(item: ProblemItem) {
  const deviceId = entityStore.entityDeviceMap[item.entityId]
  const areaId = entityStore.entityAreaMap[item.entityId]
  const scope = deviceId ? `device:${deviceId}` : areaId ? `area:${areaId}` : 'global'
  return `${item.kind}:${scope}:${item.name.toLowerCase()}:${item.label.toLowerCase()}`
}

function handleTabsWheel(event: WheelEvent) {
  if (!tabsEl.value || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
  tabsEl.value.scrollLeft += event.deltaY
}

function openProblemDetail(problem: ProblemItem) {
  if (problem.kind === 'repair') {
    selectedRepairEntityId.value = problem.entityId
    repairDialogOpen.value = true
    return
  }
  if (!problem.entityId.includes('.')) return
  detailEntityId.value = problem.entityId
  detailOpen.value = true
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

function isUnavailable(entity: HAState) {
  if (ignoredOfflineDomains.value.has(domainOf(entity))) return false
  if (ignoredOfflinePlatforms.value.has(entityStore.entityPlatformMap[entity.entity_id] ?? '')) return false
  return entity.state === 'unavailable' || entity.state === 'unknown'
}

function addDeviceProblem(
  target: Map<string, { item: ProblemItem; entity: HAState }>,
  entity: HAState,
  kind: ProblemKind,
  rank: (entity: HAState) => number,
) {
  const key = problemGroupKey(entity, kind)
  const current = target.get(key)
  if (!current || rank(entity) < rank(current.entity)) {
    target.set(key, { item: toProblem(entity, kind), entity })
  }
}

function problemGroupKey(entity: HAState, kind: ProblemKind) {
  const name = friendlyName(entity).trim().toLowerCase()
  if (kind === 'unavailable') return `${kind}:fallback:${name}`

  const deviceId = entityStore.entityDeviceMap[entity.entity_id]
  if (deviceId) return `device:${deviceId}`

  const areaId = entityStore.entityAreaMap[entity.entity_id] ?? 'no-area'
  return `${kind}:fallback:${areaId}:${name}`
}

function unavailableEntityRank(entity: HAState) {
  const domain = domainOf(entity)
  if (domain === 'device_tracker') return 0
  if (domain === 'media_player') return 1
  if (domain === 'climate') return 2
  if (domain === 'light') return 3
  if (domain === 'switch') return 4
  if (domain === 'sensor' || domain === 'binary_sensor') return 6
  return 5
}

function isPendingUpdate(entity: HAState) {
  return domainOf(entity) === 'update' && (entity.state === 'on' || isUpdateRunning(entity))
}

function isAlert(entity: HAState) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'alarm_control_panel') return ['triggered', 'pending'].includes(entity.state)
  if (domain !== 'binary_sensor' || entity.state !== 'on') return false
  return ['problem', 'safety', 'smoke', 'moisture', 'gas', 'heat', 'tamper'].includes(deviceClass ?? '')
}

function isLowBattery(entity: HAState) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'binary_sensor' && deviceClass === 'battery') return entity.state === 'on'
  if (domain !== 'sensor') return false

  if (deviceClass !== 'battery' || !isPlainNumericState(entity.state)) return false

  const value = Number.parseFloat(entity.state)
  return Number.isFinite(value) && value <= threshold.value
}

function addBatteryProblem(target: Map<string, { item: ProblemItem; entity: HAState }>, entity: HAState) {
  addDeviceProblem(target, entity, 'battery', batteryEntityRank)
}

function batteryEntityRank(entity: HAState) {
  const domain = domainOf(entity)
  const unit = entity.attributes.unit_of_measurement as string | undefined
  const entityName = `${entity.entity_id} ${friendlyName(entity)}`.toLowerCase()
  if (domain === 'sensor' && unit === '%' && /battery_level|batterie_level|ladestand|battery level/.test(entityName)) return 0
  if (domain === 'sensor' && unit === '%') return 1
  if (domain === 'sensor') return 2
  return 3
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

function toProblem(entity: HAState, kind: ProblemKind): ProblemItem {
  const meta = problemMeta(kind, entity)
  return {
    entityId: entity.entity_id,
    kind,
    name: friendlyName(entity),
    label: meta.label,
    detail: kind === 'battery' ? entity.entity_id : undefined,
    icon: meta.icon,
    color: meta.color,
    priority: meta.priority,
  }
}

function toRepairProblem(issue: HARepairIssue): ProblemItem {
  const name = repairName(issue)
  return {
    entityId: repairEntityId(issue),
    kind: 'repair',
    name,
    label: issue.translation_key === 'restart_required'
      ? t('problem_overview.restart_required')
      : t('problem_overview.repair'),
    detail: repairDetail(issue),
    icon: issue.translation_key === 'restart_required' ? 'mdi-restart-alert' : 'mdi-wrench-clock',
    color: issue.severity === 'error' || issue.severity === 'critical' ? 'error' : 'warning',
    priority: 20,
  }
}

function repairEntityId(issue: HARepairIssue) {
  return `repair:${issue.domain ?? 'homeassistant'}:${issue.issue_id}`
}

function toSystemProblem(): ProblemItem {
  return {
    entityId: 'system:homeassistant:connection',
    kind: 'system',
    name: 'Home Assistant',
    label: t('problem_overview.ha_reconnecting'),
    detail: t('problem_overview.ha_reconnecting_detail'),
    icon: 'mdi-home-assistant',
    color: 'warning',
    priority: 5,
  }
}

function repairName(issue: HARepairIssue) {
  const placeholders = issue.translation_placeholders ?? {}
  return String(placeholders.name || placeholders.title || issue.issue_domain || issue.domain || issue.issue_id)
}

function repairDetail(issue: HARepairIssue) {
  if (issue.issue_domain && issue.domain && issue.issue_domain !== issue.domain) return issue.domain
  return issue.issue_domain ?? issue.domain ?? undefined
}

async function restartHomeAssistant() {
  if (restartBusy.value) return
  restartBusy.value = true
  try {
    await client.callService({ domain: 'homeassistant', service: 'restart' })
    repairDialogOpen.value = false
  } finally {
    restartBusy.value = false
  }
}

function problemMeta(kind: ProblemKind, entity: HAState) {
  if (kind === 'unavailable') {
    return { label: t('problem_overview.unavailable'), icon: 'mdi-cloud-alert-outline', color: 'error', priority: 10 }
  }
  if (kind === 'update') {
    return {
      label: updateLabel(entity),
      icon: isUpdateRunning(entity) ? 'mdi-progress-download' : 'mdi-update',
      color: isUpdateRunning(entity) ? 'primary' : 'info',
      priority: isUpdateRunning(entity) ? 15 : 20,
    }
  }
  if (kind === 'alert') {
    return { label: formatEntityState(entity), icon: autoEntityIcon(entity, true), color: 'error', priority: 30 }
  }
  if (kind === 'battery') {
    return { label: batteryLabel(entity), icon: 'mdi-battery-alert-variant-outline', color: 'warning', priority: 40 }
  }
  return { label: formatEntityState(entity), icon: autoEntityIcon(entity, true), color: 'warning', priority: 50 }
}

function batteryLabel(entity: HAState) {
  const value = Number.parseFloat(entity.state)
  if (Number.isFinite(value)) return t('problem_overview.low_battery_value', { n: Math.round(value) })
  return t('problem_overview.low_battery')
}

function isUpdateRunning(entity: HAState) {
  const raw = entity.attributes.in_progress
  if (typeof raw === 'boolean') return raw
  if (typeof raw === 'number') return raw > 0
  if (typeof raw === 'string') return raw === 'true' || raw === 'installing' || raw === 'downloading'
  return false
}

function updateLabel(entity: HAState) {
  if (!isUpdateRunning(entity)) return t('problem_overview.update')

  const progress = updateProgress(entity)
  if (progress !== undefined) return t('problem_overview.update_running_progress', { n: progress })
  return t('problem_overview.update_running')
}

function updateProgress(entity: HAState) {
  const candidates = [
    entity.attributes.update_percentage,
    entity.attributes.progress,
    entity.attributes.install_progress,
    entity.attributes.in_progress,
  ]
  for (const candidate of candidates) {
    const value = typeof candidate === 'number' ? candidate : typeof candidate === 'string' ? Number.parseFloat(candidate) : NaN
    if (Number.isFinite(value) && value > 0 && value <= 100) return Math.round(value)
  }
  return undefined
}

function isPlainNumericState(state: string) {
  return /^-?\d+(\.\d+)?$/.test(state.trim())
}

</script>

<style scoped>
.problem-overview {
  height: 100%;
  min-width: 0;
  overflow: hidden;
}

.problem-overview__list {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 6px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.problem-overview__list::-webkit-scrollbar {
  display: none;
}

.problem-overview__tabs {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  margin-right: -4px;
  margin-left: -4px;
  max-width: calc(100% + 8px);
  padding: 0 4px 2px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.problem-overview__tabs::-webkit-scrollbar {
  display: none;
}

.problem-overview__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  background: rgba(var(--v-theme-on-surface), 0.055);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.problem-overview__tab--active {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
}

.problem-overview__tab-count {
  min-width: 18px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.12);
  font-size: 0.6875rem;
  text-align: center;
}

.problem-overview__tab--active .problem-overview__tab-count {
  background: rgba(var(--v-theme-on-primary), 0.2);
}

.problem-overview__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 7px 9px;
  border: 0;
  border-radius: 8px;
  color: inherit;
  text-align: left;
  background: rgba(var(--v-theme-on-surface), 0.055);
  cursor: pointer;
}

.problem-overview__item:hover {
  background: rgba(var(--v-theme-on-surface), 0.09);
}

.problem-overview__item-text {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  line-height: 1.15;
}

.problem-overview__item-name,
.problem-overview__item-state,
.problem-overview__item-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.problem-overview__item-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.problem-overview__item-state {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.75rem;
}

.problem-overview__item-detail {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.6875rem;
}

.problem-overview__empty {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  text-align: center;
}
</style>
