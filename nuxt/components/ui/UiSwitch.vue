<template>
  <v-btn :icon="checked ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'"
    :color="checked ? 'primary' : 'medium-emphasis'" variant="text" density="compact" :disabled="disabled"
    @click="$emit('change', !checked)" />
</template>

<script setup lang="ts">
defineProps<{ checked: boolean; disabled?: boolean }>()
defineEmits<{ change: [value: boolean] }>()
</script>
