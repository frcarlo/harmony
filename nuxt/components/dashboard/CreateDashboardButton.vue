<template>
  <v-btn color="primary" icon="mdi-plus" size="large" elevation="4"
    class="d-none d-sm-inline-flex"
    style="position: fixed; bottom: 28px; right: 28px; z-index: 10"
    @click="dialog = true" />

  <v-dialog v-model="dialog" max-width="440">
    <v-card :title="t('dashboard.create_title')">
      <v-card-text class="d-flex flex-column ga-3">
        <v-text-field
          v-model="name"
          :label="t('common.name')"
          :placeholder="t('dashboard.name_placeholder')"
          autofocus
          @keydown.enter="handleCreate"
        />
        <div>
          <div class="text-caption text-medium-emphasis mb-2">{{ t('dashboard.icon') }}</div>
          <div class="d-flex flex-wrap ga-1 mb-2">
            <v-btn v-for="ic in PRESET_ICONS" :key="ic" :icon="ic" size="small" variant="text"
              :color="icon === ic ? 'primary' : undefined" @click="icon = ic" />
          </div>
          <v-text-field v-model="icon" density="compact" variant="outlined" hide-details
            placeholder="mdi-home" :prepend-inner-icon="icon || 'mdi-view-dashboard-outline'" />
        </div>
        <div>
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption text-medium-emphasis">{{ t('dashboard.theme') }}</div>
            <v-chip size="small" variant="outlined" rounded="pill">
              {{ selectedThemeLabel }}
            </v-chip>
          </div>
          <div class="theme-preview mb-3" :style="themePreviewStyle">
            <div class="theme-preview__header">
              <span class="theme-preview__dot" />
              <span>{{ name.trim() || t('dashboard.new') }}</span>
            </div>
            <div class="theme-preview__tiles">
              <span />
              <span />
              <span />
            </div>
          </div>
          <ThemeToggle
            v-model="themeOverride"
            allow-default
            button-icon="mdi-palette-outline"
            :button-title="t('dashboard.theme')"
          />
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!name.trim()" :loading="loading"
          @click="handleCreate">{{ t('common.create') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Dashboard } from '~/types/dashboard'

const { t } = useI18n()
const emit = defineEmits<{ created: [] }>()
const router = useRouter()
const { getThemeOption } = useDashboardThemes()

const PRESET_ICONS = [
  'mdi-view-dashboard-outline', 'mdi-home-outline', 'mdi-sofa-outline',
  'mdi-bed-outline', 'mdi-silverware-fork-knife', 'mdi-garage-variant',
  'mdi-sprout-outline', 'mdi-office-building-outline', 'mdi-car-outline',
  'mdi-star-outline', 'mdi-heart-outline', 'mdi-lightning-bolt-outline',
]

const dialog = ref(false)
const name = ref('')
const icon = ref('')
const themeOverride = ref<string | null>(null)
const loading = ref(false)

const selectedTheme = computed(() => getThemeOption(themeOverride.value))
const selectedThemeLabel = computed(() => selectedTheme.value?.name ?? t('dashboard.theme_global'))
const themePreviewStyle = computed(() => ({
  '--preview-bg': selectedTheme.value?.bg ?? 'rgb(var(--v-theme-surface))',
  '--preview-primary': selectedTheme.value?.primary ?? 'rgb(var(--v-theme-primary))',
  '--preview-text': selectedTheme.value?.dark ? '#f8fafc' : '#111827',
}))

watch(dialog, (v) => {
  if (!v) {
    name.value = ''
    icon.value = ''
    themeOverride.value = null
  }
})

async function handleCreate() {
  if (!name.value.trim()) return
  loading.value = true
  try {
    const dashboard = await $fetch<Dashboard>('/api/dashboards', {
      method: 'POST',
      body: {
        name: name.value.trim(),
        icon: icon.value || undefined,
        theme_override: themeOverride.value || undefined,
      },
    })
    toast.success(t('dashboard.created', { name: dashboard.name }))
    dialog.value = false
    emit('created')
    router.push(`/edit/${dashboard.id}`)
  } catch {
    toast.error(t('dashboard.create_error'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.theme-preview {
  border-radius: 16px;
  padding: 14px;
  color: var(--preview-text);
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--preview-bg) 88%, white 12%), var(--preview-bg));
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.theme-preview__header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 12px;
}

.theme-preview__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--preview-primary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--preview-primary) 18%, transparent);
}

.theme-preview__tiles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.theme-preview__tiles span {
  display: block;
  height: 44px;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.04)),
    color-mix(in srgb, var(--preview-bg) 78%, var(--preview-primary) 22%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
