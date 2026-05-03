<template>
  <v-tooltip :text="statusLabel" location="bottom">
    <template #activator="{ props }">
      <div v-bind="props" class="connection-dot" :class="statusClass" aria-live="polite">
        <v-icon :icon="statusIcon" size="14" />
      </div>
    </template>
  </v-tooltip>
</template>

<script setup lang="ts">
const { t } = useI18n()
const entityStore = useEntityStore()
const connected = computed(() => entityStore.connected)
const hasConnectedOnce = computed(() => entityStore.hasConnectedOnce)
const isReconnect = computed(() => hasConnectedOnce.value && !connected.value)
const statusIcon = computed(() => connected.value ? 'mdi-wifi-check' : (isReconnect.value ? 'mdi-wifi-refresh' : 'mdi-wifi-strength-outline'))
const statusClass = computed(() => ({
  'connection-dot--connected': connected.value,
  'connection-dot--reconnecting': isReconnect.value,
  'connection-dot--initial': !connected.value && !isReconnect.value,
}))
const statusLabel = computed(() => {
  if (connected.value) return t('connection.connected')
  return isReconnect.value ? t('connection.reconnecting') : t('connection.connecting')
})
</script>

<style scoped>
.connection-dot {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.64);
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.connection-dot--connected {
  color: rgb(var(--v-theme-success));
  background: rgba(var(--v-theme-success), 0.08);
  border-color: rgba(var(--v-theme-success), 0.16);
}

.connection-dot--reconnecting {
  color: rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.1);
  border-color: rgba(var(--v-theme-warning), 0.18);
}
</style>
