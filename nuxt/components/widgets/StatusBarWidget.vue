<template>
  <div class="h-100 d-flex align-center px-2 gap-wrap">
    <template v-for="(entry, i) in badges" :key="i">
      <v-tooltip :text="entry.label || entry.entity_id" location="bottom">
        <template #activator="{ props: tp }">
          <div v-bind="tp" class="badge d-flex flex-column align-center ga-1" @click="openDetail(entry)">
            <v-icon
              :icon="entry.icon || 'mdi-circle'"
              :color="entry.active ? (entry.active_color || 'primary') : (entry.inactive_color || 'medium-emphasis')"
              size="20"
            />
            <span v-if="config.show_labels" class="badge-label"
              :style="{ color: entry.active ? (entry.active_color || undefined) : undefined }">
              {{ entry.label || shortState(entry.state) }}
            </span>
          </div>
        </template>
      </v-tooltip>
    </template>
  </div>

  <EntityDetailDialog v-if="dialogOpen && dialogEntityId" v-model="dialogOpen" :entity-id="dialogEntityId" />
</template>

<script setup lang="ts">
import type { StatusBarWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: StatusBarWidgetConfig }>()
const entityStore = useEntityStore()

const badges = computed(() => (props.config.entries ?? []).map(entry => {
  const entity = entityStore.entities[entry.entity_id]
  const state = entity?.state ?? 'unknown'
  const activeState = entry.active_state ?? 'on'
  const active = state === activeState
  return { ...entry, active, state }
}))

const dialogOpen = ref(false)
const dialogEntityId = ref<string | null>(null)

function openDetail(entry: { entity_id: string }) {
  dialogEntityId.value = entry.entity_id
  dialogOpen.value = true
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
  line-height: 1;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  max-width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
