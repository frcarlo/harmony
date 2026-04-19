<template>
  <div class="d-flex align-center ga-1 text-caption">
    <v-icon :icon="connected ? 'mdi-wifi' : 'mdi-wifi-off'" :color="connected ? 'success' : 'error'" size="16"
      :class="{ 'blinking': !connected }" />
    <span v-if="!isMobile" :class="connected ? 'text-success' : 'text-error'">
      {{ connected ? t('connection.connected') : t('connection.connecting') }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useDisplay } from 'vuetify'
const { t } = useI18n()
const entityStore = useEntityStore()
const connected = computed(() => entityStore.connected)
const { mobile: isMobile } = useDisplay()
</script>

<style scoped>
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
.blinking { animation: blink 1.2s ease-in-out infinite; }
</style>
