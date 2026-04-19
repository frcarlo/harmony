<template>
  <v-navigation-drawer
    :model-value="open"
    :location="side === 'left' ? 'left' : 'right'"
    :width="widthPx"
    temporary
    :class="{ 'ui-sheet-glass': glass }"
    @update:model-value="v => !v && $emit('close')"
  >
    <div class="pa-5 pb-0">
      <slot name="header" />
    </div>
    <div class="pa-5 overflow-y-auto" style="height: calc(100% - 80px)">
      <slot />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const props = defineProps<{ open: boolean; side?: 'left' | 'right'; width?: string }>()
defineEmits<{ close: [] }>()

const { glass } = useGlassEffect()

const widthPx = computed(() => {
  if (!props.width) return 320
  return parseInt(props.width) || 320
})
</script>
