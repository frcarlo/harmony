<template>
  <v-dialog :model-value="open" :max-width="dialogMaxWidth" @update:model-value="v => !v && $emit('close')">
    <v-card rounded="lg" class="media-browser-card" :class="{ 'dialog-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pa-3 pb-1">
        <v-btn v-if="activeTab === 'browse' && stack.length > 0" icon="mdi-arrow-left" size="x-small" variant="text"
          @click="goBack" />
        <span class="text-subtitle-2 font-weight-semibold text-truncate flex-grow-1">
          {{ activeTab === 'search' ? t('media.search') : activeTab === 'spotify' ? t('media.spotify') : currentTitle }}
        </span>
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="$emit('close')" />
      </v-card-title>

      <!-- Tabs -->
      <v-tabs v-if="maAvailable || spotifyAccounts.length" v-model="activeTab" density="compact"
        class="media-browser__tabs px-2">
        <v-tab v-if="maAvailable" value="browse" prepend-icon="mdi-folder-music-outline" size="small">{{
          t('media.library') }}</v-tab>
        <v-tab v-if="maAvailable" value="search" prepend-icon="mdi-magnify" size="small">{{ t('media.search') }}</v-tab>
        <v-tab v-if="spotifyAccounts.length" value="spotify" prepend-icon="mdi-spotify" size="small">{{
          t('media.spotify') }}</v-tab>
      </v-tabs>

      <!-- Browse tab -->
      <v-card-text v-if="activeTab === 'browse'" class="pa-2 bg-transparent"
        style="max-height: 420px; overflow-y: auto;">
        <div v-if="loading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>
        <div v-else-if="error" class="text-caption text-medium-emphasis text-center py-4">{{ error }}</div>
        <v-list v-else density="compact" nav class="bg-transparent">
          <v-list-item v-for="item in children" :key="item.media_content_id" :title="item.title"
            :prepend-icon="item.thumbnail ? undefined : mediaIcon(item)" rounded="lg" class="mb-1"
            @click="handleClick(item)">
            <template v-if="item.thumbnail" #prepend>
              <v-avatar size="36" rounded="md" class="mr-2">
                <v-img :src="item.thumbnail" cover />
              </v-avatar>
            </template>
            <template #append>
              <div class="d-flex align-center ga-1">
                <v-btn v-if="item.can_play" icon="mdi-play" size="x-small" variant="text" color="primary"
                  @click.stop="play(item)" />
                <v-icon v-if="item.can_expand" icon="mdi-chevron-right" size="16" color="medium-emphasis" />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <!-- Spotify tab -->
      <v-card-text v-else-if="activeTab === 'spotify'"
        class="media-browser__spotify pa-2 bg-transparent d-flex flex-column ga-2">
        <v-slide-group v-if="spotifyAccounts.length > 1" v-model="selectedSpotifyIndex" selected-class="text-primary"
          show-arrows class="media-browser__spotify-accounts">
          <v-slide-group-item v-for="(account, idx) in spotifyAccounts" :key="account.entity_id"
            v-slot="{ toggle, selectedClass }">
            <v-chip class="mr-2" :class="selectedClass" size="small" variant="tonal" @click="toggle">
              {{ spotifyAccountName(account) }}
            </v-chip>
          </v-slide-group-item>
        </v-slide-group>

        <v-text-field v-model="spotifySearchQuery" class="media-browser__spotify-search"
          :placeholder="t('media.spotify_search_placeholder')" prepend-inner-icon="mdi-magnify" density="compact"
          hide-details clearable variant="outlined" rounded="lg" :disabled="!maAvailable"
          @keyup.enter="doSpotifySearch">
          <template #append-inner>
            <v-btn size="x-small" variant="text" icon="mdi-send" :loading="spotifySearchLoading"
              :disabled="!maAvailable" @click="doSpotifySearch" />
          </template>
        </v-text-field>

        <div v-if="spotifyLibraryLoading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>
        <div v-else-if="spotifyLibraryError" class="text-caption text-medium-emphasis text-center py-4">{{
          spotifyLibraryError
          }}</div>
        <template v-else-if="spotifyLibrarySections.length && !spotifySearchDone">
          <div class="media-browser__spotify-sections overflow-y-auto d-flex flex-column ga-5">
            <div v-for="section in spotifyLibrarySections" :key="`browse-${section.key}`" class="spotify-section">
              <div class="d-flex align-center justify-space-between px-1">
                <div class="text-subtitle-2 font-weight-semibold">{{ section.label }}</div>
                <v-chip size="x-small" density="compact">{{ section.items.length }}</v-chip>
              </div>
              <div class="spotify-row-shell">
                <div class="spotify-row">
                  <button v-for="item in section.items" :key="item.media_content_id" type="button" class="spotify-card"
                    @click="playSpotifyItem(item)">
                    <div v-if="item.thumbnail" class="spotify-card__art spotify-card__art--image">
                      <img :src="item.thumbnail" :alt="item.title" class="spotify-card__image">
                    </div>
                    <div v-else :class="['spotify-card__art', `spotify-card__art--${spotifyNodeType(item)}`]">
                      <v-icon :icon="mediaIcon(item)" size="30" />
                      <div class="spotify-card__type">{{ spotifyNodeType(item) }}</div>
                    </div>
                    <div class="spotify-card__title">{{ item.title }}</div>
                    <div class="spotify-card__subtitle">{{ spotifyItemSubtitle(item) }}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="!spotifySearchDone" class="text-caption text-medium-emphasis text-center py-4">
          {{ t('media.spotify_library_empty') }}
        </div>
        <div v-else-if="spotifySearchLoading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>
        <div v-else-if="spotifySearchError" class="text-caption text-medium-emphasis text-center py-4">{{
          spotifySearchError
          }}</div>
        <div v-else-if="spotifySearchDone && spotifyTotalResults === 0"
          class="text-caption text-medium-emphasis text-center py-4">
          {{ t('media.no_results') }}
        </div>
        <template v-else-if="spotifySearchDone">
          <div class="media-browser__spotify-sections overflow-y-auto d-flex flex-column ga-5">
            <div v-for="section in spotifySections.filter(s => s.items.length)" :key="section.key"
              class="spotify-section">
              <div class="d-flex align-center justify-space-between px-1">
                <div class="text-subtitle-2 font-weight-semibold">{{ section.label }}</div>
                <v-chip size="x-small" density="compact">{{ section.items.length }}</v-chip>
              </div>
              <div class="spotify-row-shell">
                <div class="spotify-row">
                  <button v-for="item in section.items" :key="item.uri" type="button" class="spotify-card"
                    @click="playMA(item)">
                    <div v-if="maImageUrl(item)" class="spotify-card__art spotify-card__art--image">
                      <img :src="maImageUrl(item)" :alt="item.name" class="spotify-card__image">
                    </div>
                    <div v-else :class="['spotify-card__art', `spotify-card__art--${item.media_type}`]">
                      <v-icon :icon="maTypeIcon(item.media_type)" size="30" />
                      <div class="spotify-card__type">{{ item.media_type }}</div>
                    </div>
                    <div class="spotify-card__title">{{ item.name }}</div>
                    <div class="spotify-card__subtitle">{{ itemSubtitle(item) }}</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>
      </v-card-text>

      <!-- Search tab -->
      <v-card-text v-else class="media-browser__search pa-2 bg-transparent d-flex flex-column ga-2">
        <v-text-field v-model="searchQuery" class="media-browser__search-field"
          :placeholder="t('media.search_placeholder')"
          prepend-inner-icon="mdi-magnify" density="compact" hide-details clearable variant="outlined" rounded="lg"
          @keyup.enter="doSearch">
          <template #append-inner>
            <v-btn size="x-small" variant="text" icon="mdi-send" :loading="searchLoading" @click="doSearch" />
          </template>
        </v-text-field>

        <div v-if="searchLoading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>
        <div v-else-if="searchError" class="text-caption text-medium-emphasis text-center py-4">{{ searchError }}</div>
        <div v-else-if="searchDone && totalResults === 0" class="text-caption text-medium-emphasis text-center py-4">
          {{ t('media.no_results') }}
        </div>

        <template v-else-if="searchDone">
          <v-tabs v-model="searchTab" density="compact" show-arrows>
            <v-tab v-for="section in searchSections.filter(s => s.items.length)" :key="section.key" :value="section.key"
              size="small">
              {{ section.label }}
              <v-chip size="x-small" class="ml-1" density="compact">{{ section.items.length }}</v-chip>
            </v-tab>
          </v-tabs>
          <div class="overflow-y-auto" style="max-height: 340px;">
            <v-list density="compact" nav class="bg-transparent pa-0">
              <v-list-item v-for="item in activeSearchSection" :key="item.uri" :title="item.name"
                :subtitle="itemSubtitle(item)" rounded="lg" class="mb-1">
                <template #prepend>
                  <v-avatar size="36" rounded="md" class="mr-2">
                    <v-img v-if="maImageUrl(item)" :src="maImageUrl(item)" cover />
                    <v-icon v-else :icon="maTypeIcon(item.media_type)" size="20" />
                  </v-avatar>
                </template>
                <template #append>
                  <v-btn icon="mdi-play" size="x-small" variant="text" color="primary" @click="playMA(item)" />
                </template>
              </v-list-item>
            </v-list>
          </div>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
import type { BrowseMediaNode, HAState } from '~/types/ha'
import type { MAItem, MASearchResult } from '~/composables/useMAClient'

const { glass } = useGlassEffect()
const { t } = useI18n()

const props = defineProps<{ open: boolean; entityId: string }>()
const emit = defineEmits<{ close: [] }>()

const client = useHAClient()
const entityStore = useEntityStore()
const { checkStatus, search, maImageUrl } = useMAClient()
const { smAndDown } = useDisplay()
const dialogMaxWidth = computed(() => (smAndDown.value ? 'calc(100vw - 20px)' : 580))

// ── Browse ──────────────────────────────────────────
interface StackEntry { title: string; contentType: string; contentId: string }
const stack = ref<StackEntry[]>([])
const children = ref<BrowseMediaNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const currentTitle = computed(() => stack.value.at(-1)?.title ?? t('media.library'))

async function browse(contentType?: string, contentId?: string) {
  loading.value = true
  error.value = null
  try {
    const result = await client.browseMedia(props.entityId, contentType, contentId)
    const all = result.children ?? []
    children.value = all
    if (children.value.length === 0) error.value = t('media.no_content')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : t('media.load_error')
    children.value = []
  } finally {
    loading.value = false
  }
}

async function handleClick(item: BrowseMediaNode) {
  if (item.can_expand) {
    stack.value.push({ title: item.title, contentType: item.media_content_type, contentId: item.media_content_id })
    await browse(item.media_content_type, item.media_content_id)
  } else if (item.can_play) await play(item)
}

async function goBack() {
  stack.value.pop()
  const prev = stack.value.at(-1)
  await browse(prev?.contentType, prev?.contentId)
}

async function play(item: BrowseMediaNode) {
  await client.callService({
    domain: 'media_player', service: 'play_media',
    target: { entity_id: props.entityId },
    service_data: { media_content_id: item.media_content_id, media_content_type: item.media_content_type },
  })
  emit('close')
}

// ── Search (MA) ──────────────────────────────────────
const activeTab = ref<'browse' | 'search' | 'spotify'>('browse')
const maAvailable = ref(false)
const spotifyAccounts = computed(() => Object.entries(entityStore.entities)
  .filter(([id]) => id.startsWith('media_player.spotify'))
  .map(([entity_id, state]) => ({ entity_id, state } as { entity_id: string; state: HAState })))
const selectedSpotifyIndex = ref(0)
const selectedSpotifyEntityId = computed(() => spotifyAccounts.value[selectedSpotifyIndex.value]?.entity_id ?? '')
const spotifySearchQuery = ref('')
const spotifySearchLoading = ref(false)
const spotifySearchError = ref<string | null>(null)
const spotifySearchDone = ref(false)
const spotifySearchResults = ref<MASearchResult | null>(null)
const spotifyLibraryLoading = ref(false)
const spotifyLibraryError = ref<string | null>(null)
const spotifyLibrarySections = ref<Array<{ key: string; label: string; items: BrowseMediaNode[] }>>([])
const searchQuery = ref('')
const searchLoading = ref(false)
const searchError = ref<string | null>(null)
const searchDone = ref(false)
const searchResults = ref<MASearchResult | null>(null)
const searchTab = ref<string>('tracks')

const totalResults = computed(() => {
  const r = searchResults.value
  if (!r) return 0
  return r.tracks.length + r.albums.length + r.artists.length + r.playlists.length
})

const searchSections = computed(() => {
  const r = searchResults.value
  if (!r) return []
  return [
    { key: 'tracks', label: t('media.tracks'), items: r.tracks },
    { key: 'albums', label: t('media.albums'), items: r.albums },
    { key: 'artists', label: t('media.artists'), items: r.artists },
    { key: 'playlists', label: t('media.playlists'), items: r.playlists },
    { key: 'radio', label: t('media.radio'), items: r.radio },
  ]
})

const activeSearchSection = computed(() => {
  const section = searchSections.value.find(s => s.key === searchTab.value)
  return section?.items ?? []
})

const spotifySections = computed(() => {
  const r = spotifySearchResults.value
  if (!r) return []
  const onlySpotify = (items: MAItem[]) => items.filter(item => String(item.provider ?? '').toLowerCase().includes('spotify'))
  return [
    { key: 'tracks', label: t('media.tracks'), items: onlySpotify(r.tracks) },
    { key: 'albums', label: t('media.albums'), items: onlySpotify(r.albums) },
    { key: 'artists', label: t('media.artists'), items: onlySpotify(r.artists) },
    { key: 'playlists', label: t('media.playlists'), items: onlySpotify(r.playlists) },
    { key: 'radio', label: t('media.radio'), items: onlySpotify(r.radio) },
  ]
})

const spotifyTotalResults = computed(() => spotifySections.value.reduce((sum, section) => sum + section.items.length, 0))

const spotifyCategoryLabels: Record<string, string> = {
  current_user_playlists: 'media.spotify_section_playlists',
  current_user_followed_artists: 'media.spotify_section_artists',
  current_user_saved_albums: 'media.spotify_section_albums',
  current_user_saved_tracks: 'media.spotify_section_liked_songs',
  current_user_recently_played: 'media.spotify_section_recently_played',
  current_user_top_artists: 'media.spotify_section_top_artists',
  current_user_top_tracks: 'media.spotify_section_top_tracks',
}

async function browseSpotifyService(entityId: string, mediaContentType?: string, mediaContentId?: string): Promise<BrowseMediaNode> {
  const response = await client.callServiceWithResponse<Record<string, BrowseMediaNode>>({
    domain: 'media_player',
    service: 'browse_media',
    target: { entity_id: entityId },
    service_data: {
      ...(mediaContentType ? { media_content_type: mediaContentType } : {}),
      ...(mediaContentId ? { media_content_id: mediaContentId } : {}),
    },
  })

  const node = response?.[entityId]
  if (!node) throw new Error(t('media.load_error'))
  return node
}

async function doSearch() {
  if (!searchQuery.value.trim()) return
  searchLoading.value = true
  searchError.value = null
  searchDone.value = false
  try {
    searchResults.value = await search(searchQuery.value)
    searchDone.value = true
    const first = ['tracks', 'albums', 'artists', 'playlists', 'radio'].find(k => (searchResults.value as Record<string, MAItem[]>)[k]?.length)
    if (first) searchTab.value = first
  } catch (e: unknown) {
    searchError.value = e instanceof Error ? e.message : t('media.load_error')
  } finally {
    searchLoading.value = false
  }
}

function spotifyAccountName(account: { entity_id: string; state: HAState }): string {
  return (account.state.attributes?.friendly_name as string | undefined) || account.entity_id.replace(/^media_player\./, '')
}

async function doSpotifySearch() {
  if (!maAvailable.value || !spotifySearchQuery.value.trim()) return
  spotifySearchLoading.value = true
  spotifySearchError.value = null
  spotifySearchDone.value = false
  try {
    spotifySearchResults.value = await search(spotifySearchQuery.value)
    spotifySearchDone.value = true
  } catch (e: unknown) {
    spotifySearchError.value = e instanceof Error ? e.message : t('media.load_error')
  } finally {
    spotifySearchLoading.value = false
  }
}

async function loadSpotifyLibrary() {
  if (!selectedSpotifyEntityId.value) {
    spotifyLibrarySections.value = []
    return
  }

  spotifyLibraryLoading.value = true
  spotifyLibraryError.value = null
  try {
    const root = await browseSpotifyService(selectedSpotifyEntityId.value)
    const categories = (root.children ?? [])
      .filter(child => child.media_content_id in spotifyCategoryLabels)

    const sections = await Promise.all(categories.map(async (category) => {
      const node = await browseSpotifyService(
        selectedSpotifyEntityId.value,
        category.media_content_type,
        category.media_content_id,
      )
      return {
        key: category.media_content_id,
        label: t(spotifyCategoryLabels[category.media_content_id] ?? 'media.spotify'),
        items: (node.children ?? []).slice(0, 12),
      }
    }))

    spotifyLibrarySections.value = sections.filter(section => section.items.length)
  } catch (e: unknown) {
    spotifyLibraryError.value = e instanceof Error ? e.message : t('media.load_error')
    spotifyLibrarySections.value = []
  } finally {
    spotifyLibraryLoading.value = false
  }
}

function resolveMaEntityId(): string {
  const nativeName = entityStore.entities[props.entityId]?.attributes?.friendly_name as string | undefined
  if (!nativeName) return props.entityId
  const match = Object.entries(entityStore.entities).find(([id, e]) =>
    id !== props.entityId &&
    id.startsWith('media_player.') &&
    entityStore.entityPlatformMap[id] === 'music_assistant' &&
    e.attributes?.friendly_name === nativeName,
  )
  return match ? match[0] : props.entityId
}

async function playMA(item: MAItem) {
  try {
    const targetEntity = resolveMaEntityId()
    await client.callService({
      domain: 'music_assistant', service: 'play_media',
      target: { entity_id: targetEntity },
      service_data: { media_id: item.uri, media_type: item.media_type, enqueue: 'replace' },
    })
    emit('close')
  } catch (e: unknown) {
    searchError.value = e instanceof Error ? e.message : t('media.load_error')
  }
}

async function playSpotifyItem(item: BrowseMediaNode) {
  if (!selectedSpotifyEntityId.value) return
  try {
    await client.callService({
      domain: 'media_player',
      service: 'play_media',
      target: { entity_id: selectedSpotifyEntityId.value },
      service_data: {
        media_content_id: item.media_content_id,
        media_content_type: item.media_content_type,
      },
    })
    emit('close')
  } catch (e: unknown) {
    const directError = e instanceof Error ? e.message : ''
    if (!maAvailable.value) {
      spotifyLibraryError.value = directError || t('media.load_error')
      return
    }

    try {
      const mediaType = spotifyNodeType(item)
      await client.callService({
        domain: 'music_assistant',
        service: 'play_media',
        target: { entity_id: resolveMaEntityId() },
        service_data: {
          media_id: item.media_content_id,
          media_type: mediaType === 'music' || mediaType === 'podcast' ? item.media_content_type : mediaType,
          enqueue: 'replace',
        },
      })
      emit('close')
    } catch (fallbackError: unknown) {
      spotifyLibraryError.value = fallbackError instanceof Error
        ? fallbackError.message
        : directError || t('media.load_error')
    }
  }
}

function itemSubtitle(item: MAItem): string {
  if (item.artists?.length) return item.artists.map(a => a.name).join(', ')
  if (item.album) return item.album.name
  return ''
}

function maTypeIcon(type: string): string {
  const map: Record<string, string> = {
    track: 'mdi-music-note', album: 'mdi-album',
    artist: 'mdi-account-music', playlist: 'mdi-playlist-music', radio: 'mdi-radio',
  }
  return map[type] ?? 'mdi-music'
}

function spotifyNodeType(item: BrowseMediaNode): string {
  const cls = item.media_class?.toLowerCase() ?? ''
  if (cls.includes('track')) return 'track'
  if (cls.includes('album')) return 'album'
  if (cls.includes('artist')) return 'artist'
  if (cls.includes('playlist')) return 'playlist'
  if (cls.includes('podcast') || cls.includes('show')) return 'podcast'
  return 'music'
}

function spotifyItemSubtitle(item: BrowseMediaNode): string {
  switch (spotifyNodeType(item)) {
    case 'track':
      return t('media.tracks')
    case 'album':
      return t('media.albums')
    case 'artist':
      return t('media.artists')
    case 'playlist':
      return t('media.playlists')
    case 'podcast':
      return t('media.podcast')
    default:
      return t('media.spotify')
  }
}

function mediaIcon(item: BrowseMediaNode): string {
  const map: Record<string, string> = {
    album: 'mdi-album', artist: 'mdi-account-music', track: 'mdi-music-note',
    playlist: 'mdi-playlist-music', podcast: 'mdi-podcast', episode: 'mdi-podcast',
    channel: 'mdi-radio', radio: 'mdi-radio', directory: 'mdi-folder-music',
    music: 'mdi-music', favorites: 'mdi-heart', recent: 'mdi-history',
  }
  const cls = item.media_class?.toLowerCase() ?? ''
  for (const [key, icon] of Object.entries(map)) {
    if (cls.includes(key)) return icon
  }
  return item.can_expand ? 'mdi-folder-outline' : 'mdi-music-note'
}

watch(() => props.open, async (v) => {
  if (v) {
    stack.value = []
    searchDone.value = false
    searchQuery.value = ''
    spotifySearchDone.value = false
    spotifySearchQuery.value = ''
    spotifySearchResults.value = null
    spotifyLibrarySections.value = []
    spotifyLibraryError.value = null
    selectedSpotifyIndex.value = 0
    const isMAEntity = entityStore.entityPlatformMap[props.entityId] === 'music_assistant'
    maAvailable.value = isMAEntity && (await checkStatus()).available
    activeTab.value = maAvailable.value ? 'browse' : (spotifyAccounts.value.length ? 'spotify' : 'browse')
    if (maAvailable.value) await browse()
    if (spotifyAccounts.value.length) await loadSpotifyLibrary()
  }
}, { immediate: true })

watch(selectedSpotifyEntityId, async (entityId, prev) => {
  if (!props.open || activeTab.value !== 'spotify' || !entityId || entityId === prev) return
  spotifySearchDone.value = false
  spotifySearchResults.value = null
  await loadSpotifyLibrary()
})

watch(activeTab, async (tab, prev) => {
  if (!props.open || tab !== 'spotify' || tab === prev) return
  spotifySearchDone.value = false
  spotifySearchResults.value = null
  await loadSpotifyLibrary()
})
</script>

<style scoped>
.media-browser-card {
  min-height: 540px;
}

.media-browser__tabs {
  position: sticky;
  top: 0;
  z-index: 3;
  background: rgba(var(--v-theme-surface), 0.86);
  backdrop-filter: blur(10px);
}

.media-browser__spotify {
  max-height: min(72vh, 560px);
}

.media-browser__search {
  max-height: min(72vh, 480px);
}

.media-browser__spotify-accounts,
.media-browser__spotify-search,
.media-browser__search-field {
  position: sticky;
  top: 0;
  flex: 0 0 auto;
  z-index: 2;
  background: rgba(var(--v-theme-surface), 0.84);
  backdrop-filter: blur(10px);
}

.media-browser__spotify-search :deep(.v-field),
.media-browser__search-field :deep(.v-field) {
  min-height: 40px;
}

.media-browser__spotify-search :deep(.v-field__input),
.media-browser__search-field :deep(.v-field__input) {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}

.media-browser__spotify-sections {
  max-height: min(56vh, 360px);
  padding-bottom: 6px;
}

.spotify-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spotify-row-shell {
  position: relative;
}

.spotify-row-shell::before,
.spotify-row-shell::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 18px;
  pointer-events: none;
  z-index: 1;
}

.spotify-row-shell::before {
  left: 0;
  background: linear-gradient(90deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0));
}

.spotify-row-shell::after {
  right: 0;
  background: linear-gradient(270deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface), 0));
}

.spotify-row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 116px;
  gap: 10px;
  overflow-x: auto;
  padding: 0 18px 8px;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  touch-action: pan-x;
}

.spotify-row::-webkit-scrollbar {
  display: none;
}

.spotify-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  padding: 0;
  scroll-snap-align: start;
}

.spotify-card__art {
  aspect-ratio: 1 / 1;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(180deg, rgba(var(--v-theme-on-surface), 0.08), rgba(var(--v-theme-on-surface), 0.03));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.94);
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.spotify-card__art--image {
  padding: 0;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.spotify-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.spotify-card:hover .spotify-card__art {
  transform: translateY(-1px);
  border-color: rgba(var(--v-theme-primary), 0.28);
}

.spotify-card__art--track {
  background: linear-gradient(180deg, rgba(var(--v-theme-primary), 0.18), rgba(var(--v-theme-primary), 0.06));
}

.spotify-card__art--album {
  background: linear-gradient(180deg, rgba(var(--v-theme-warning), 0.16), rgba(var(--v-theme-warning), 0.05));
}

.spotify-card__art--playlist {
  background: linear-gradient(180deg, rgba(var(--v-theme-success), 0.18), rgba(var(--v-theme-success), 0.05));
}

.spotify-card__art--artist {
  background: linear-gradient(180deg, rgba(var(--v-theme-info), 0.18), rgba(var(--v-theme-info), 0.05));
}

.spotify-card__art--radio {
  background: linear-gradient(180deg, rgba(var(--v-theme-secondary), 0.18), rgba(var(--v-theme-secondary), 0.05));
}

.spotify-card__type {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.58);
}

.spotify-card__title {
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.spotify-card__subtitle {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
  line-height: 1.25;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 600px) {
  .media-browser-card {
    min-height: 460px;
  }

  .media-browser__spotify {
    max-height: min(78vh, 620px);
  }

  .media-browser__search {
    max-height: min(78vh, 560px);
  }

  .media-browser__spotify-sections {
    max-height: min(60vh, 420px);
  }

  .spotify-row {
    grid-auto-columns: 104px;
    gap: 9px;
  }

  .spotify-card__title {
    font-size: 0.82rem;
  }

  .spotify-card__subtitle {
    font-size: 0.72rem;
  }
}
</style>
