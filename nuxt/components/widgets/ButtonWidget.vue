<template>
  <div
    class="h-100 d-flex flex-column pa-3 button-card"
    :class="{ 'button-card--pending': isPending }"
    :aria-disabled="isUnavailable || isPending"
    role="button"
    tabindex="0"
    @click="press"
    @keydown.enter.prevent="press"
    @keydown.space.prevent="press"
  >
    <!-- Header -->
    <div class="d-flex align-center ga-2 button-card__header">
      <v-icon :icon="iconName" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="button-card__name">{{ name }}</span>
    </div>

    <!-- Icon + last-pressed centered -->
    <div class="flex-grow-1 d-flex flex-column align-center justify-center ga-2">
      <div class="button-card__icon-wrap">
        <v-icon :icon="iconName" size="28" />
      </div>
      <v-chip
        size="x-small"
        rounded="pill"
        variant="tonal"
        class="button-card__state-chip"
        :color="lastPressedDate ? 'primary' : undefined"
      >
        {{ lastPressedLabel }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ButtonWidgetConfig } from '~/types/dashboard'

const { t, locale } = useI18n()
const { glass } = useGlassEffect()

const props = defineProps<{ config: ButtonWidgetConfig }>()
const entityStore = useEntityStore()
const client = useHAClient()
const now = ref(Date.now())
const isPending = ref(false)

const entity = computed(() => entityStore.entities[props.config.entity_id])
const name = computed(() => props.config.name ?? (entity.value?.attributes?.friendly_name as string) ?? props.config.entity_id)
const iconName = computed(() => props.config.icon || 'mdi-gesture-tap-button')
const isUnavailable = computed(() => !entity.value || entity.value.state === 'unavailable')

const lastPressedDate = computed(() => {
  const raw = entity.value?.state
  if (!raw || raw === 'unknown' || raw === 'unavailable') return null
  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp)
})

const lastPressedLabel = computed(() => {
  const date = lastPressedDate.value
  if (!date) return t('button.never_pressed')

  const diffMs = now.value - date.getTime()
  if (diffMs >= 0 && diffMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(diffMs / 60000))
    return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' }).format(-minutes, 'minute')
  }

  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})

async function press() {
  if (isUnavailable.value || isPending.value) return
  isPending.value = true
  try {
    await client.callService({
      domain: 'button',
      service: 'press',
      target: { entity_id: props.config.entity_id },
    })
    now.value = Date.now()
  } finally {
    window.setTimeout(() => {
      isPending.value = false
      now.value = Date.now()
    }, 500)
  }
}

onMounted(() => {
  const interval = window.setInterval(() => {
    now.value = Date.now()
  }, 60_000)
  onUnmounted(() => window.clearInterval(interval))
})
</script>

<style scoped>
.button-card {
  position: relative;
  justify-content: flex-start;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.button-card__header {
  flex-shrink: 0;
}
.button-card__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
}

.button-card:hover {
  background: rgba(var(--v-theme-on-surface), 0.035);
}

.button-card:active {
  transform: scale(0.99);
}

.button-card[aria-disabled="true"] {
  cursor: not-allowed;
  opacity: 0.62;
}

.button-card__icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.14);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  box-shadow: 0 8px 18px rgba(var(--v-theme-primary), 0.1);
  transition: transform 0.22s ease, box-shadow 0.22s ease;
}

.button-card__state-chip {
  max-width: 100%;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.button-card--pending .button-card__icon-wrap {
  animation: button-card-pulse 0.7s ease-in-out infinite;
}

.button-card--pending .button-card__state-chip {
  transform: translateY(-1px);
  filter: saturate(1.1);
}

@keyframes button-card-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
