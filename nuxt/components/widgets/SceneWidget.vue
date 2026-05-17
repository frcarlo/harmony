<template>
  <div class="h-100 d-flex flex-column pa-3 ga-2 scene-card">
    <!-- Header -->
    <div class="d-flex align-center ga-2 scene-header">
      <v-icon icon="mdi-play-box-multiple-outline" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="scene-name">{{ panelName }}</span>
    </div>

    <!-- Empty state -->
    <div v-if="!entries.length" class="d-flex align-center justify-center flex-grow-1 text-medium-emphasis text-caption">
      {{ t('scene.no_scenes') }}
    </div>

    <!-- Grid of scene buttons -->
    <div v-else class="scene-grid flex-grow-1" :style="gridStyle">
      <v-btn
        v-for="entry in entries"
        :key="entry.entity_id"
        :prepend-icon="entry.icon || defaultIcon(entry.entity_id)"
        :color="recentlyActivated.has(entry.entity_id) ? 'success' : (entry.color || undefined)"
        variant="tonal"
        size="small"
        rounded="lg"
        class="scene-btn text-none"
        :loading="activating.has(entry.entity_id)"
        @click="activate(entry)"
      >
        <span class="scene-btn-label">{{ entry.name || friendlyName(entry.entity_id) }}</span>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SceneWidgetConfig, SceneEntry } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: SceneWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()

const entries = computed(() => props.config.entries ?? [])
const columns = computed(() => props.config.columns ?? 2)
const panelName = computed(() => props.config.name || t('scene.default_name'))

const gridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns.value}, minmax(0, 1fr))`,
  gap: '8px',
  alignContent: 'start',
}))

const activating = ref<Set<string>>(new Set())
const recentlyActivated = ref<Set<string>>(new Set())

function friendlyName(entityId: string) {
  return (entityStore.entities[entityId]?.attributes?.friendly_name as string | undefined) || entityId.split('.').pop() || entityId
}

function defaultIcon(entityId: string) {
  const domain = entityId.split('.')[0]
  return domain === 'script' ? 'mdi-script-text-play-outline' : 'mdi-play-circle-outline'
}

async function activate(entry: SceneEntry) {
  if (activating.value.has(entry.entity_id)) return
  const domain = entry.entity_id.split('.')[0]
  const service = domain === 'script' ? 'turn_on' : 'turn_on'

  const next = new Set(activating.value)
  next.add(entry.entity_id)
  activating.value = next

  try {
    await client.callService({ domain, service, target: { entity_id: entry.entity_id } })
    const activated = new Set(recentlyActivated.value)
    activated.add(entry.entity_id)
    recentlyActivated.value = activated
    window.setTimeout(() => {
      const updated = new Set(recentlyActivated.value)
      updated.delete(entry.entity_id)
      recentlyActivated.value = updated
    }, 1500)
  } finally {
    const done = new Set(activating.value)
    done.delete(entry.entity_id)
    activating.value = done
  }
}
</script>

<style scoped>
.scene-card {
  position: relative;
  overflow: hidden;
}

.scene-header {
  flex-shrink: 0;
}

.scene-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.scene-btn {
  width: 100%;
  min-width: 0;
  height: 44px !important;
  overflow: hidden;
}

.scene-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
