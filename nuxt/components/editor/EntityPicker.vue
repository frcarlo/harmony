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
        <v-list-item v-bind="itemProps" :subtitle="(item as any).entity_id">
          <template #append>
            <div class="d-flex flex-column align-end ga-1">
              <v-chip size="x-small" label color="secondary" class="text-capitalize">{{ (item as any).domain }}</v-chip>
              <v-chip v-if="(item as any).platform" size="x-small" label color="primary" class="text-capitalize">{{ (item as any).platform }}</v-chip>
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
  numericOnly?: boolean
  deviceClass?: string | string[]
}>()
defineEmits<{ 'update:modelValue': [v: string | undefined] }>()

const entityStore = useEntityStore()
const { user } = useUserSession()
const selectedArea = ref<string | null>(null)

// Areas this user is allowed to pick from (null = no restriction)
const allowedAreaIds = computed(() => {
  const areas = user.value?.allowed_areas
  return areas?.length ? areas : null
})

const areaItems = computed(() => {
  const all = entityStore.areas.slice().sort((a, b) => a.name.localeCompare(b.name))
  return allowedAreaIds.value ? all.filter(a => allowedAreaIds.value!.includes(a.area_id)) : all
})

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
  if (props.numericOnly) filtered = filtered.filter((e) => isNumericEntity(e))
  if (props.deviceClass) {
    const classes = Array.isArray(props.deviceClass) ? props.deviceClass : [props.deviceClass]
    filtered = filtered.filter((e) => classes.includes((e.attributes as any)?.device_class ?? ''))
  }

  // Apply area filter: specific selected area, or full allowed-areas restriction
  const effectiveAreas = selectedArea.value ? [selectedArea.value] : allowedAreaIds.value
  if (effectiveAreas) {
    filtered = filtered.filter((e) => effectiveAreas.includes(entityStore.entityAreaMap[e.entity_id] ?? ''))
  }

  return filtered.map((e) => ({
    entity_id: e.entity_id,
    label: (e.attributes?.friendly_name as string) ?? e.entity_id,
    domain: e.entity_id.split('.')[0],
    platform: entityStore.entityPlatformMap[e.entity_id] ?? '',
  }))
})

function isNumericEntity(entity: { state: string }) {
  if (entity.state === 'unknown' || entity.state === 'unavailable') return false
  const value = Number(entity.state)
  return Number.isFinite(value)
}

watch(
  () => [props.modelValue, entityStore.entityAreaMap] as const,
  ([entityId]) => {
    if (!entityId) {
      selectedArea.value = null
      return
    }
    const area = entityStore.entityAreaMap[entityId] ?? null
    // Only pre-select area if it's within allowed areas
    selectedArea.value = (!allowedAreaIds.value || allowedAreaIds.value.includes(area ?? '')) ? area : null
  },
  { immediate: true, deep: true },
)
</script>
