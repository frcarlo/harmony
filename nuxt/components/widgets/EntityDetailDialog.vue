<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="lg" :class="{ 'dialog-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-3">
        <v-icon :icon="icon ?? 'mdi-circle'" :color="isActive ? (activeColor ?? 'primary') : 'medium-emphasis'"
          class="mr-2" />
        <div class="flex-grow-1" style="min-width: 0; overflow: hidden;">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <v-tooltip :text="name" location="bottom">
            <template #activator="{ props: tp }">
              <div v-bind="tp" class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
            </template>
          </v-tooltip>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" class="flex-shrink-0 ml-1" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <!-- State + Toggle (light, switch, fan) -->
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

        <!-- Cover controls -->
        <div v-if="domain === 'cover'" class="d-flex justify-center ga-2 mb-3">
          <v-btn icon="mdi-arrow-up" size="small" variant="tonal"
            :disabled="isUnavailable || entity.state === 'open'" @click="callService('cover', 'open_cover')" />
          <v-btn icon="mdi-stop" size="small" variant="tonal"
            :disabled="isUnavailable" @click="callService('cover', 'stop_cover')" />
          <v-btn icon="mdi-arrow-down" size="small" variant="tonal"
            :disabled="isUnavailable || entity.state === 'closed'" @click="callService('cover', 'close_cover')" />
        </div>

        <!-- Lock controls -->
        <div v-if="domain === 'lock'" class="d-flex justify-center ga-2 mb-3">
          <v-btn prepend-icon="mdi-lock-open-outline" size="small" variant="tonal"
            :disabled="isUnavailable || entity.state === 'unlocked'" @click="callService('lock', 'unlock')">
            {{ t('common.unlock') }}
          </v-btn>
          <v-btn prepend-icon="mdi-lock-outline" size="small" variant="tonal"
            :disabled="isUnavailable || entity.state === 'locked'" @click="callService('lock', 'lock')">
            {{ t('common.lock') }}
          </v-btn>
        </div>

        <!-- Climate controls -->
        <div v-if="domain === 'climate'" class="mb-3">
          <div class="d-flex align-center justify-center ga-3">
            <v-btn icon="mdi-minus" size="small" variant="tonal" :disabled="isUnavailable" @click="adjustTemp(-tempStep)" />
            <div class="text-center">
              <div class="text-h5 font-weight-bold">{{ climateTemp }}°</div>
              <div class="text-caption text-medium-emphasis">{{ t('common.target') }}</div>
            </div>
            <v-btn icon="mdi-plus" size="small" variant="tonal" :disabled="isUnavailable" @click="adjustTemp(tempStep)" />
          </div>
          <div v-if="currentTemp !== null" class="text-center mt-1">
            <span class="text-caption text-medium-emphasis">{{ t('common.current') }}: {{ currentTemp }}°</span>
          </div>
        </div>

        <!-- Fan speed controls -->
        <div v-if="domain === 'fan' && fanPresetModes.length" class="d-flex justify-center flex-wrap ga-1 mb-3">
          <v-btn v-for="mode in fanPresetModes" :key="mode"
            size="small" variant="tonal"
            :color="fanCurrentPreset === mode ? 'primary' : undefined"
            :disabled="isUnavailable"
            @click="callService('fan', 'set_preset_mode', { preset_mode: mode })">
            {{ mode }}
          </v-btn>
        </div>
        <div v-else-if="domain === 'fan'" class="d-flex justify-center align-center ga-2 mb-3">
          <v-icon size="16" icon="mdi-fan" class="text-medium-emphasis" />
          <v-slider
            :model-value="fanPercentage"
            min="0" max="100" step="10"
            hide-details density="compact"
            :disabled="isUnavailable"
            style="max-width: 200px"
            @update:model-value="v => callService('fan', 'set_percentage', { percentage: v })"
          />
          <span class="text-caption text-medium-emphasis" style="min-width: 32px">{{ fanPercentage }}%</span>
        </div>

        <!-- Media player controls -->
        <div v-if="domain === 'media_player'" class="mb-3">
          <div class="d-flex justify-center align-center ga-1 mb-2">
            <v-btn icon="mdi-skip-previous" size="small" variant="text"
              :disabled="isUnavailable" @click="callService('media_player', 'media_previous_track')" />
            <v-btn :icon="entity.state === 'playing' ? 'mdi-pause' : 'mdi-play'"
              size="default" variant="tonal"
              :disabled="isUnavailable" @click="callService('media_player', 'media_play_pause')" />
            <v-btn icon="mdi-skip-next" size="small" variant="text"
              :disabled="isUnavailable" @click="callService('media_player', 'media_next_track')" />
          </div>
          <div class="d-flex align-center ga-2">
            <v-icon size="16" icon="mdi-volume-medium" class="text-medium-emphasis" />
            <v-slider
              :model-value="mediaVolume"
              min="0" max="100" step="5"
              hide-details density="compact"
              :disabled="isUnavailable"
              @update:model-value="v => callService('media_player', 'volume_set', { volume_level: v / 100 })"
            />
            <span class="text-caption text-medium-emphasis" style="min-width: 32px">{{ mediaVolume }}%</span>
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
const isToggleable = computed(() => ['light', 'switch', 'fan'].includes(domain.value))
const isUnavailable = computed(() => entity.value?.state === 'unavailable')
const name = computed(() => (entity.value?.attributes?.friendly_name as string) ?? props.entityId)
const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  return areaId ? entityStore.areas.find((a) => a.area_id === areaId)?.name : undefined
})

function defaultActiveState(entityId: string) {
  const d = entityId.split('.')[0]
  if (d === 'lock') return 'locked'
  if (d === 'cover') return 'open'
  if (d === 'media_player') return 'playing'
  return 'on'
}

const isActive = computed(() =>
  entity.value?.state === (props.activeState || defaultActiveState(props.entityId))
)

// Climate
const climateTemp = computed(() => {
  const t = entity.value?.attributes?.temperature as number | undefined
  return t != null ? t : '–'
})
const currentTemp = computed(() => {
  const t = entity.value?.attributes?.current_temperature as number | undefined
  return t != null ? t : null
})
const tempStep = computed(() => (entity.value?.attributes?.target_temp_step as number) ?? 0.5)

// Fan
const fanPercentage = computed(() => Math.round((entity.value?.attributes?.percentage as number) ?? 0))
const fanPresetModes = computed(() => (entity.value?.attributes?.preset_modes as string[]) ?? [])
const fanCurrentPreset = computed(() => entity.value?.attributes?.preset_mode as string | undefined)

// Media player
const mediaVolume = computed(() => Math.round(((entity.value?.attributes?.volume_level as number) ?? 0) * 100))

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

async function callService(d: string, service: string, data?: Record<string, unknown>) {
  await client.callService({ domain: d, service, target: { entity_id: props.entityId }, service_data: data })
}

async function adjustTemp(delta: number) {
  const current = entity.value?.attributes?.temperature as number | undefined
  if (current == null) return
  const next = Math.round((current + delta) * 10) / 10
  await client.callService({ domain: 'climate', service: 'set_temperature', target: { entity_id: props.entityId }, service_data: { temperature: next } })
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '–'
  if (Array.isArray(v)) { const p = v.slice(0, 3).join(', '); return v.length > 3 ? `${p} +${v.length - 3}` : p }
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(1)
  if (typeof v === 'boolean') return v ? t('common.on') : t('common.off')
  const s = String(v); return s.length > 40 ? s.slice(0, 38) + '…' : s
}
</script>
