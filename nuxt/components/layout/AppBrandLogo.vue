<template>
  <img
    class="app-brand-logo"
    :class="{ 'app-brand-logo--rounded': rounded }"
    :src="src"
    :alt="alt"
    :width="size"
    :height="size"
    decoding="async"
  >
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const props = withDefaults(defineProps<{
  size?: number
  rounded?: boolean
  alt?: string
}>(), {
  size: 48,
  rounded: false,
  alt: 'HArmony',
})

const theme = useTheme()
const iconTheme = computed(() => (theme.current.value.dark ? 'dark' : 'light'))
const src = computed(() => `/icons/harmony/${iconTheme.value}/logo/logo-512.png`)
</script>

<style scoped>
.app-brand-logo {
  display: block;
  flex: 0 0 auto;
  object-fit: contain;
}

.app-brand-logo--rounded {
  border-radius: 8px;
}
</style>
