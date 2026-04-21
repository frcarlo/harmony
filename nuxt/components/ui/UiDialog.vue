<template>
  <v-dialog :model-value="open" max-width="480" @update:model-value="v => !v && $emit('close')" persistent>
    <v-card>
      <v-card-text class="pa-6">
        <slot />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
</script>
