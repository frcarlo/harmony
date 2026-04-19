<template>
  <div class="h-100 d-flex align-center px-4">
    <span :class="sizeClass">{{ config.text }}</span>
  </div>
</template>

<script setup lang="ts">
import type { LabelWidgetConfig } from '~/types/dashboard'

const props = defineProps<{ config: LabelWidgetConfig }>()
const sizeClass = computed(() => ({
  sm: 'text-body-2',
  md: 'text-body-1',
  lg: 'text-h6 font-weight-semibold',
  xl: 'text-h4 font-weight-bold',
}[props.config.font_size ?? 'md']))
</script>
