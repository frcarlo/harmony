<template>
  <v-dialog :model-value="open" max-width="320" @update:model-value="v => !v && $emit('close')">
    <v-card rounded="lg" :class="{ 'widget-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pa-3 pb-2">
        <v-btn
          v-if="stack.length > 0"
          icon="mdi-arrow-left"
          size="x-small"
          variant="text"
          @click="goBack"
        />
        <span class="text-subtitle-2 font-weight-semibold text-truncate flex-grow-1">
          {{ currentTitle }}
        </span>
        <v-btn icon="mdi-close" size="x-small" variant="text" @click="$emit('close')" />
      </v-card-title>

      <v-card-text class="pa-2 bg-transparent" style="max-height: 420px; overflow-y: auto;">
        <div v-if="loading" class="d-flex justify-center py-6">
          <v-progress-circular indeterminate size="28" color="primary" />
        </div>

        <div v-else-if="error" class="text-caption text-medium-emphasis text-center py-4">
          {{ error }}
        </div>

        <v-list v-else density="compact" nav class="bg-transparent">
          <v-list-item
            v-for="item in children"
            :key="item.media_content_id"
            :title="item.title"
            :prepend-icon="item.thumbnail ? undefined : mediaIcon(item)"
            rounded="lg"
            class="mb-1"
            @click="handleClick(item)"
          >
            <template v-if="item.thumbnail" #prepend>
              <v-avatar size="36" rounded="md" class="mr-2">
                <v-img :src="item.thumbnail" cover />
              </v-avatar>
            </template>
            <template #append>
              <div class="d-flex align-center ga-1">
                <v-btn
                  v-if="item.can_play"
                  icon="mdi-play"
                  size="x-small"
                  variant="text"
                  color="primary"
                  @click.stop="play(item)"
                />
                <v-icon v-if="item.can_expand" icon="mdi-chevron-right" size="16" color="medium-emphasis" />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { BrowseMediaNode } from '~/types/ha'

const { glass } = useGlassEffect()

const props = defineProps<{
  open: boolean
  entityId: string
}>()

const emit = defineEmits<{ close: [] }>()

const client = useHAClient()

interface StackEntry { title: string; contentType: string; contentId: string }

const stack = ref<StackEntry[]>([])
const children = ref<BrowseMediaNode[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const { t } = useI18n()
const currentTitle = computed(() => stack.value.at(-1)?.title ?? t('media.library'))

async function browse(contentType?: string, contentId?: string, title = 'Medienbibliothek') {
  loading.value = true
  error.value = null
  try {
    const result = await client.browseMedia(props.entityId, contentType, contentId)
    const all = result.children ?? []
    if (stack.value.length === 0) {
      console.log('[MediaBrowser] Root items:', all.map(i => `"${i.title}" (class=${i.media_class}, type=${i.media_content_type}, id=${i.media_content_id})`))
    }
    children.value = stack.value.length === 0
      ? all.filter(i => /^radio$|radio.?browser|frcarlo/i.test(i.title))
      : all
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
    await browse(item.media_content_type, item.media_content_id, item.title)
  } else if (item.can_play) {
    await play(item)
  }
}

async function goBack() {
  stack.value.pop()
  const prev = stack.value.at(-1)
  await browse(prev?.contentType || undefined, prev?.contentId || undefined, prev?.title)
}

async function play(item: BrowseMediaNode) {
  await client.callService({
    domain: 'media_player',
    service: 'play_media',
    target: { entity_id: props.entityId },
    service_data: {
      media_content_id: item.media_content_id,
      media_content_type: item.media_content_type,
    },
  })
  emit('close')
}

function mediaIcon(item: BrowseMediaNode): string {
  const map: Record<string, string> = {
    album: 'mdi-album',
    artist: 'mdi-account-music',
    track: 'mdi-music-note',
    playlist: 'mdi-playlist-music',
    podcast: 'mdi-podcast',
    episode: 'mdi-podcast',
    channel: 'mdi-radio',
    radio: 'mdi-radio',
    directory: 'mdi-folder-music',
    music: 'mdi-music',
    favorites: 'mdi-heart',
    recent: 'mdi-history',
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
    await browse()
  }
})
</script>
