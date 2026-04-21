<template>
  <div ref="rootEl" class="h-100 d-flex flex-column pa-3 ga-2">
    <!-- Header -->
    <div class="d-flex align-center ga-2 flex-shrink-0">
      <v-icon icon="mdi-music" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate flex-grow-1">{{ name }}</span>
      <v-btn icon="mdi-bookshelf" size="x-small" variant="text" density="compact" :title="t('media.library')"
        @click="browserOpen = true" />
    </div>

    <!-- Wide layout: cover left, info+controls right -->
    <div v-if="isWide && config.show_album_art !== false && albumArt"
      class="flex-grow-1 min-height-0 d-flex ga-3 overflow-hidden">
      <div class="flex-shrink-0" style="width: 40%; max-width: 140px; align-self: stretch">
        <v-img :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`"
          width="100%" height="100%" contain rounded="md" />
      </div>
      <div class="flex-grow-1 min-width-0 d-flex flex-column justify-center ga-2">
        <!-- Title + artist -->
        <div style="min-width:0; overflow:hidden; width:100%">
          <template v-if="title">
            <v-tooltip :text="title" location="bottom" :open-delay="400">
              <template #activator="{ props: tp }">
                <div v-bind="tp" class="text-body-2 font-weight-medium text-truncate">{{ title }}</div>
              </template>
            </v-tooltip>
            <v-tooltip v-if="artist" :text="artist" location="bottom" :open-delay="400">
              <template #activator="{ props: tp }">
                <div v-bind="tp" class="text-caption text-medium-emphasis text-truncate">{{ artist }}</div>
              </template>
            </v-tooltip>
          </template>
          <div v-else class="text-body-2 text-medium-emphasis">
            {{ state === 'idle' ? t('media_player.idle') : state === 'off' ? t('media_player.off') : state }}
          </div>
        </div>
        <!-- Controls + volume grouped together -->
        <div class="d-flex flex-column ga-1">
          <div class="d-flex align-center ga-1">
            <v-btn icon="mdi-skip-previous" size="x-small" variant="text" :disabled="isUnavailable"
              @click="command('media_previous_track')" />
            <v-btn :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="small" variant="tonal" :disabled="isUnavailable"
              @click="command(isPlaying ? 'media_pause' : 'media_play')" />
            <v-btn icon="mdi-skip-next" size="x-small" variant="text" :disabled="isUnavailable"
              @click="command('media_next_track')" />
          </div>
          <v-slider v-if="volume !== undefined" :model-value="Math.round(volume * 100)" min="0" max="100"
            color="primary" hide-details density="compact" @end="setVolume" />
        </div>
      </div>
    </div>

    <!-- Narrow layout: cover top, info below, controls bottom -->
    <template v-else>
      <div class="flex-grow-1 min-height-0 d-flex flex-column ga-2 overflow-hidden">
        <div v-if="config.show_album_art !== false && albumArt" class="flex-grow-1 min-height-0 overflow-hidden">
          <v-img :src="`/api/ha-image?path=${encodeURIComponent(albumArt)}`"
            height="100%" contain rounded="md" />
        </div>
        <div class="flex-shrink-0 min-width-0">
          <template v-if="title">
            <div class="text-body-2 font-weight-medium text-truncate">{{ title }}</div>
            <div v-if="artist" class="text-caption text-medium-emphasis text-truncate">{{ artist }}</div>
          </template>
          <div v-else class="text-body-2 text-medium-emphasis">
            {{ state === 'idle' ? t('media_player.idle') : state === 'off' ? t('media_player.off') : state }}
          </div>
        </div>
      </div>
      <div class="d-flex flex-column ga-1 flex-shrink-0">
        <!-- Playback row -->
        <div class="d-flex align-center justify-center ga-1">
          <v-btn icon="mdi-skip-previous" size="x-small" variant="text" :disabled="isUnavailable"
            @click="command('media_previous_track')" />
          <v-btn :icon="isPlaying ? 'mdi-pause' : 'mdi-play'" size="small" variant="tonal" :disabled="isUnavailable"
            @click="command(isPlaying ? 'media_pause' : 'media_play')" />
          <v-btn icon="mdi-skip-next" size="x-small" variant="text" :disabled="isUnavailable"
            @click="command('media_next_track')" />
        </div>
        <!-- Volume row -->
        <template v-if="volume !== undefined">
          <v-slider v-if="containerWidth >= 220" :model-value="Math.round(volume * 100)" min="0" max="100"
            color="primary" hide-details density="compact" @end="setVolume" />
          <div v-else class="d-flex align-center justify-center ga-1">
            <v-btn icon="mdi-volume-minus" size="x-small" variant="text" :disabled="isUnavailable"
              @click="setVolume(Math.max(0, Math.round(volume * 100) - 10))" />
            <span class="text-caption text-medium-emphasis" style="min-width:28px; text-align:center">
              {{ Math.round(volume * 100) }}%
            </span>
            <v-btn icon="mdi-volume-plus" size="x-small" variant="text" :disabled="isUnavailable"
              @click="setVolume(Math.min(100, Math.round(volume * 100) + 10))" />
          </div>
        </template>
      </div>
    </template>
  </div>

  <MediaBrowserSheet :open="browserOpen" :entity-id="config.entity_id" @close="browserOpen = false" />
</template>

<script setup lang="ts">
import type { MediaPlayerWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()
const props = defineProps<{ config: MediaPlayerWidgetConfig }>()

const rootEl = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const isWide = computed(() => containerWidth.value >= 260)

onMounted(() => {
  if (!rootEl.value) return
  const ro = new ResizeObserver(([e]) => { containerWidth.value = e.contentRect.width })
  ro.observe(rootEl.value)
  onUnmounted(() => ro.disconnect())
})
const entityStore = useEntityStore()
const client = useHAClient()
const browserOpen = ref(false)
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const state = computed(() => entity.value?.state ?? 'unavailable')
const isPlaying = computed(() => state.value === 'playing')
const title = computed(() => entity.value?.attributes?.media_title as string | undefined)
const artist = computed(() => entity.value?.attributes?.media_artist as string | undefined)
const albumArt = computed(() => entity.value?.attributes?.entity_picture as string | undefined)
const volume = computed(() => entity.value?.attributes?.volume_level as number | undefined)
const isUnavailable = computed(() => !entity.value || state.value === 'unavailable')

async function command(service: string) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'media_player', service, target: { entity_id: props.config.entity_id } })
}
async function setVolume(pct: number) {
  if (isUnavailable.value) return
  await client.callService({ domain: 'media_player', service: 'volume_set', target: { entity_id: props.config.entity_id }, service_data: { volume_level: pct / 100 } })
}
</script>
