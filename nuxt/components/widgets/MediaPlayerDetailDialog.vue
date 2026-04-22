<template>
  <v-bottom-sheet :model-value="modelValue" max-width="480" @update:model-value="emit('update:modelValue', $event)">
    <v-card v-if="entity" rounded="xl" :class="{ 'dialog-glass': glass }" class="overflow-hidden">

      <!-- Album art banner -->
      <div style="position: relative; height: 160px; background: rgba(255,255,255,0.04);">
        <v-img v-if="albumArt" :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`"
          width="100%" height="100%" cover style="position: absolute; inset: 0; opacity: 0.35;" />
        <v-img v-if="albumArt" :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`"
          height="140" contain style="position: relative; z-index: 1;" class="mx-auto" />
        <v-icon v-else icon="mdi-music-note" size="64" color="medium-emphasis"
          style="position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%)" />
        <v-btn icon="mdi-close" size="small" variant="text"
          style="position: absolute; top: 8px; right: 8px; z-index: 2;"
          @click="emit('update:modelValue', false)" />
        <v-btn icon="mdi-bookshelf" size="small" variant="text"
          style="position: absolute; top: 8px; left: 8px; z-index: 2;"
          @click="browserOpen = true" />
      </div>

      <v-card-text class="px-4 pt-3 pb-4">
        <!-- Title / Artist -->
        <div class="mb-3" style="min-width:0">
          <div v-if="title" class="text-body-1 font-weight-bold text-truncate">{{ title }}</div>
          <div v-else class="text-body-2 text-medium-emphasis">{{ stateLabel }}</div>
          <div v-if="artist" class="text-caption text-medium-emphasis text-truncate">{{ artist }}</div>
        </div>

        <!-- Playback controls -->
        <div class="d-flex justify-center align-center ga-2 mb-3">
          <v-btn icon="mdi-skip-previous" size="small" variant="text" :disabled="isUnavailable"
            @click="command('media_previous_track')" />
          <v-btn :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="large" variant="tonal"
            :disabled="isUnavailable" @click="command(isPlaying ? 'media_pause' : 'media_play')" />
          <v-btn icon="mdi-skip-next" size="small" variant="text" :disabled="isUnavailable"
            @click="command('media_next_track')" />
        </div>

        <!-- Volume -->
        <div class="d-flex align-center ga-2">
          <v-btn icon="mdi-volume-low" size="x-small" variant="text" :disabled="isUnavailable"
            @click="changeVolume(-0.05)" />
          <v-slider :model-value="volumePct" min="0" max="100" step="1" hide-details density="compact"
            color="primary" :disabled="isUnavailable" @end="setVolume" />
          <v-btn icon="mdi-volume-high" size="x-small" variant="text" :disabled="isUnavailable"
            @click="changeVolume(0.05)" />
          <span class="text-caption text-medium-emphasis" style="min-width: 28px; text-align: right">{{ volumePct }}%</span>
        </div>
      </v-card-text>
    </v-card>
  </v-bottom-sheet>

  <MediaBrowserSheet v-if="browserOpen" :open="browserOpen" :entity-id="props.entityId" @close="browserOpen = false" />
</template>

<script setup lang="ts">
const { t } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{ modelValue: boolean; entityId: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const entityStore = useEntityStore()
const client = useHAClient()
const browserOpen = ref(false)

const entity = computed(() => entityStore.entities[props.entityId])
const state = computed(() => entity.value?.state ?? 'unavailable')
const isPlaying = computed(() => state.value === 'playing')
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable')
const title = computed(() => entity.value?.attributes?.media_title as string | undefined)
const artist = computed(() => entity.value?.attributes?.media_artist as string | undefined)
const albumArt = computed(() => entity.value?.attributes?.entity_picture as string | undefined)
const volume = computed(() => entity.value?.attributes?.volume_level as number | undefined)
const volumePct = computed(() => Math.round((volume.value ?? 0) * 100))
const stateLabel = computed(() => {
  if (state.value === 'idle') return t('media_player.idle')
  if (state.value === 'off') return t('media_player.off')
  return state.value
})

async function command(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'media_player', service, target: { entity_id: props.entityId } })
}

async function setVolume(pct: number) {
  await client.callService({ domain: 'media_player', service: 'volume_set', target: { entity_id: props.entityId }, service_data: { volume_level: pct / 100 } })
}

async function changeVolume(delta: number) {
  const cur = volume.value ?? 0
  await setVolume(Math.round(Math.min(1, Math.max(0, cur + delta)) * 100))
}
</script>
