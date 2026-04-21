<template>
  <v-dialog :model-value="modelValue" max-width="420" scrollable @update:model-value="v => emit('update:modelValue', v)">
    <v-card rounded="xl" :class="{ 'dialog-glass': glass }">
      <v-card-title class="d-flex align-center ga-2 pt-4 px-4">
        <v-icon :icon="draft.entry_type === 'group' ? 'mdi-filter-outline' : 'mdi-eye-outline'" size="18" />
        <span class="text-body-1 font-weight-bold flex-grow-1">
          {{ draft.entry_type === 'group' ? t('config.entry_type_group') : t('config.entry_type_single') }}
        </span>
        <v-btn-toggle
          :model-value="draft.entry_type === 'group' ? 'group' : 'single'"
          density="compact" rounded="lg" variant="outlined" mandatory
          @update:model-value="switchType"
        >
          <v-btn value="single" size="small">{{ t('config.entry_type_single') }}</v-btn>
          <v-btn value="group" size="small" color="primary">{{ t('config.entry_type_group') }}</v-btn>
        </v-btn-toggle>
      </v-card-title>

      <v-card-text class="d-flex flex-column ga-3 px-4 py-3">
        <!-- Single entity -->
        <template v-if="draft.entry_type !== 'group'">
          <EntityPicker v-model="draft.entity_id" />
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-circle" />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <v-text-field v-model="draft.active_state" :label="t('config.active_state')"
            :placeholder="t('config.active_state_hint')" density="compact" hide-details clearable />
          <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
        </template>

        <!-- Group -->
        <template v-else>
          <UiIconPicker v-model="draft.icon" :label="t('config.icon_field')" placeholder="mdi-lightbulb-group-outline" />
          <v-btn-toggle v-model="draft.icon_size" density="compact" rounded="lg" variant="outlined">
            <v-btn value="sm" size="small">S</v-btn>
            <v-btn value="md" size="small">M</v-btn>
            <v-btn value="lg" size="small">L</v-btn>
          </v-btn-toggle>
          <v-text-field v-model="draft.label" :label="t('config.display_name')" density="compact" hide-details clearable />
          <v-divider />
          <p class="text-caption text-medium-emphasis text-uppercase font-weight-medium">{{ t('config.group_filter') }}</p>
          <v-select
            v-model="draft.filter.domains"
            :items="availableDomains"
            :label="t('config.filter_domains')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-text-field v-model="draft.filter.name_contains" :label="t('config.filter_name_contains')"
            density="compact" hide-details clearable placeholder="kueche" />
          <v-text-field v-model="draft.filter.name_starts_with" :label="t('config.filter_name_starts_with')"
            density="compact" hide-details clearable placeholder="light.eg_" />
          <v-select
            v-model="draft.filter.areas"
            :items="areaItems"
            item-title="name" item-value="area_id"
            :label="t('config.filter_areas')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-select
            v-model="draft.filter.labels"
            :items="labelItems"
            item-title="name" item-value="label_id"
            :label="t('config.filter_labels')"
            density="compact" hide-details multiple chips closable-chips
          />
          <v-checkbox v-model="draft.filter.exclude_groups" :label="t('config.exclude_groups')" hide-details density="compact" />
          <v-divider />
          <v-checkbox v-model="draft.show_badge" :label="t('config.show_badge')" hide-details density="compact" />
          <UiColorPicker v-model="draft.active_color" :label="t('config.active_color')" clearable />
          <UiColorPicker v-model="draft.inactive_color" :label="t('config.inactive_color')" clearable />
        </template>
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="emit('update:modelValue', false)">{{ t('common.cancel') }}</v-btn>
        <v-btn variant="tonal" color="primary" @click="save">{{ t('common.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { glass } = useGlassEffect()
const entityStore = useEntityStore()

const props = defineProps<{
  modelValue: boolean
  entry: Record<string, unknown>
}>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  save: [Record<string, unknown>]
}>()

const draft = ref<Record<string, unknown>>({})

watch(() => props.modelValue, (v) => {
  if (v) draft.value = JSON.parse(JSON.stringify(props.entry))
}, { immediate: true })

function switchType(type: string) {
  if (type === 'group') {
    draft.value = { entry_type: 'group', icon: draft.value.icon ?? 'mdi-lightbulb-group-outline', filter: { domains: [] }, show_badge: true }
  } else {
    draft.value = { entity_id: '', icon: draft.value.icon ?? 'mdi-circle', active_state: 'on', label: draft.value.label }
  }
}

function save() {
  const payload = JSON.parse(JSON.stringify(toRaw(draft.value)))
  emit('save', payload)
  emit('update:modelValue', false)
}

const availableDomains = computed(() => {
  const domains = new Set<string>()
  for (const id of Object.keys(entityStore.entities)) {
    const d = id.split('.')[0]
    if (d) domains.add(d)
  }
  return [...domains].sort()
})

const areaItems = computed(() => entityStore.areas)
const labelItems = computed(() => entityStore.labels)

// ensure filter object exists when group
const draftAsGroup = computed(() => draft.value as Record<string, unknown> & { filter: Record<string, unknown> })
watch(draft, (d) => {
  if (d.entry_type === 'group') {
    if (!d.filter) d.filter = {}
    const f = d.filter as Record<string, unknown>
    if (!Array.isArray(f.labels)) f.labels = []
    if (!Array.isArray(f.areas)) f.areas = []
    if (!Array.isArray(f.domains)) f.domains = []
  }
}, { deep: true, immediate: true })
</script>
