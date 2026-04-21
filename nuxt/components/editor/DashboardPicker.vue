<template>
  <v-select
    :model-value="modelValue"
    :items="items"
    item-title="name"
    item-value="id"
    :label="t('config.target_dashboard')"
    density="compact"
    variant="outlined"
    hide-details
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #item="{ props: ip, item }">
      <v-list-item v-bind="ip" :prepend-icon="item.raw.icon || 'mdi-view-dashboard-outline'" />
    </template>
    <template #selection="{ item }">
      <div class="d-flex align-center ga-2">
        <v-icon :icon="item.raw.icon || 'mdi-view-dashboard-outline'" size="16" />
        <span>{{ item.raw.name }}</span>
      </div>
    </template>
  </v-select>
</template>

<script setup lang="ts">
import type { DashboardListItem } from '~/types/dashboard'

const { t } = useI18n()
defineProps<{ modelValue: unknown }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const items = ref<DashboardListItem[]>([])
onMounted(async () => {
  items.value = await $fetch<DashboardListItem[]>('/api/dashboards')
})
</script>
