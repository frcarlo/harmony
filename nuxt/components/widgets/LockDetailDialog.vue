<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'widget-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-3">
        <v-icon :icon="isLocked ? 'mdi-lock-outline' : 'mdi-lock-open-variant-outline'"
          :color="isLocked ? 'success' : 'warning'" class="mr-2" />
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <!-- State chip -->
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 text-medium-emphasis">{{ t('common.status') }}</span>
          <v-chip :color="isLocked ? 'success' : 'warning'" size="small" variant="tonal">
            {{ isLocked ? t('common.locked') : t('common.unlocked') }}
          </v-chip>
        </div>

        <!-- Confirmation buttons -->
        <div v-if="confirming" class="d-flex ga-2 mb-3">
          <v-btn variant="tonal" size="small" class="flex-grow-1" @click="confirming = false">
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn color="warning" variant="flat" size="small" class="flex-grow-1" @click="doAction('unlock')">
            {{ t('common.unlock') }}
          </v-btn>
        </div>
        <div v-else class="d-flex ga-2 mb-3">
          <v-btn prepend-icon="mdi-lock-open" variant="tonal" size="small" class="flex-grow-1"
            :disabled="!isLocked" @click="confirming = true">
            {{ t('common.unlock') }}
          </v-btn>
          <v-btn prepend-icon="mdi-lock" variant="tonal" size="small" class="flex-grow-1"
            :disabled="isLocked" @click="doAction('lock')">
            {{ t('common.lock') }}
          </v-btn>
        </div>

        <!-- History -->
        <StateHistoryBar :entity-id="props.entityId" :hours="12" active-color="rgb(var(--v-theme-success))" class="mb-3" />

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

const props = defineProps<{ modelValue: boolean; entityId: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()

const entity = computed(() => entityStore.entities[props.entityId])
const name = computed(() => (entity.value?.attributes?.friendly_name as string) ?? props.entityId)
const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  return areaId ? entityStore.areas.find((a) => a.area_id === areaId)?.name : undefined
})
const isLocked = computed(() => entity.value?.state === 'locked')
const confirming = ref(false)

watch(() => props.modelValue, (v) => { if (!v) confirming.value = false })

const IGNORED = new Set(['friendly_name', 'icon', 'entity_picture', 'supported_features'])
const relevantAttributes = computed(() =>
  Object.entries(entity.value?.attributes ?? {})
    .filter(([k]) => !IGNORED.has(k))
    .slice(0, 6)
    .map(([k, v]) => [k.replace(/_/g, ' '), formatVal(v)])
)
const lastUpdated = computed(() => {
  const ts = entity.value?.last_updated
  if (!ts) return '–'
  return new Date(ts).toLocaleString(locale.value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (Array.isArray(v)) { const p = v.slice(0, 3).join(', '); return v.length > 3 ? `${p} +${v.length - 3}` : p }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1)
  if (typeof v === 'boolean') return v ? t('common.on') : t('common.off')
  const s = String(v); return s.length > 40 ? s.slice(0, 38) + '…' : s
}

async function doAction(service: 'lock' | 'unlock') {
  await client.callService({ domain: 'lock', service, target: { entity_id: props.entityId } })
  confirming.value = false
}
</script>
