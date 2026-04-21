<template>
  <v-dialog :model-value="open" max-width="360" @update:model-value="v => !v && $emit('close')">
    <v-card rounded="lg" :class="{ 'dialog-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pa-3 pb-1">
        <v-btn v-if="activeTab === 'browse' && stack.length > 0" icon="mdi-arrow-left" size="x-small" variant="text" @click="goBack" />
        <span class="text-subtitle-2 font-weight-semibold text-truncate flex-grow-1">
          {{ activeTab === 'search' ? t('media.search') : currentTitle }}
        </span>
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="$emit('close')" />
      </v-card-title>

      <!-- Tabs: Browse / Search (only if MA available) -->
      <v-tabs v-if="maAvailable" v-model="activeTab" density="compact" class="px-2">
        <v-tab value="browse" prepend-icon="mdi-folder-music-outline" size="small">{{ t('media.library') }}</v-tab>
        <v-tab value="search" prepend-icon="mdi-magnify" size="small">{{ t('media.search') }}</v-tab>
      </v-tabs>

      <!-- Browse tab -->
      <v-card-text v-if="activeTab === 'browse'" class="pa-2 bg-transparent" style="max-height: 420px; overflow-y: auto;">
        <div v-if="loading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>
        <div v-else-if="error" class="text-caption text-medium-emphasis text-center py-4">{{ error }}</div>
        <v-list v-else density="compact" nav class="bg-transparent">
          <v-list-item
            v-for="item in children" :key="item.media_content_id"
            :title="item.title"
            :prepend-icon="item.thumbnail ? undefined : mediaIcon(item)"
            rounded="lg" class="mb-1"
            @click="handleClick(item)"
          >
            <template v-if="item.thumbnail" #prepend>
              <v-avatar size="36" rounded="md" class="mr-2">
                <v-img :src="item.thumbnail" cover />
              </v-avatar>
            </template>
            <template #append>
              <div class="d-flex align-center ga-1">
                <v-btn v-if="item.can_play" icon="mdi-play" size="x-small" variant="text" color="primary" @click.stop="play(item)" />
                <v-icon v-if="item.can_expand" icon="mdi-chevron-right" size="16" color="medium-emphasis" />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <!-- Search tab -->
      <v-card-text v-else class="pa-2 bg-transparent d-flex flex-column ga-2" style="max-height: 480px;">
        <v-text-field
          v-model="searchQuery"
          :placeholder="t('media.search_placeholder')"
          prepend-inner-icon="mdi-magnify"
          density="compact" hide-details clearable variant="outlined" rounded="lg"
          @keyup.enter="doSearch"
        >
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
            <v-tab
              v-for="section in searchSections.filter(s => s.items.length)"
              :key="section.key"
              :value="section.key"
              size="small"
            >
              {{ section.label }}
              <v-chip size="x-small" class="ml-1" density="compact">{{ section.items.length }}</v-chip>
            </v-tab>
          </v-tabs>
          <div class="overflow-y-auto" style="max-height: 340px;">
            <v-list density="compact" nav class="bg-transparent pa-0">
              <v-list-item
                v-for="item in activeSearchSection" :key="item.uri"
                :title="item.name"
                :subtitle="itemSubtitle(item)"
                rounded="lg" class="mb-1"
              >
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
import type { BrowseMediaNode } from '~/types/ha'
import type { MAItem, MASearchResult } from '~/composables/useMAClient'

const { glass } = useGlassEffect()
const { t } = useI18n()

const props = defineProps<{ open: boolean; entityId: string }>()
const emit = defineEmits<{ close: [] }>()

const client = useHAClient()
const entityStore = useEntityStore()
const { checkStatus, search, maImageUrl, isAvailable } = useMAClient()

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
const activeTab = ref<'browse' | 'search'>('browse')
const maAvailable = ref(false)
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
    activeTab.value = 'browse'
    searchDone.value = false
    searchQuery.value = ''
    await browse()
    const isMAEntity = entityStore.entityPlatformMap[props.entityId] === 'music_assistant'
    maAvailable.value = isMAEntity && (await checkStatus()).available
  }
})
</script>
