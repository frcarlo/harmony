<template>
  <div>
    <v-menu v-model="open" :close-on-content-click="false" offset="8">
      <template #activator="{ props: menuProps }">
        <div class="d-flex align-center ga-2">
          <v-btn v-bind="menuProps" variant="flat" icon density="comfortable" rounded="sm"
            :style="{ backgroundColor: modelValue ?? 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }" />
          <span class="text-caption text-medium-emphasis flex-grow-1">{{ label }}</span>
          <v-btn v-if="clearable && modelValue" icon="mdi-close" size="x-small" variant="text" density="compact"
            @click.stop="$emit('update:modelValue', undefined)" />
        </div>
      </template>

      <v-card width="270" rounded="lg">
        <!-- Preset swatches -->
        <div class="d-flex ga-2 pa-3 pb-2 flex-wrap">
          <v-btn v-for="preset in presets" :key="preset.color" icon density="comfortable" rounded="sm" variant="flat"
            border :title="preset.name" :style="{
              backgroundColor: preset.color,
              outline: modelValue === preset.color ? '2px solid white' : '2px solid transparent',
              outlineOffset: '2px',
            }" @click="pick(preset.color)" />
        </div>

        <v-divider />

        <v-color-picker :model-value="modelValue ?? '#6366f1'" mode="hex" :modes="['hex']" hide-inputs show-swatches
          :swatches="[]" elevation="0" width="270" @update:model-value="pick($event)" />
      </v-card>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const props = defineProps<{
  modelValue?: string
  label?: string
  clearable?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string | undefined] }>()

const open = ref(false)
const theme = useTheme()

const PRESET_KEYS = ['primary', 'info', 'success', 'warning', 'error', 'secondary', 'surface', 'on-surface'] as const

const presets = computed(() =>
  PRESET_KEYS.map((key) => ({
    name: key,
    color: theme.current.value.colors[key] as string,
  }))
)

function pick(color: string) {
  emit('update:modelValue', color)
}
</script>
