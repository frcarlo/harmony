<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'widget-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-3">
        <v-icon :icon="icon ?? 'mdi-circle'" :color="isActive ? (activeColor ?? 'primary') : 'medium-emphasis'"
          class="mr-2" />
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <!-- State + Toggle -->
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 text-medium-emphasis">{{ t('common.status') }}</span>
          <div class="d-flex align-center ga-2">
            <v-chip :color="isActive ? (activeColor ?? 'primary') : undefined" size="small" variant="tonal">
              {{ entity.state }}
            </v-chip>
            <v-switch v-if="isToggleable" :model-value="isActive" :color="activeColor ?? 'primary'"
              hide-details density="compact" :disabled="isUnavailable" @update:model-value="toggle" />
          </div>
        </div>

        <!-- History -->
        <StateHistoryBar :entity-id="props.entityId" :hours="12" class="mb-3" />

        <!-- Attributes -->
        <v-divider v-if="relevantAttributes.length > 0" class="mb-2" />
        <div v-for="[key, val] in relevantAttributes" :key="key"
          class="d-flex justify-space-between align-center py-1 ga-4">
          <span class="text-caption text-medium-emphasis text-capitalize">{{ key }}</span>
          <span class="text-caption font-weight-medium text-right" style="max-width: 55%">{{ val }}</span>
        </div>

        <v-divider class="mt-2 mb-2" />
        <div class="d-flex justify-space-between">
          <span class="text-caption text-medium-emphasis">{{ t('common.last_updated') }}</span>
          <span class="text-caption text-medium-emphasis">{{ lastUpdated }}</span>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{
  modelValue: boolean
  entityId: string
  icon?: string
  activeColor?: string
  activeState?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.entityId])
const domain = computed(() => props.entityId.split('.')[0])
const isToggleable = computed(() => ['light', 'switch'].includes(domain.value))
const isUnavailable = computed(() => entity.value?.state === 'unavailable')
const name = computed(() => (entity.value?.attributes?.friendly_name as string) ?? props.entityId)
const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  return areaId ? entityStore.areas.find((a) => a.area_id === areaId)?.name : undefined
})

function defaultActiveState(entityId: string) {
  const domain = entityId.split('.')[0]
  if (domain === 'lock') return 'locked'
  if (domain === 'cover') return 'open'
  if (domain === 'media_player') return 'playing'
  return 'on'
}

const isActive = computed(() =>
  entity.value?.state === (props.activeState || defaultActiveState(props.entityId))
)

const IGNORED = new Set(['friendly_name', 'icon', 'entity_picture', 'supported_features'])
const relevantAttributes = computed(() =>
  Object.entries(entity.value?.attributes ?? {})
    .filter(([k]) => !IGNORED.has(k))
    .slice(0, 8)
    .map(([k, v]) => [k.replace(/_/g, ' '), formatVal(v)])
)
const lastUpdated = computed(() => {
  const ts = entity.value?.last_updated
  if (!ts) return '–'
  return new Date(ts).toLocaleString(locale.value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})

async function toggle() {
  if (isUnavailable.value) return
  await client.callService({ domain: domain.value, service: isActive.value ? 'turn_off' : 'turn_on', target: { entity_id: props.entityId } })
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (Array.isArray(v)) { const p = v.slice(0, 3).join(', '); return v.length > 3 ? `${p} +${v.length - 3}` : p }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1)
  if (typeof v === 'boolean') return v ? t('common.on') : t('common.off')
  const s = String(v); return s.length > 40 ? s.slice(0, 38) + '…' : s
}
</script>
