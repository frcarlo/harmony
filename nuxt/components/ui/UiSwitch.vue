<template>
  <v-btn :icon="checked ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'"
    :color="checked ? 'primary' : undefined" variant="text" density="compact" :disabled="disabled"
    role="switch" :aria-checked="checked" :aria-label="label ?? t('common.toggle')"
    @click="$emit('change', !checked)" />
</template>

<script setup lang="ts">
const { t } = useI18n()
defineProps<{ checked: boolean; disabled?: boolean; label?: string }>()
defineEmits<{ change: [value: boolean] }>()
</script>
