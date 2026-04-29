<template>
  <v-dialog :model-value="modelValue" max-width="360" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="xl" :class="{ 'dialog-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-4 pt-4 pb-2">
        <v-icon
          :icon="updateAvailable ? 'mdi-package-up' : 'mdi-package-check'"
          :color="updateAvailable ? 'warning' : 'success'"
          class="mr-2"
          size="22"
        />
        <div class="flex-grow-1 min-w-0">
          <div v-if="areaName" class="text-caption text-medium-emphasis text-truncate">{{ areaName }}</div>
          <div class="text-subtitle-1 font-weight-bold text-truncate">{{ name }}</div>
        </div>
        <v-btn icon="mdi-close" size="small" variant="text" @click="emit('update:modelValue', false)" />
      </div>

      <v-card-text class="px-4 pb-4">
        <!-- Status chip -->
        <div class="d-flex justify-center mb-4">
          <v-chip
            :color="updateAvailable ? 'warning' : 'success'"
            variant="tonal"
            :prepend-icon="updateAvailable ? 'mdi-arrow-up-circle' : 'mdi-check-circle'"
            size="default"
          >
            {{ updateAvailable ? t('update_detail.update_available') : t('update_detail.up_to_date') }}
          </v-chip>
        </div>

        <!-- Version comparison -->
        <div class="version-panel d-flex justify-space-between align-center pa-3 mb-3">
          <div class="text-center flex-1">
            <div class="text-caption text-medium-emphasis mb-1">{{ t('update_detail.installed_version') }}</div>
            <div class="text-body-2 font-weight-bold">{{ installedVersion }}</div>
          </div>
          <v-icon icon="mdi-arrow-right" class="text-medium-emphasis mx-2" size="16" />
          <div class="text-center flex-1">
            <div class="text-caption text-medium-emphasis mb-1">{{ t('update_detail.latest_version') }}</div>
            <div class="text-body-2 font-weight-bold" :class="updateAvailable ? 'text-warning' : ''">
              {{ latestVersion }}
            </div>
          </div>
        </div>

        <!-- In progress -->
        <div v-if="inProgress !== false" class="mb-3">
          <div class="d-flex justify-space-between align-center mb-1">
            <span class="text-caption text-medium-emphasis">{{ t('update_detail.in_progress') }}</span>
            <span v-if="typeof inProgress === 'number'" class="text-caption font-weight-medium">{{ inProgress }}%</span>
          </div>
          <v-progress-linear
            :model-value="typeof inProgress === 'number' ? inProgress : undefined"
            :indeterminate="inProgress === true"
            color="primary"
            rounded
            height="6"
          />
        </div>

        <!-- Actions -->
        <div v-if="updateAvailable && inProgress === false" class="d-flex ga-2 mb-3">
          <v-btn
            color="primary"
            variant="tonal"
            prepend-icon="mdi-download"
            :loading="installing"
            class="flex-grow-1"
            @click="install"
          >
            {{ t('update_detail.install') }}
          </v-btn>
          <v-btn
            v-if="!skippedVersion || skippedVersion !== latestVersion"
            variant="text"
            prepend-icon="mdi-skip-next"
            :loading="skipping"
            @click="skip"
          >
            {{ t('update_detail.skip_version') }}
          </v-btn>
        </div>

        <!-- Skipped version note -->
        <div v-if="skippedVersion" class="d-flex justify-space-between align-center mb-3">
          <span class="text-caption text-medium-emphasis">{{ t('update_detail.skipped_version') }}</span>
          <span class="text-caption font-weight-medium">{{ skippedVersion }}</span>
        </div>

        <!-- Auto update -->
        <div class="d-flex justify-space-between align-center mb-3">
          <span class="text-body-2 text-medium-emphasis">{{ t('update_detail.auto_update') }}</span>
          <v-chip
            :color="autoUpdate ? 'success' : undefined"
            size="small"
            variant="tonal"
          >
            {{ autoUpdate ? t('common.on') : t('common.off') }}
          </v-chip>
        </div>

        <!-- Release notes -->
        <div v-if="releaseSummary" class="mb-3">
          <div class="text-caption text-medium-emphasis mb-1">{{ t('update_detail.release_notes') }}</div>
          <div class="version-panel pa-2" style="border-radius: 8px;">
            <div class="text-caption" style="white-space: pre-wrap; max-height: 80px; overflow-y: auto;">{{ releaseSummary }}</div>
          </div>
        </div>

        <!-- Release URL -->
        <div v-if="releaseUrl" class="d-flex justify-space-between align-center mb-3">
          <span class="text-caption text-medium-emphasis">{{ t('update_detail.release_url') }}</span>
          <a :href="releaseUrl" target="_blank" rel="noopener" class="text-caption text-primary text-decoration-none" style="max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {{ releaseUrl.replace(/^https?:\/\//, '') }}
          </a>
        </div>

        <!-- History -->
        <StateHistoryBar :entity-id="entityId" :hours="12" class="mb-3" />

        <v-divider class="mb-2" />
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
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.entityId])

const name = computed(() =>
  (entity.value?.attributes?.friendly_name as string) ?? props.entityId
)
const areaName = computed(() => {
  const areaId = entityStore.entityAreaMap[props.entityId]
  return areaId ? entityStore.areas.find((a) => a.area_id === areaId)?.name : undefined
})

const updateAvailable = computed(() => entity.value?.state === 'on')
const installedVersion = computed(() => (entity.value?.attributes?.installed_version as string) ?? '–')
const latestVersion = computed(() => (entity.value?.attributes?.latest_version as string) ?? '–')
const autoUpdate = computed(() => !!(entity.value?.attributes?.auto_update))
const inProgress = computed(() => {
  const val = entity.value?.attributes?.in_progress
  if (val === true) return true
  if (typeof val === 'number' && val > 0) return val
  return false
})
const releaseSummary = computed(() => (entity.value?.attributes?.release_summary as string | null | undefined) ?? null)
const releaseUrl = computed(() => (entity.value?.attributes?.release_url as string | null | undefined) ?? null)
const skippedVersion = computed(() => (entity.value?.attributes?.skipped_version as string | null | undefined) ?? null)

const lastUpdated = computed(() => {
  const ts = entity.value?.last_updated
  if (!ts) return '–'
  return new Date(ts).toLocaleString(locale.value, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
})

const installing = ref(false)
const skipping = ref(false)

async function install() {
  installing.value = true
  try {
    await client.callService({ domain: 'update', service: 'install', target: { entity_id: props.entityId }, service_data: { backup: false } })
  } finally {
    installing.value = false
  }
}

async function skip() {
  skipping.value = true
  try {
    await client.callService({ domain: 'update', service: 'skip', target: { entity_id: props.entityId } })
  } finally {
    skipping.value = false
  }
}
</script>

<style scoped>
.version-panel {
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
}
</style>
