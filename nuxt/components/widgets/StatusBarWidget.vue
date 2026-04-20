<template>
  <div class="h-100 d-flex align-center px-2 gap-wrap">
    <template v-for="(badge, i) in resolvedBadges" :key="i">
      <v-tooltip :text="badge.tooltipText" location="bottom">
        <template #activator="{ props: tp }">
          <div v-bind="tp" class="badge d-flex flex-column align-center ga-1" @click="handleClick(badge)">
            <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <v-icon
                :icon="badge.entry.icon || 'mdi-circle'"
                :color="badge.active ? (badge.entry.active_color || 'primary') : (badge.entry.inactive_color || 'medium-emphasis')"
                :size="iconSize(badge.entry)"
              />
              <span
                v-if="badge.type === 'group' && badge.entry.show_badge && badge.activeCount > 0"
                class="status-badge"
              >{{ badge.activeCount }}</span>
            </div>
            <span v-if="config.show_labels" class="badge-label"
              :style="{ color: badge.active ? (badge.entry.active_color || undefined) : undefined }">
              {{ badge.entry.label || (badge.type === 'single' ? shortState(badge.state) : '') }}
            </span>
          </div>
        </template>
      </v-tooltip>
    </template>
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
import type { StatusBarWidgetConfig, StatusBarEntry, StatusBarGroupEntry } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: StatusBarWidgetConfig }>()
const entityStore = useEntityStore()
const { getFilteredEntities } = useEntityGroupFilter()

type SingleBadge = { type: 'single'; entry: StatusBarEntry; active: boolean; state: string; tooltipText: string }
type GroupBadge = { type: 'group'; entry: StatusBarGroupEntry; active: boolean; activeCount: number; tooltipText: string }

const resolvedBadges = computed((): (SingleBadge | GroupBadge)[] => {
  return (props.config.entries ?? []).map((entry) => {
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

const singleDialogOpen = ref(false)
const singleEntityId = ref<string | null>(null)
const groupDetailOpen = ref(false)
const groupEntry = ref<StatusBarGroupEntry | null>(null)

function handleClick(badge: SingleBadge | GroupBadge) {
  if (badge.type === 'group') {
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
  if (domain === 'binary_sensor') return entity.state === 'on'
  return entity.state === 'on'
}

function shortState(state: string) {
  return state.length > 6 ? state.slice(0, 5) + '…' : state
}
</script>

<style scoped>
.gap-wrap {
  flex-wrap: wrap;
  gap: 8px;
  row-gap: 4px;
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
  /* no max-width — label gets as wide as the badge container needs */
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
