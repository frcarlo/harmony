<template>
  <v-bottom-sheet v-model="open" max-width="480">
    <v-card rounded="xl" class="pa-4" :class="{ 'dialog-glass': glass }">
      <div class="d-flex align-center mb-3">
        <v-icon :icon="props.icon" size="20" class="mr-2" :color="activeCount > 0 ? (props.activeColor || 'primary') : undefined" />
        <span class="text-subtitle-2 font-weight-bold flex-grow-1">{{ props.label || t('group.title') }}</span>
        <span class="text-caption text-medium-emphasis mr-2">{{ activeCount }}/{{ entities.length }}</span>
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="open = false" />
      </div>

      <div v-if="entities.length === 0" class="text-center py-6 text-medium-emphasis text-body-2">
        {{ t('group.empty') }}
      </div>

      <div v-else class="d-flex flex-column ga-1" style="max-height: 60vh; overflow-y: auto">
        <div
          v-for="entity in sortedEntities"
          :key="entity.entity_id"
          class="d-flex align-center ga-3 pa-2 rounded-lg entity-row"
          @click="toggleEntity(entity)"
        >
          <v-icon
            :icon="entityIcon(entity)"
            size="18"
            :color="isActive(entity) ? (props.activeColor || 'primary') : 'medium-emphasis'"
          />
          <div class="flex-grow-1" style="min-width: 0">
            <div class="text-body-2 text-truncate">{{ friendlyName(entity) }}</div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ entitySubtitle(entity) }}
            </div>
          </div>
          <div v-if="isCover(entity)" class="d-flex align-center flex-shrink-0" @click.stop>
            <v-btn icon="mdi-arrow-up" size="small" variant="text" @click.stop="coverAction(entity, 'open_cover')" />
            <v-btn icon="mdi-stop" size="small" variant="text" @click.stop="coverAction(entity, 'stop_cover')" />
            <v-btn icon="mdi-arrow-down" size="small" variant="text" @click.stop="coverAction(entity, 'close_cover')" />
          </div>
          <v-switch
            v-else-if="isToggleable(entity)"
            :model-value="isActive(entity)"
            density="compact"
            hide-details
            color="primary"
            class="flex-shrink-0"
            @click.stop="toggleEntity(entity)"
          />
          <span v-else class="text-caption text-medium-emphasis">{{ entity.state }}</span>
        </div>
      </div>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import type { EntityGroupFilter } from '~/types/dashboard'
import type { HAState } from '~/types/ha'

const props = defineProps<{
  modelValue: boolean
  filter: EntityGroupFilter
  icon?: string
  label?: string
  activeColor?: string
  inactiveColor?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [boolean] }>()
const open = computed({ get: () => props.modelValue, set: v => emit('update:modelValue', v) })

const { t } = useI18n()
const { glass } = useGlassEffect()
const entityStore = useEntityStore()
const client = useHAClient()
const { useFilteredEntities } = useEntityGroupFilter()

const filterRef = computed(() => props.filter)
const entities = useFilteredEntities(filterRef)

const TOGGLEABLE_DOMAINS = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'script']

function isCover(entity: HAState) {
  return entity.entity_id.split('.')[0] === 'cover'
}

function isToggleable(entity: HAState) {
  return TOGGLEABLE_DOMAINS.includes(entity.entity_id.split('.')[0])
}

async function coverAction(entity: HAState, service: string) {
  await client.callService({ domain: 'cover', service, target: { entity_id: entity.entity_id } })
}

function isActive(entity: HAState) {
  const domain = entity.entity_id.split('.')[0]
  if (domain === 'cover') return entity.state === 'open' || entity.state === 'opening'
  return entity.state === 'on'
}

const activeCount = computed(() => entities.value.filter(isActive).length)

const sortedEntities = computed(() =>
  [...entities.value].sort((a, b) => {
    if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1
    return friendlyName(a).localeCompare(friendlyName(b))
  }),
)

function friendlyName(entity: HAState) {
  return (entity.attributes.friendly_name as string | undefined) ?? entity.entity_id
}

function areaName(entity: HAState) {
  const areaId = entityStore.entityAreaMap[entity.entity_id]
  return areaId ? entityStore.areas.find(a => a.area_id === areaId)?.name : undefined
}

function entityLabels(entity: HAState): string {
  const ids = entityStore.entityLabelsMap[entity.entity_id] ?? []
  return ids
    .map(id => entityStore.labels.find(l => l.label_id === id)?.name ?? id)
    .join(', ')
}

function entitySubtitle(entity: HAState): string {
  const labels = entityLabels(entity)
  const area = areaName(entity)
  if (labels && area) return `${area} · ${labels}`
  return labels || area || ''
}

function entityIcon(entity: HAState) {
  const domain = entity.entity_id.split('.')[0]
  if (domain === 'light') return isActive(entity) ? 'mdi-lightbulb' : 'mdi-lightbulb-outline'
  if (domain === 'switch') return isActive(entity) ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'
  if (domain === 'fan') return 'mdi-fan'
  if (domain === 'cover') return 'mdi-window-shutter'
  if (domain === 'sensor') return 'mdi-eye-outline'
  if (domain === 'binary_sensor') return isActive(entity) ? 'mdi-circle' : 'mdi-circle-outline'
  return 'mdi-devices'
}

async function toggleEntity(entity: HAState) {
  if (!isToggleable(entity)) return
  const domain = entity.entity_id.split('.')[0]
  const service = isActive(entity) ? 'turn_off' : 'turn_on'
  await client.callService({ domain, service, target: { entity_id: entity.entity_id } })
}
</script>

<style scoped>
.entity-row {
  cursor: pointer;
  transition: background 0.15s;
}
.entity-row:hover {
  background: rgba(255, 255, 255, 0.06);
}
</style>
