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
      @update:model-value="$emit('update:modelValue', $event ?? undefined)"
    >
      <template #item="{ item, props: itemProps }">
        <v-list-item v-bind="itemProps" :subtitle="item.raw.entity_id">
          <template #append>
            <div class="d-flex flex-column align-end ga-1">
              <v-chip size="x-small" label color="secondary" class="text-capitalize">{{ item.raw.domain }}</v-chip>
              <v-chip v-if="item.raw.platform" size="x-small" label color="primary" class="text-capitalize">{{ item.raw.platform }}</v-chip>
            </div>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const props = defineProps<{
  modelValue?: string
  domain?: string
  domainFilter?: string | string[]
  placeholder?: string
  platform?: string
}>()
defineEmits<{ 'update:modelValue': [v: string | undefined] }>()

const entityStore = useEntityStore()
const selectedArea = ref<string | null>(null)

const areaItems = computed(() => [
  ...entityStore.areas.slice().sort((a, b) => a.name.localeCompare(b.name)),
])

const domainFilters = computed(() => {
  if (Array.isArray(props.domainFilter)) return props.domainFilter
  if (props.domainFilter) return [props.domainFilter]
  if (props.domain) return [props.domain]
  return []
})

const options = computed(() => {
  const all = Object.values(entityStore.entities)
  let filtered = domainFilters.value.length
    ? all.filter((e) => domainFilters.value.some((domain) => e.entity_id.startsWith(domain + '.')))
    : all
  if (props.platform) filtered = filtered.filter((e) => entityStore.entityPlatformMap[e.entity_id] === props.platform)
  if (selectedArea.value) {
    filtered = filtered.filter((e) => entityStore.entityAreaMap[e.entity_id] === selectedArea.value)
  }
  return filtered.map((e) => ({
    entity_id: e.entity_id,
    label: (e.attributes?.friendly_name as string) ?? e.entity_id,
    domain: e.entity_id.split('.')[0],
    platform: entityStore.entityPlatformMap[e.entity_id] ?? '',
  }))
})

watch(
  () => [props.modelValue, entityStore.entityAreaMap] as const,
  ([entityId]) => {
    if (!entityId) {
      selectedArea.value = null
      return
    }
    selectedArea.value = entityStore.entityAreaMap[entityId] ?? null
  },
  { immediate: true, deep: true },
)
</script>
