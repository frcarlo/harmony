<template>
  <div class="h-100 d-flex px-2 py-2" :class="isVertical ? 'flex-column align-center' : 'align-center'" style="gap: 8px; overflow: hidden;">

    <!-- Nav group at start -->
    <div v-if="navBadges.length && navAtStart" class="nav-group" :class="isVertical ? 'flex-column' : 'flex-row'">
      <v-tooltip v-for="(badge, i) in navBadges" :key="'ns' + i" :text="badge.tooltipText" location="bottom">
        <template #activator="{ props: tp }">
          <div v-bind="tp" class="badge d-flex flex-column align-center ga-1" @click="handleClick(badge)">
            <v-icon :icon="badge.entry.icon || 'mdi-arrow-right-circle-outline'"
              :color="badge.entry.icon_color || 'medium-emphasis'" :size="iconSize(badge.entry)" />
            <span v-if="config.show_labels" class="badge-label">{{ badge.entry.label || '' }}</span>
          </div>
        </template>
      </v-tooltip>
    </div>

    <!-- Status badges (single + group) -->
    <div class="status-group flex-grow-1" :class="isVertical ? 'flex-column' : 'flex-row'">
      <v-tooltip v-for="(badge, i) in statusBadges" :key="'st' + i" :text="badge.tooltipText" location="bottom">
        <template #activator="{ props: tp }">
          <div v-bind="tp" class="badge d-flex flex-column align-center ga-1" @click="handleClick(badge)">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <v-icon
                :icon="badge.entry.icon || 'mdi-circle'"
                :color="badge.active ? (badge.entry.active_color || 'primary') : (badge.entry.inactive_color || 'medium-emphasis')"
                :size="iconSize(badge.entry)"
              />
              <span v-if="badge.type === 'group' && badge.entry.show_badge && badge.activeCount > 0" class="status-badge">
                {{ badge.activeCount }}
              </span>
            </div>
            <span v-if="config.show_labels" class="badge-label"
              :style="{ color: badge.active ? (badge.entry.active_color || undefined) : undefined }">
              {{ badge.entry.label || (badge.type === 'single' ? shortState(badge.state) : '') }}
            </span>
          </div>
        </template>
      </v-tooltip>
    </div>

    <!-- Nav group at end -->
    <div v-if="navBadges.length && !navAtStart" class="nav-group" :class="isVertical ? 'flex-column' : 'flex-row'">
      <v-tooltip v-for="(badge, i) in navBadges" :key="'ne' + i" :text="badge.tooltipText" location="bottom">
        <template #activator="{ props: tp }">
          <div v-bind="tp" class="badge d-flex flex-column align-center ga-1" @click="handleClick(badge)">
            <v-icon :icon="badge.entry.icon || 'mdi-arrow-right-circle-outline'"
              :color="badge.entry.icon_color || 'medium-emphasis'" :size="iconSize(badge.entry)" />
            <span v-if="config.show_labels" class="badge-label">{{ badge.entry.label || '' }}</span>
          </div>
        </template>
      </v-tooltip>
    </div>

  </div>

  <!-- Single entity detail -->
  <EntityDetailDialog v-if="singleDialogOpen && singleEntityId" v-model="singleDialogOpen" :entity-id="singleEntityId" />

  <!-- Group detail -->
  <StatusBarGroupDetail
    v-if="groupDetailOpen && groupEntry"
    v-model="groupDetailOpen"
    :filter="groupEntry.filter"
    :icon="groupEntry.icon"
    :label="groupEntry.label"
    :active-color="groupEntry.active_color"
    :inactive-color="groupEntry.inactive_color"
  />
</template>

<script setup lang="ts">
import type { StatusBarWidgetConfig, StatusBarEntry, StatusBarGroupEntry, StatusBarNavEntry } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: StatusBarWidgetConfig }>()
const isVertical = computed(() => props.config.orientation === 'vertical')
const navAtStart = computed(() => props.config.nav_position === 'start')
const entityStore = useEntityStore()
const { getFilteredEntities } = useEntityGroupFilter()
const router = useRouter()

type SingleBadge = { type: 'single'; entry: StatusBarEntry; active: boolean; state: string; tooltipText: string }
type GroupBadge  = { type: 'group';  entry: StatusBarGroupEntry; active: boolean; activeCount: number; tooltipText: string }
type NavBadge    = { type: 'nav';    entry: StatusBarNavEntry; tooltipText: string }

const resolvedBadges = computed((): (SingleBadge | GroupBadge | NavBadge)[] => {
  return (props.config.entries ?? []).map((entry) => {
    if (entry.entry_type === 'nav') {
      return { type: 'nav' as const, entry, tooltipText: entry.label || entry.dashboard_id }
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
    const activeState = e.active_state ?? 'on'
    return {
      type: 'single' as const,
      entry: e,
      active: state === activeState,
      state,
      tooltipText: e.label || e.entity_id,
    }
  })
})

const statusBadges = computed(() => resolvedBadges.value.filter(b => b.type !== 'nav') as (SingleBadge | GroupBadge)[])
const navBadges = computed(() => resolvedBadges.value.filter(b => b.type === 'nav') as NavBadge[])

const singleDialogOpen = ref(false)
const singleEntityId = ref<string | null>(null)
const groupDetailOpen = ref(false)
const groupEntry = ref<StatusBarGroupEntry | null>(null)

function handleClick(badge: SingleBadge | GroupBadge | NavBadge) {
  if (badge.type === 'nav') {
    router.push(`/dashboard/${badge.entry.dashboard_id}`)
  } else if (badge.type === 'group') {
    groupEntry.value = badge.entry
    groupDetailOpen.value = true
  } else {
    singleEntityId.value = badge.entry.entity_id
    singleDialogOpen.value = true
  }
}

function iconSize(entry: { icon_size?: string }) {
  if (entry.icon_size === 'sm') return 16
  if (entry.icon_size === 'lg') return 26
  return 20
}

function isEntityActive(entity: { entity_id: string; state: string }): boolean {
  const domain = entity.entity_id.split('.')[0]
  if (domain === 'cover') return entity.state === 'open' || entity.state === 'opening'
  return entity.state === 'on'
}

function shortState(state: string) {
  return state.length > 6 ? state.slice(0, 5) + '…' : state
}
</script>

<style scoped>
.nav-group,
.status-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  row-gap: 4px;
}

.nav-group.flex-column,
.status-group.flex-column {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: 6px;
}

.badge {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.15s;
  min-width: 24px;
  align-items: center;
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
</style>
