<template>
  <div class="h-100 d-flex flex-column pa-4">
    <div class="d-flex align-center ga-2 mb-2">
      <v-icon :icon="isLocked ? 'mdi-lock' : 'mdi-lock-open'" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis text-truncate">{{ name }}</span>
    </div>
    <div class="flex-grow-1 d-flex flex-column align-center justify-center ga-3">
      <div class="text-h6 font-weight-semibold" :class="isLocked ? 'text-on-surface' : 'text-medium-emphasis'">
        {{ isUnavailable ? 'N/A' : isLocked ? t('common.locked') : t('common.unlocked') }}
      </div>
      <div v-if="confirming" class="d-flex ga-2">
        <v-btn variant="tonal" size="small" @click="confirming = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" size="small" @click="doAction">{{ t('common.unlock') }}</v-btn>
      </div>
      <v-btn v-else variant="tonal" size="small" :disabled="isUnavailable" @click="handleClick">
        {{ isLocked ? t('common.unlock') : t('common.lock') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LockWidgetConfig } from '~/types/dashboard'

const { t } = useI18n()

const props = defineProps<{ config: LockWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const isLocked = computed(() => entity.value?.state === 'locked')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')
const confirming = ref(false)

async function doAction() {
  if (isUnavailable.value) return
  await client.callService({ domain: 'lock', service: isLocked.value ? 'unlock' : 'lock', target: { entity_id: props.config.entity_id } })
  confirming.value = false
}
function handleClick() {
  if (props.config.require_confirmation !== false && !isLocked.value) confirming.value = true
  else doAction()
}
</script>
