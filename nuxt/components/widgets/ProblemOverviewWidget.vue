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
        @click="openDetail(problem.entityId)"
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
</template>

<script setup lang="ts">
import type { HAState } from '~/types/ha'
import type { ProblemOverviewWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: ProblemOverviewWidgetConfig }>()
const { t } = useI18n()
const { formatEntityState } = useLocalizedEntityState()
const entityStore = useEntityStore()

type ProblemKind = 'unavailable' | 'battery' | 'opening' | 'update' | 'alert'
type ProblemTab = 'all' | ProblemKind

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
const tabsEl = ref<HTMLElement | null>(null)
const activeTab = ref<ProblemTab>('all')
const title = computed(() => props.config.name || t('widget.problem_overview.label'))
const threshold = computed(() => Number(props.config.battery_threshold ?? 20))
const maxItems = computed(() => Math.max(1, Number(props.config.max_items ?? 8)))

const problemCount = computed(() => problems.value.length)
const filteredProblems = computed(() =>
  activeTab.value === 'all'
    ? problems.value
    : problems.value.filter(problem => problem.kind === activeTab.value),
)
const visibleProblems = computed(() => filteredProblems.value.slice(0, maxItems.value))
const hiddenCount = computed(() => Math.max(0, filteredProblems.value.length - visibleProblems.value.length))
const tabs = computed(() => {
  const counts = {
    all: problems.value.length,
    update: countKind('update'),
    battery: countKind('battery'),
    unavailable: countKind('unavailable'),
    opening: countKind('opening'),
    alert: countKind('alert'),
  }

  return [
    { key: 'all' as const, label: t('problem_overview.tab_all'), icon: 'mdi-format-list-bulleted', count: counts.all },
    { key: 'update' as const, label: t('problem_overview.tab_updates'), icon: 'mdi-update', count: counts.update },
    { key: 'battery' as const, label: t('problem_overview.tab_batteries'), icon: 'mdi-battery-alert-variant-outline', count: counts.battery },
    { key: 'unavailable' as const, label: t('problem_overview.tab_unavailable'), icon: 'mdi-cloud-alert-outline', count: counts.unavailable },
    { key: 'opening' as const, label: t('problem_overview.tab_openings'), icon: 'mdi-door-open', count: counts.opening },
    { key: 'alert' as const, label: t('problem_overview.tab_alerts'), icon: 'mdi-alert-circle-outline', count: counts.alert },
  ].filter(tab => tab.key === 'all' || tab.count > 0)
})

const problems = computed(() => {
  const items: ProblemItem[] = []

  for (const entity of Object.values(entityStore.entities)) {
    if (!entity?.entity_id) continue

    if (props.config.show_unavailable !== false && isUnavailable(entity)) {
      items.push(toProblem(entity, 'unavailable'))
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
      items.push(toProblem(entity, 'battery'))
      continue
    }

    if (props.config.show_openings !== false && isOpen(entity)) {
      items.push(toProblem(entity, 'opening'))
    }
  }

  return items.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))
})

watch(tabs, (currentTabs) => {
  if (!currentTabs.some(tab => tab.key === activeTab.value)) activeTab.value = 'all'
})

function countKind(kind: ProblemKind) {
  return problems.value.filter(problem => problem.kind === kind).length
}

function handleTabsWheel(event: WheelEvent) {
  if (!tabsEl.value || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
  tabsEl.value.scrollLeft += event.deltaY
}

function openDetail(entityId: string) {
  detailEntityId.value = entityId
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
  return entity.state === 'unavailable' || entity.state === 'unknown'
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

  const unit = entity.attributes.unit_of_measurement as string | undefined
  const name = `${entity.entity_id} ${friendlyName(entity)}`.toLowerCase()
  const looksLikeBattery = deviceClass === 'battery' || unit === '%' || /battery|batterie|akku/.test(name)
  if (!looksLikeBattery) return false
  if (deviceClass !== 'battery' && unit !== '%' && !isPlainNumericState(entity.state)) return false

  const value = Number.parseFloat(entity.state)
  return Number.isFinite(value) && value <= threshold.value
}

function isOpen(entity: HAState) {
  const domain = domainOf(entity)
  const deviceClass = deviceClassOf(entity)
  if (domain === 'binary_sensor') {
    return entity.state === 'on' && ['door', 'window', 'garage_door', 'opening'].includes(deviceClass ?? '')
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
    return { label: formatEntityState(entity), icon: alertIcon(entity), color: 'error', priority: 30 }
  }
  if (kind === 'battery') {
    return { label: batteryLabel(entity), icon: 'mdi-battery-alert-variant-outline', color: 'warning', priority: 40 }
  }
  return { label: formatEntityState(entity), icon: openingIcon(entity), color: 'warning', priority: 50 }
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

function alertIcon(entity: HAState) {
  const deviceClass = deviceClassOf(entity)
  if (deviceClass === 'smoke') return 'mdi-smoke-detector-alert'
  if (deviceClass === 'moisture') return 'mdi-water-alert-outline'
  if (deviceClass === 'gas') return 'mdi-gas-cylinder'
  if (deviceClass === 'tamper') return 'mdi-shield-alert-outline'
  return 'mdi-alert-circle-outline'
}

function openingIcon(entity: HAState) {
  const deviceClass = deviceClassOf(entity)
  if (deviceClass === 'door' || deviceClass === 'garage_door') return 'mdi-door-open'
  if (deviceClass === 'window') return 'mdi-window-open'
  if (domainOf(entity) === 'cover') return 'mdi-window-shutter-open'
  return 'mdi-checkbox-blank-circle-outline'
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
