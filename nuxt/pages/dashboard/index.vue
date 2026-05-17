<template>
  <div :style="bgBase" style="min-height:100vh;position:relative">
    <div v-if="bgImage" :style="bgImageStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
    <div v-if="bgImage" :style="bgOverlayStyle" style="position:absolute;inset:0;z-index:0;pointer-events:none" />
    <div style="position:relative;z-index:1;min-height:100vh" class="d-flex flex-column">
      <v-app-bar color="transparent" border="b" elevation="0">
        <template #prepend>
          <AppBrandLogo :size="44" class="ml-4" />
        </template>
        <template #append>
          <v-btn v-if="isAdmin" icon="mdi-import" size="small" variant="text" :title="t('dashboard.import')"
            :loading="importing" @click="importInput?.click()" />
          <input ref="importInput" type="file" accept=".json,application/json" class="d-none" @change="handleImport" />

          <!-- Background picker (admin only) -->
          <v-menu v-if="isAdmin" v-model="bgMenuOpen" :close-on-content-click="false" offset="8">
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon="mdi-image-outline" size="small" variant="text"
                :color="homeSettings.background ? 'primary' : undefined" :title="t('toolbar.background')" />
            </template>
            <v-card min-width="280" rounded="lg">
              <v-card-text class="pa-3">
                <div class="text-caption text-medium-emphasis mb-2">{{ t('toolbar.background') }}</div>
                <div class="d-flex flex-wrap ga-1 mb-3">
                  <v-btn v-for="c in BG_PRESETS" :key="c.value" size="32" rounded="sm" variant="flat"
                    :style="{ background: c.css, outline: localBg === c.value ? '2px solid rgb(var(--v-theme-primary))' : 'none', outlineOffset: '2px' }"
                    :title="c.label" @click="pickBg(c.value)" />
                  <v-btn size="32" rounded="sm" variant="outlined" icon="mdi-close-circle-outline"
                    :title="t('toolbar.bg_none')" @click="pickBg(undefined)" />
                </div>
                <v-btn variant="tonal" prepend-icon="mdi-upload" size="small" class="mb-3 w-100"
                  :loading="bgUploading" @click="bgFileInput?.click()">
                  {{ t('toolbar.bg_upload') }}
                </v-btn>
                <input ref="bgFileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
                  class="d-none" @change="onBgFileChange" />
                <v-text-field v-model="localBg" density="compact" variant="outlined" hide-details clearable
                  :placeholder="t('toolbar.bg_placeholder')" @update:model-value="commitBg"
                  @click:clear="pickBg(undefined)" />
                <template v-if="bgIsImage">
                  <div class="text-caption text-medium-emphasis mt-3 mb-1">{{ t('toolbar.bg_opacity') }}: {{ localBgOpacity }}%</div>
                  <v-slider v-model="localBgOpacity" min="0" max="100" step="1" hide-details density="compact" thumb-size="14"
                    @update:model-value="saveBgOpacity" />
                  <v-btn-toggle v-model="localBgSize" mandatory density="compact" variant="tonal" class="w-100 mt-2"
                    @update:model-value="saveBgSize">
                    <v-btn value="cover" class="flex-grow-1 text-none text-caption">{{ t('toolbar.bg_size_cover') }}</v-btn>
                    <v-btn value="contain" class="flex-grow-1 text-none text-caption">{{ t('toolbar.bg_size_contain') }}</v-btn>
                    <v-btn value="auto" class="flex-grow-1 text-none text-caption">{{ t('toolbar.bg_size_auto') }}</v-btn>
                  </v-btn-toggle>
                </template>
              </v-card-text>
            </v-card>
          </v-menu>

          <ToolbarActions :edit-mode="listEditMode" :can-edit="isAdmin" @toggle-edit="listEditMode = !listEditMode" />
        </template>
      </v-app-bar>

      <v-main>
        <div class="dashboard-home__bg-glow" />
        <v-container fluid class="dashboard-home px-4 px-sm-6 py-5">
          <section class="dashboard-home__header">
            <div class="dashboard-home__heading">
              <div class="dashboard-home__eyebrow">
                <span class="dashboard-home__eyebrow-dot" />
                {{ t('dashboard.count_other', { n: dashboards.length }) }}
              </div>
              <h1 class="dashboard-home__title">{{ t('dashboard.title') }}</h1>
              <p class="dashboard-home__subtitle">
                {{ listEditMode ? t('dashboard.editing_hint') : currentDefaultHint }}
              </p>
            </div>
            <div class="dashboard-home__header-actions">
              <v-btn
                v-if="isAdmin"
                :prepend-icon="listEditMode ? 'mdi-check' : 'mdi-pencil-outline'"
                :color="listEditMode ? 'primary' : undefined"
                :variant="listEditMode ? 'flat' : 'tonal'"
                rounded="lg"
                class="text-none"
                @click="listEditMode = !listEditMode"
              >
                {{ listEditMode ? t('toolbar.edit_mode_off') : t('toolbar.edit_mode_on') }}
              </v-btn>
            </div>
          </section>

          <div class="dashboard-home__divider" />

          <div v-if="listEditMode" class="dashboard-home__edit-banner">
            <v-icon icon="mdi-drag-vertical" size="18" />
            <span>{{ t('dashboard.editing_hint') }}</span>
          </div>

          <draggable v-if="dashboards.length > 0" v-model="dashboards" item-key="id"
            handle=".drag-handle" :animation="150" :disabled="!isAdmin || !listEditMode"
            class="dashboard-home__grid" @end="saveOrder">
            <template #item="{ element, index }">
              <div class="dashboard-home__grid-item" :style="{ animationDelay: `${index * 55}ms` }">
                <DashboardCard
                  :dashboard="element"
                  :is-admin="isAdmin"
                  :edit-mode="listEditMode"
                  :current-default-label="element.id === resolvedDefault.dashboardId ? currentDefaultLabel : null"
                  @deleted="loadDashboards"
                  @updated="loadDashboards"
                />
              </div>
            </template>
          </draggable>

          <div v-else-if="!listLoaded" class="dashboard-home__grid">
            <v-skeleton-loader v-for="n in 4" :key="n" type="card" rounded="xl" />
          </div>

          <div v-else class="d-flex flex-column align-center justify-center py-16 text-center">
            <v-icon icon="mdi-view-grid-outline" size="64" color="medium-emphasis" class="mb-4" style="opacity:0.3" />
            <h3 class="text-h6 font-weight-medium mb-2">{{ t('dashboard.empty_title') }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-6" style="max-width:340px">
              {{ t('dashboard.empty_description') }}
            </p>
          </div>
        </v-container>
      </v-main>

      <CreateDashboardButton v-if="isAdmin" @created="loadDashboards" />
    </div>
  </div>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import { toast } from 'vue-sonner'
import type { DashboardListItem, DefaultDashboardResolution } from '~/types/dashboard'

const { t } = useI18n()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const dashboards = useState<DashboardListItem[]>('dashboard-list', () => [])
const resolvedDefault = useState<DefaultDashboardResolution>('dashboard-list-default', () => ({ dashboardId: null, source: null }))
const listLoaded = useState('dashboard-list-loaded', () => false)
const listEditMode = ref(false)
const importing = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

// ── Home background ────────────────────────────────────────────────────────

type HomeSettings = { background?: string; bg_opacity?: number; bg_size?: string }
const homeSettings = ref<HomeSettings>({})

const bgMenuOpen = ref(false)
const bgFileInput = ref<HTMLInputElement | null>(null)
const bgUploading = ref(false)
const localBg = ref('')
const localBgOpacity = ref(100)
const localBgSize = ref<'cover' | 'contain' | 'auto'>('cover')

const bgBase = computed(() => {
  const bg = localBg.value
  if (!bg) return { backgroundColor: 'rgb(var(--v-theme-background))' }
  if (bg.startsWith('url(') || bg.startsWith('http') || bg.startsWith('/api/')) {
    return { backgroundColor: 'rgb(var(--v-theme-background))' }
  }
  return { background: bg }
})

const bgImage = computed(() => {
  const bg = localBg.value
  if (!bg) return null
  if (bg.startsWith('url(')) return bg.slice(4, -1)
  if (bg.startsWith('http') || bg.startsWith('/api/')) return bg
  return null
})

const bgIsImage = computed(() => {
  const bg = localBg.value
  return bg.startsWith('url(') || bg.startsWith('http') || bg.startsWith('/api/')
})

const bgImageStyle = computed(() => ({
  backgroundImage: `url(${bgImage.value})`,
  backgroundSize: homeSettings.value.bg_size ?? 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
}))

const bgOverlayStyle = computed(() => {
  const dim = 1 - (homeSettings.value.bg_opacity ?? 100) / 100
  return { background: `rgba(0,0,0,${dim.toFixed(2)})` }
})

watch(homeSettings, (s) => {
  localBg.value = s.background ?? ''
  localBgOpacity.value = s.bg_opacity ?? 100
  localBgSize.value = (s.bg_size as any) ?? 'cover'
}, { immediate: true })

async function saveHomeSettings(patch: { background?: string | null; bg_opacity?: number | null; bg_size?: string | null }) {
  await $fetch('/api/home-settings', { method: 'PUT', body: patch })
  const fresh = await $fetch<HomeSettings>('/api/home-settings')
  homeSettings.value = fresh
}

function pickBg(val: string | undefined) {
  localBg.value = val ?? ''
  homeSettings.value = { ...homeSettings.value, background: val }
  saveHomeSettings({ background: val ?? null })
}

function commitBg(val: string) {
  const trimmed = val.trim()
  homeSettings.value = { ...homeSettings.value, background: trimmed || undefined }
  saveHomeSettings({ background: trimmed || null })
}

function saveBgOpacity(v: number) {
  homeSettings.value = { ...homeSettings.value, bg_opacity: v }
  saveHomeSettings({ bg_opacity: v })
}

function saveBgSize(v: string) {
  homeSettings.value = { ...homeSettings.value, bg_size: v }
  saveHomeSettings({ bg_size: v })
}

async function onBgFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  bgUploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    const res = await $fetch<{ url: string }>('/api/bg/upload', { method: 'POST', body: form })
    pickBg(`url(${res.url})`)
  } catch { /* ignore */ } finally {
    bgUploading.value = false
    if (bgFileInput.value) bgFileInput.value.value = ''
  }
}

const BG_PRESETS = [
  { label: 'Nacht', value: 'linear-gradient(135deg,#0d1117 0%,#1a1f2e 100%)', css: 'linear-gradient(135deg,#0d1117 0%,#1a1f2e 100%)' },
  { label: 'Ozean', value: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', css: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)' },
  { label: 'Lila', value: 'linear-gradient(135deg,#1a0533 0%,#2d1b69 100%)', css: 'linear-gradient(135deg,#1a0533 0%,#2d1b69 100%)' },
  { label: 'Sonnenuntergang', value: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)', css: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' },
  { label: 'Wald', value: 'linear-gradient(135deg,#0a1628 0%,#1e3a2f 100%)', css: 'linear-gradient(135deg,#0a1628 0%,#1e3a2f 100%)' },
  { label: 'Rot', value: 'linear-gradient(135deg,#1a0a0a 0%,#3a1a1a 100%)', css: 'linear-gradient(135deg,#1a0a0a 0%,#3a1a1a 100%)' },
]

// ── Dashboards ─────────────────────────────────────────────────────────────

const currentDefaultLabel = computed(() => {
  switch (resolvedDefault.value.source) {
    case 'user': return t('dashboard.my_default_badge')
    case 'admin': return t('dashboard.user_default_badge')
    case 'global': return t('dashboard.global_default_badge')
    case 'fallback': return t('dashboard.default_badge')
    default: return null
  }
})
const currentDefaultHint = computed(() => {
  const dashboard = dashboards.value.find((item) => item.id === resolvedDefault.value.dashboardId)
  if (!dashboard) return t('dashboard.empty_hint')
  return `${currentDefaultLabel.value ?? t('dashboard.default_badge')}: ${dashboard.name}`
})

async function loadDashboards() {
  const [items, defaultInfo] = await Promise.all([
    $fetch<DashboardListItem[]>('/api/dashboards'),
    $fetch<DefaultDashboardResolution>('/api/dashboards/default'),
  ])
  dashboards.value = items
  resolvedDefault.value = defaultInfo
  listLoaded.value = true
}

onMounted(async () => {
  const [settings] = await Promise.all([
    $fetch<HomeSettings>('/api/home-settings'),
    loadDashboards(),
  ])
  homeSettings.value = settings
})

async function handleImport(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!importInput.value) return
  importInput.value.value = ''
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.name || !Array.isArray(data.widgets)) {
      toast.error(t('dashboard.import_error'))
      return
    }

    const idExists = dashboards.value.some(d => d.id === data.id)
    let importName = data.name
    if (idExists) {
      importName = `${data.name} (Kopie)`
      toast.info(t('dashboard.import_exists', { name: data.name }))
    }

    const created = await $fetch<{ id: string }>('/api/dashboards', {
      method: 'POST',
      body: { name: importName, icon: data.icon, theme_override: data.theme_override },
    })
    const widgets = Array.isArray(data.widgets)
      ? data.widgets.map((w: Record<string, unknown>) => ({ ...w, id: crypto.randomUUID() }))
      : []
    await $fetch(`/api/dashboards/${created.id}`, {
      method: 'PUT',
      body: { ...data, id: created.id, name: importName, widgets },
    })

    toast.success(t('dashboard.imported', { name: importName }))
    await loadDashboards()
  } catch {
    toast.error(t('dashboard.import_error'))
  } finally {
    importing.value = false
  }
}

async function saveOrder() {
  if (!isAdmin.value) return
  await $fetch('/api/dashboards/reorder', {
    method: 'PUT',
    body: { ids: dashboards.value.map((d) => d.id) },
  })
}
</script>

<style scoped>
.dashboard-home {
  max-width: 1780px;
  margin: 0 auto;
  width: 100%;
}

.dashboard-home__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.dashboard-home__heading {
  min-width: 0;
}

.dashboard-home__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.7rem;
  line-height: 1;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 10px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  background: rgba(var(--v-theme-primary), 0.07);
}

.dashboard-home__eyebrow-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.dashboard-home__title {
  font-size: 2.25rem;
  line-height: 1.05;
  font-weight: 850;
  margin: 0;
  letter-spacing: -0.02em;
}

.dashboard-home__subtitle {
  margin: 8px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.9rem;
}

.dashboard-home__header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.dashboard-home__divider {
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  margin-bottom: 20px;
}

.dashboard-home__edit-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 14px;
  border-radius: 12px;
  margin-bottom: 16px;
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  font-size: 0.85rem;
  font-weight: 600;
}

.dashboard-home__bg-glow {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 300px;
  background: radial-gradient(ellipse 70% 100% at 50% 0%, rgba(var(--v-theme-primary), 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.dashboard-home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
  position: relative;
  z-index: 1;
}

.dashboard-home__grid-item {
  min-width: 0;
  animation: card-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 720px) {
  .dashboard-home__header {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-home__header-actions {
    justify-content: flex-start;
  }

  .dashboard-home__grid {
    grid-template-columns: 1fr;
  }

  .dashboard-home__title {
    font-size: 1.8rem;
  }
}
</style>
