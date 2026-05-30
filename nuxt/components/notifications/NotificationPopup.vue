<template>
  <Transition name="notif-slide">
    <div v-if="active" class="notif-popup" :class="{ 'notif-glass': glass }">
      <!-- Header -->
      <div class="d-flex align-center px-3 pt-3 pb-2 ga-2">
        <v-icon icon="mdi-bell-ring" color="primary" size="16" />
        <span class="text-caption font-weight-medium flex-grow-1">{{ active.rule.name }}</span>
        <span class="text-caption text-medium-emphasis">{{ timeAgo }}</span>
        <v-btn icon="mdi-close" size="x-small" variant="text" density="compact" @click="dismiss" />
      </div>

      <!-- Camera action -->
      <div v-if="active.rule.action_type === 'camera'" class="notif-camera">
        <img :src="snapshotSrc" class="notif-snapshot" :alt="active.rule.action_entity_id" />
        <v-btn size="x-small" variant="tonal" prepend-icon="mdi-play-circle" class="notif-live-btn"
          @click="openCameraDialog">
          {{ t('notification.live') }}
        </v-btn>
      </div>

      <!-- Entity action -->
      <div v-else class="px-3 pb-3">
        <div class="d-flex justify-space-between align-center">
          <span class="text-caption text-medium-emphasis">{{ entityName }}</span>
          <v-chip :color="entityColor" size="x-small" variant="tonal">{{ entityState }}</v-chip>
        </div>
        <v-btn size="x-small" variant="tonal" class="mt-2 w-100" @click="openEntityDetail()">
          {{ t('notification.details') }}
        </v-btn>
      </div>
    </div>
  </Transition>

  <!-- Camera detail dialog — uses frozen IDs so it survives dismiss() -->
  <v-dialog v-model="cameraDialogOpen" max-width="560">
    <v-card v-if="frozenCameraEntityId" rounded="xl" :class="{ 'widget-glass': glass }">
      <div class="d-flex align-center px-4 pt-3 pb-2">
        <v-icon icon="mdi-camera" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold flex-grow-1">{{ frozenCameraRuleName }}</span>
        <v-btn icon="mdi-close" size="small" variant="text" @click="cameraDialogOpen = false" />
      </div>
      <div style="height: 320px; display: flex; flex-direction: column;">
        <CameraWidget :config="{ entity_id: frozenCameraEntityId, stream_type: 'snapshot' }" hide-header />
      </div>
    </v-card>
  </v-dialog>

  <!-- Entity detail dialog — uses frozen entity ID so it survives dismiss() -->
  <LazyLightDetailDialog v-if="frozenEntityId && frozenEntityDomain === 'light'" v-model="entityDialogOpen"
    :entity-id="frozenEntityId" />
  <LazyEntityDetailDialog v-else-if="frozenEntityId" v-model="entityDialogOpen" :entity-id="frozenEntityId" />
</template>

<script setup lang="ts">
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/it'
import 'dayjs/locale/nl'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const { glass } = useGlassEffect()
const { active, dismiss } = useNotificationRules()
const entityStore = useEntityStore()
const { formatEntityState } = useLocalizedEntityState()

const now = useNow({ interval: 10_000 })
const cameraDialogOpen = ref(false)
const frozenCameraEntityId = ref<string | null>(null)
const frozenCameraRuleName = ref<string>('')
const entityDialogOpen = ref(false)
const frozenEntityId = ref<string | null>(null)
const frozenEntityDomain = computed(() => frozenEntityId.value?.split('.')[0] ?? '')

function openCameraDialog() {
  frozenCameraEntityId.value = active.value?.rule.action_entity_id ?? null
  frozenCameraRuleName.value = active.value?.rule.name ?? ''
  cameraDialogOpen.value = true
}

function openEntityDetail() {
  frozenEntityId.value = active.value?.rule.action_entity_id ?? null
  entityDialogOpen.value = true
  dismiss()
}

watch(() => active.value, (v) => {
  if (!v) {
    if (!frozenCameraEntityId.value) cameraDialogOpen.value = false
    if (!frozenEntityId.value) entityDialogOpen.value = false
  }
})

watch(cameraDialogOpen, (v) => {
  if (!v) frozenCameraEntityId.value = null
})

watch(entityDialogOpen, (v) => {
  if (!v) frozenEntityId.value = null
})

const timeAgo = computed(() => {
  if (!active.value) return ''
  void now.value
  return dayjs(active.value.triggeredAt).locale(locale.value).fromNow()
})

const snapshotSrc = computed(() =>
  active.value ? `/api/camera/${active.value.rule.action_entity_id}?t=${active.value.triggeredAt}` : ''
)

const entityName = computed(() => {
  if (!active.value) return ''
  const e = entityStore.entities[active.value.rule.action_entity_id]
  return (e?.attributes?.friendly_name as string) ?? active.value.rule.action_entity_id
})

const entityState = computed(() => {
  if (!active.value) return ''
  return formatEntityState(entityStore.entities[active.value.rule.action_entity_id], '–')
})

const entityColor = computed(() => {
  if (!active.value) return undefined
  const s = entityStore.entities[active.value.rule.action_entity_id]?.state
  if (s === 'on' || s === 'open' || s === 'unlocked') return 'success'
  if (s === 'off' || s === 'closed' || s === 'locked') return undefined
  return 'warning'
})
</script>

<style scoped>
.notif-popup {
  position: fixed;
  top: 72px;
  right: 16px;
  width: 280px;
  z-index: 2000;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.notif-glass {
  background: rgba(var(--v-theme-surface), 0.7) !important;
  backdrop-filter: blur(16px);
}

.notif-camera {
  position: relative;
}

.notif-snapshot {
  width: 100%;
  height: 158px;
  object-fit: cover;
  display: block;
}

.notif-live-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
}

.notif-slide-enter-active,
.notif-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.notif-slide-enter-from,
.notif-slide-leave-to {
  transform: translateX(110%);
  opacity: 0;
}
</style>
