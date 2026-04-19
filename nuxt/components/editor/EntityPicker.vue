<template>
  <div class="d-flex flex-column ga-2">
    <v-select
      v-if="entityStore.areas.length"
      v-model="selectedArea"
      :items="areaItems"
      item-title="name"
      item-value="area_id"
      :placeholder="t('entity_picker.all_areas')"
      clearable
      density="compact"
      variant="outlined"
      hide-details
      prepend-inner-icon="mdi-home-outline"
    />
    <v-autocomplete
      :model-value="modelValue"
      :items="options"
      item-title="label"
      item-value="entity_id"
      :placeholder="placeholder ?? t('entity_picker.placeholder')"
      clearable
      :no-data-text="t('entity_picker.no_results')"
      @update:model-value="$emit('update:modelValue', $event ?? '')"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps" :subtitle="item.raw.entity_id">
          <template #append>
            <v-chip size="x-small" label color="secondary" class="ml-1 text-capitalize">
              {{ item.raw.domain }}
            </v-chip>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const props = defineProps<{ modelValue: string; domain?: string; placeholder?: string }>()
defineEmits<{ 'update:modelValue': [v: string] }>()

const entityStore = useEntityStore()
const selectedArea = ref<string | null>(null)

const areaItems = computed(() => [
  ...entityStore.areas.slice().sort((a, b) => a.name.localeCompare(b.name)),
])

const options = computed(() => {
  const all = Object.values(entityStore.entities)
  let filtered = props.domain ? all.filter((e) => e.entity_id.startsWith(props.domain + '.')) : all
  if (selectedArea.value) {
    filtered = filtered.filter((e) => entityStore.entityAreaMap[e.entity_id] === selectedArea.value)
  }
  return filtered.map((e) => ({
    entity_id: e.entity_id,
    label: (e.attributes?.friendly_name as string) ?? e.entity_id,
    domain: e.entity_id.split('.')[0],
  }))
})
</script>
