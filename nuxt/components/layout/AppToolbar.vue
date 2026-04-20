<template>
  <v-app-bar density="compact" color="transparent" border="b" elevation="0">

    <v-btn icon="mdi-chevron-left" size="small" to="/dashboard" />
    <v-divider vertical class="mx-2 my-2" />

    <!-- Dashboard icon (click to change in edit mode) -->
    <v-menu v-if="editMode" v-model="iconMenuOpen" :close-on-content-click="false" offset="8">
      <template #activator="{ props: menuProps }">
        <v-btn v-bind="menuProps" :icon="localIcon || 'mdi-view-dashboard-outline'" size="small" variant="text"
          class="mr-1" />
      </template>
      <v-card min-width="260" rounded="lg">
        <v-card-text class="pa-3">
          <div class="d-flex flex-wrap ga-1 mb-3">
            <v-btn v-for="ic in PRESET_ICONS" :key="ic" :icon="ic" size="small" variant="text"
              :color="localIcon === ic ? 'primary' : undefined" @click="pickIcon(ic)" />
          </div>
          <v-text-field v-model="localIcon" density="compact" variant="outlined" hide-details placeholder="mdi-home"
            :prepend-inner-icon="localIcon || 'mdi-view-dashboard-outline'" @update:model-value="commitIcon" />
        </v-card-text>
      </v-card>
    </v-menu>
    <v-icon v-else :icon="dashboardIcon || 'mdi-view-dashboard-outline'" size="20" class="mr-2" />

    <!-- Dashboard-Name -->
    <v-text-field v-if="editMode && editingName" ref="nameInput" v-model="localName" density="compact"
      variant="underlined" hide-details autofocus class="name-field" style="max-width: 220px" @blur="commitName"
      @keydown.enter="commitName" @keydown.escape="cancelName" />
    <v-btn v-else-if="editMode" variant="text" density="compact" append-icon="mdi-pencil"
      class="text-body-2 font-weight-medium text-truncate px-2" style="max-width: 220px" @click="startEditName">{{
        dashboardName }}</v-btn>
    <v-app-bar-title v-else class="text-body-2 font-weight-medium">
      {{ dashboardName }}
    </v-app-bar-title>

    <template #append>
      <ToolbarActions :edit-mode="editMode" :can-edit="!hideEdit" @toggle-edit="$emit('toggle-edit')" />
      <v-divider vertical class="mx-2 my-2" />


      <!-- Background picker -->
      <v-menu v-if="editMode" v-model="bgMenuOpen" :close-on-content-click="false" offset="8">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-image-outline" size="small" variant="text" class="mr-1" />
        </template>
        <v-card min-width="280" rounded="lg">
          <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis mb-2">{{ t('toolbar.background') }}</div>
            <div class="d-flex flex-wrap ga-1 mb-3">
              <v-btn v-for="c in BG_PRESETS" :key="c.value" size="32" rounded="sm" variant="flat"
                :style="{ background: c.css }" :title="c.label"
                @click="pickBg(c.value)" />
              <v-btn size="32" rounded="sm" variant="outlined" icon="mdi-close-circle-outline"
                :title="t('toolbar.bg_none')" @click="pickBg(undefined)" />
            </div>
            <v-text-field v-model="localBg" density="compact" variant="outlined" hide-details
              :placeholder="t('toolbar.bg_placeholder')" @update:model-value="commitBg" />
          </v-card-text>
        </v-card>
      </v-menu>

      <!-- Grid settings -->
      <v-menu v-if="editMode" v-model="gridMenuOpen" :close-on-content-click="false" offset="8">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon="mdi-view-grid-plus-outline" size="small" variant="text" class="mr-1"
            :title="t('toolbar.grid_settings')" />
        </template>
        <v-card min-width="260" rounded="lg">
          <v-card-text class="pa-3">
            <div class="text-caption text-medium-emphasis mb-3">{{ t('toolbar.grid_settings') }}</div>
            <div class="text-caption mb-1">{{ t('toolbar.grid_columns', { n: localGrid.columns }) }}</div>
            <v-slider v-model="localGrid.columns" :min="8" :max="48" :step="4" hide-details density="compact"
              color="primary" class="mb-3" @update:model-value="emitGrid" />
            <div class="text-caption mb-1">{{ t('toolbar.grid_cell_height', { n: localGrid.cell_height }) }}</div>
            <v-slider v-model="localGrid.cell_height" :min="40" :max="160" :step="10" hide-details density="compact"
              color="primary" class="mb-3" @update:model-value="emitGrid" />
            <div class="text-caption mb-1">{{ t('toolbar.grid_margin', { n: localGrid.margin }) }}</div>
            <v-slider v-model="localGrid.margin" :min="0" :max="24" :step="2" hide-details density="compact"
              color="primary" class="mb-3" @update:model-value="emitGrid" />
            <v-switch v-model="localGrid.breakpoints" :label="t('toolbar.grid_breakpoints')" density="compact"
              hide-details color="primary" class="mb-3" @update:model-value="emitGrid" />
            <div class="text-caption mb-2">{{ t('toolbar.grid_preview') }}</div>
            <v-btn-toggle v-model="localGrid.max_width" density="compact" color="primary" class="w-100"
              @update:model-value="emitGrid">
              <v-btn :value="undefined" size="small" class="flex-1-1" icon="mdi-monitor" :title="t('toolbar.grid_preview_full')" />
              <v-btn :value="1280" size="small" class="flex-1-1" icon="mdi-laptop" :title="t('toolbar.grid_preview_laptop')" />
              <v-btn :value="1024" size="small" class="flex-1-1" icon="mdi-tablet" :title="t('toolbar.grid_preview_tablet')" />
              <v-btn :value="768" size="small" class="flex-1-1" icon="mdi-tablet-cellphone" :title="t('toolbar.grid_preview_tablet_portrait')" />
              <v-btn :value="375" size="small" class="flex-1-1" icon="mdi-cellphone" :title="t('toolbar.grid_preview_mobile')" />
            </v-btn-toggle>
          </v-card-text>
        </v-card>
      </v-menu>

      <v-btn v-if="editMode" color="primary" variant="flat" prepend-icon="mdi-plus" size="small" class="mr-1"
        @click="$emit('add-widget')">{{ t('toolbar.add_widget') }}</v-btn>

      <v-btn v-if="editMode" variant="tonal" prepend-icon="mdi-content-save" size="small" :loading="saving" class="mr-2"
        @click="$emit('save')">{{ t('toolbar.save') }}</v-btn>
    </template>
  </v-app-bar>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = defineProps<{
  dashboardName: string
  dashboardId: string
  dashboardIcon?: string
  dashboardBackground?: string
  dashboardGridConfig?: { columns?: number; cell_height?: number; margin?: number; breakpoints?: boolean; max_width?: number }
  editMode?: boolean
  saving?: boolean
  hideEdit?: boolean
}>()

const emit = defineEmits<{
  'toggle-edit': []
  'add-widget': []
  'save': []
  'rename': [name: string]
  'reicon': [icon: string]
  'rebackground': [bg: string | undefined]
  'regrid': [cfg: { columns?: number; cell_height?: number; margin?: number; breakpoints?: boolean; max_width?: number }]
}>()

const PRESET_ICONS = [
  'mdi-view-dashboard-outline', 'mdi-home-outline', 'mdi-sofa-outline',
  'mdi-bed-outline', 'mdi-silverware-fork-knife', 'mdi-garage-variant',
  'mdi-sprout-outline', 'mdi-office-building-outline', 'mdi-car-outline',
  'mdi-star-outline', 'mdi-heart-outline', 'mdi-lightning-bolt-outline',
]

const BG_PRESETS = [
  { label: 'Nacht', value: 'linear-gradient(135deg,#0d1117 0%,#1a1f2e 100%)', css: 'linear-gradient(135deg,#0d1117 0%,#1a1f2e 100%)' },
  { label: 'Ozean', value: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', css: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)' },
  { label: 'Lila', value: 'linear-gradient(135deg,#1a0533 0%,#2d1b69 100%)', css: 'linear-gradient(135deg,#1a0533 0%,#2d1b69 100%)' },
  { label: 'Sonnenuntergang', value: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', css: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' },
  { label: 'Wald', value: 'linear-gradient(135deg,#0a1628 0%,#1e3a2f 100%)', css: 'linear-gradient(135deg,#0a1628 0%,#1e3a2f 100%)' },
  { label: 'Rot', value: 'linear-gradient(135deg,#1a0a0a 0%,#3a1a1a 100%)', css: 'linear-gradient(135deg,#1a0a0a 0%,#3a1a1a 100%)' },
]

const editingName = ref(false)
const localName = ref('')
const iconMenuOpen = ref(false)
const bgMenuOpen = ref(false)
const gridMenuOpen = ref(false)
const localIcon = ref(props.dashboardIcon ?? '')
const localBg = ref(props.dashboardBackground ?? '')
const localGrid = ref({
  columns: props.dashboardGridConfig?.columns ?? 24,
  cell_height: props.dashboardGridConfig?.cell_height ?? 60,
  margin: props.dashboardGridConfig?.margin ?? 6,
  breakpoints: props.dashboardGridConfig?.breakpoints ?? true,
  max_width: props.dashboardGridConfig?.max_width as number | undefined,
})

watch(() => props.dashboardIcon, (v) => { localIcon.value = v ?? '' }, { immediate: true })
watch(() => props.dashboardBackground, (v) => { localBg.value = v ?? '' }, { immediate: true })
watch(() => props.dashboardGridConfig, (v) => {
  localGrid.value = {
    columns: v?.columns ?? 24,
    cell_height: v?.cell_height ?? 60,
    margin: v?.margin ?? 6,
    breakpoints: v?.breakpoints ?? true,
    max_width: v?.max_width,
  }
}, { immediate: true })

function pickIcon(ic: string) {
  localIcon.value = ic
  emit('reicon', ic)
  iconMenuOpen.value = false
}

function commitIcon(val: string) { emit('reicon', val) }

function pickBg(val: string | undefined) {
  localBg.value = val ?? ''
  emit('rebackground', val)
  bgMenuOpen.value = false
}

function commitBg(val: string) { emit('rebackground', val || undefined) }

function emitGrid() { emit('regrid', { ...localGrid.value }) }

function startEditName() {
  localName.value = props.dashboardName
  editingName.value = true
}

function commitName() {
  const trimmed = localName.value.trim()
  if (trimmed && trimmed !== props.dashboardName) emit('rename', trimmed)
  editingName.value = false
}

function cancelName() { editingName.value = false }

watch(() => props.editMode, (v) => { if (!v) editingName.value = false })
</script>

<style scoped>
.name-field :deep(.v-field__input) {
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
