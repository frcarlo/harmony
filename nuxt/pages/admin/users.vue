<template>
  <div class="admin-page">
    <v-app-bar density="compact" color="transparent" border="b" elevation="0">
      <v-btn icon="mdi-chevron-left" size="small" to="/dashboard" />
      <v-divider vertical class="mx-2 my-2" />
      <v-icon icon="mdi-account-cog-outline" size="20" class="mr-2" />
      <v-app-bar-title class="text-body-2 font-weight-medium">{{ t('users.title') }}</v-app-bar-title>
      <template #append>
        <ToolbarActions />
      </template>
    </v-app-bar>

    <v-main>
      <div class="admin-content">

        <!-- Page header -->
        <div class="admin-header">
          <div class="admin-header__left">
            <div class="admin-eyebrow">ADMINISTRATION</div>
            <h1 class="admin-title">{{ t('users.heading') }}</h1>
            <p class="admin-subtitle">{{ t('users.subtitle') }}</p>
          </div>
          <div class="admin-header__right">
            <div class="admin-stats">
              <div v-for="stat in stats" :key="stat.label" class="admin-stat">
                <span class="admin-stat__value">{{ stat.value }}</span>
                <span class="admin-stat__label">{{ stat.label }}</span>
              </div>
            </div>
            <button class="primary-btn" @click="showForm = true">
              <v-icon icon="mdi-plus" size="16" />
              {{ t('users.new_user') }}
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="admin-tabs">
          <button
            :class="['admin-tab', { 'admin-tab--active': activeTab === 'users' }]"
            @click="activeTab = 'users'"
          >
            <v-icon icon="mdi-account-group-outline" size="15" />
            {{ t('users.tab_users') }}
          </button>
          <button
            :class="['admin-tab', { 'admin-tab--active': activeTab === 'audit' }]"
            @click="activeTab = 'audit'"
          >
            <v-icon icon="mdi-clipboard-text-clock-outline" size="15" />
            {{ t('users.tab_audit') }}
          </button>
        </div>

        <!-- User list -->
        <div v-if="activeTab === 'users'" class="user-list">
          <div
            v-for="u in users" :key="u.id"
            class="user-row"
            :class="{ 'user-row--open': accessUser?.id === u.id }"
          >
            <div class="user-row__main">
              <!-- Avatar -->
              <div class="u-avatar" :class="`u-avatar--${u.role}`">
                {{ u.username.slice(0, 2).toUpperCase() }}
              </div>

              <!-- Identity -->
              <div class="u-identity">
                <div class="u-name">
                  {{ u.username }}
                  <span v-if="u.id === currentUser?.id" class="u-you">YOU</span>
                </div>
                <div class="u-sub">
                  {{ u.email ?? (u.provider ? `OAuth · ${u.provider}` : t('users.local_account')) }}
                </div>
              </div>

              <!-- Role + flags -->
              <div class="u-flags">
                <span class="role-badge" :class="`role-badge--${u.role}`">
                  {{ u.role === 'admin' ? 'Admin' : u.role === 'editor' ? 'Editor' : 'User' }}
                </span>
                <span v-if="u.force_kiosk" class="flag-tag flag-tag--kiosk">Kiosk</span>
                <span v-if="u.force_performance_mode != null" class="flag-tag">Perf</span>
                <span v-if="u.force_device_type" class="flag-tag">{{ u.force_device_type }}</span>
              </div>

              <!-- Actions (appear on hover) -->
              <div class="u-actions">
                <button
                  v-if="u.role !== 'admin'"
                  class="u-btn"
                  :class="{ 'u-btn--active': accessUser?.id === u.id }"
                  :title="t('users.access_title', { name: u.username })"
                  @click="openAccess(u)"
                >
                  <v-icon icon="mdi-view-dashboard-outline" size="15" />
                </button>
                <button
                  v-if="!u.provider"
                  class="u-btn"
                  :title="t('users.change_password')"
                  @click="openPasswordDialog(u)"
                >
                  <v-icon icon="mdi-lock-reset" size="15" />
                </button>
                <button
                  class="u-btn"
                  :title="u.role === 'admin' ? t('users.demote') : t('users.promote')"
                  :disabled="u.id === currentUser?.id"
                  @click="toggleRole(u)"
                >
                  <v-icon :icon="u.role === 'admin' ? 'mdi-account-arrow-down' : 'mdi-account-arrow-up'" size="15" />
                </button>
                <button
                  class="u-btn u-btn--danger"
                  :disabled="u.id === currentUser?.id"
                  :title="t('common.delete')"
                  @click="confirmDelete(u)"
                >
                  <v-icon icon="mdi-trash-can-outline" size="15" />
                </button>
              </div>
            </div>

            <!-- Expanded access panel -->
            <v-expand-transition>
              <div v-if="accessUser?.id === u.id" class="access-panel">
                <div class="access-panel__inner">

                  <!-- Kiosk -->
                  <div class="access-row">
                    <div class="access-row__label">
                      <v-icon icon="mdi-fullscreen" size="14" />
                      {{ t('users.force_kiosk_label') }}
                    </div>
                    <button
                      class="toggle-pill"
                      :class="{ 'toggle-pill--warn': accessUser.force_kiosk }"
                      @click="toggleForceKiosk(accessUser)"
                    >
                      {{ accessUser.force_kiosk ? t('users.force_kiosk_disable') : t('users.force_kiosk_enable') }}
                    </button>
                  </div>

                  <!-- Performance mode -->
                  <div class="access-row">
                    <div class="access-row__label">
                      <v-icon icon="mdi-speedometer" size="14" />
                      {{ t('users.force_performance_mode_label') }}
                    </div>
                    <div class="seg-ctrl">
                      <button
                        v-for="pm in [{ value: null, label: t('users.device_auto') }, { value: true, label: t('common.on') }, { value: false, label: t('common.off') }]"
                        :key="String(pm.value)"
                        class="seg-btn"
                        :class="{ 'seg-btn--on': accessUser.force_performance_mode === pm.value }"
                        @click="setForcePerformanceMode(accessUser, pm.value)"
                      >{{ pm.label }}</button>
                    </div>
                  </div>

                  <!-- Device type -->
                  <div class="access-row">
                    <div class="access-row__label">
                      <v-icon icon="mdi-monitor-cellphone" size="14" />
                      {{ t('users.force_device_type_label') }}
                    </div>
                    <div class="seg-ctrl">
                      <button
                        v-for="dt in [{ value: null, label: 'Auto' }, { value: 'desktop', label: 'Desktop' }, { value: 'tablet', label: 'Tablet' }, { value: 'mobile', label: 'Mobile' }]"
                        :key="String(dt.value)"
                        class="seg-btn"
                        :class="{ 'seg-btn--on': accessUser.force_device_type === dt.value }"
                        @click="setForceDeviceType(accessUser, dt.value)"
                      >{{ dt.label }}</button>
                    </div>
                  </div>

                  <div class="access-divider" />

                  <div v-if="loadingAccess" class="access-loading">
                    <v-progress-circular indeterminate size="20" />
                  </div>
                  <template v-else>
                    <!-- Default dashboard -->
                    <div class="access-field">
                      <div class="access-field__label">
                        <v-icon icon="mdi-star-outline" size="13" />
                        {{ t('users.default_dashboard_label') }}
                        <span class="access-hint">{{ t('users.default_dashboard_hint') }}</span>
                      </div>
                      <v-select
                        v-model="selectedDefaultDashboardId"
                        :items="allDashboards.map(db => ({ title: db.name, value: db.id }))"
                        clearable hide-details density="compact" variant="outlined"
                        menu-icon="mdi-chevron-down" class="access-select"
                      />
                    </div>

                    <!-- Dashboard access -->
                    <div class="access-field">
                      <div class="access-field__label">
                        <v-icon icon="mdi-view-dashboard-outline" size="13" />
                        {{ t('users.access_title', { name: u.username }) }}
                        <span class="access-hint">{{ t('users.access_hint') }}</span>
                      </div>
                      <div class="tag-grid">
                        <button
                          v-for="db in allDashboards" :key="db.id"
                          class="tag-btn"
                          :class="{ 'tag-btn--on': selectedDashboardIds.includes(db.id) }"
                          @click="toggleDashboardAccess(db.id)"
                        >
                          <v-icon :icon="db.icon || 'mdi-view-dashboard-outline'" size="12" />
                          {{ db.name }}
                        </button>
                      </div>
                    </div>

                    <!-- Area restriction (editor only) -->
                    <template v-if="accessUser?.role === 'editor' && entityStore.areas.length > 0">
                      <div class="access-field">
                        <div class="access-field__label">
                          <v-icon icon="mdi-home-outline" size="13" />
                          {{ t('users.allowed_areas_label') }}
                          <span class="access-hint">{{ t('users.allowed_areas_hint') }}</span>
                        </div>
                        <div class="tag-grid">
                          <button
                            v-for="area in entityStore.areas.slice().sort((a, b) => a.name.localeCompare(b.name))"
                            :key="area.area_id"
                            class="tag-btn tag-btn--area"
                            :class="{ 'tag-btn--on': selectedAllowedAreaIds.includes(area.area_id) }"
                            @click="selectedAllowedAreaIds.includes(area.area_id)
                              ? selectedAllowedAreaIds.splice(selectedAllowedAreaIds.indexOf(area.area_id), 1)
                              : selectedAllowedAreaIds.push(area.area_id)"
                          >
                            <v-icon icon="mdi-home-outline" size="12" />
                            {{ area.name }}
                          </button>
                        </div>
                        <p v-if="selectedAllowedAreaIds.length === 0" class="access-all-note">
                          {{ t('users.allowed_areas_all') }}
                        </p>
                      </div>
                    </template>
                  </template>

                  <!-- Widget type restriction -->
                  <div class="access-field">
                    <div class="access-field__label">
                      <v-icon icon="mdi-widgets-outline" size="13" />
                      {{ t('users.allowed_widget_types_label') }}
                      <span class="access-hint">{{ t('users.allowed_widget_types_hint') }}</span>
                    </div>
                    <div class="tag-grid">
                      <button
                        v-for="wt in ALL_WIDGET_TYPES"
                        :key="wt.type"
                        class="tag-btn tag-btn--widget"
                        :class="{ 'tag-btn--on': selectedAllowedWidgetTypes.includes(wt.type) }"
                        @click="selectedAllowedWidgetTypes.includes(wt.type)
                          ? selectedAllowedWidgetTypes.splice(selectedAllowedWidgetTypes.indexOf(wt.type), 1)
                          : selectedAllowedWidgetTypes.push(wt.type)"
                      >
                        <v-icon :icon="wt.icon" size="12" />
                        {{ t(`widget.${wt.type}.label`, wt.type) }}
                      </button>
                    </div>
                    <p v-if="selectedAllowedWidgetTypes.length === 0" class="access-all-note">
                      {{ t('users.allowed_widget_types_all') }}
                    </p>
                  </div>

                  <div class="access-footer">
                    <button class="save-btn" :disabled="savingAccess" @click="saveAccess">
                      <v-progress-circular v-if="savingAccess" indeterminate size="13" class="mr-1" />
                      {{ t('common.save') }}
                    </button>
                    <button class="ghost-btn" @click="accessUser = null">{{ t('common.cancel') }}</button>
                  </div>
                </div>
              </div>
            </v-expand-transition>
          </div>
        </div>

        <!-- Audit log -->
        <div v-else-if="activeTab === 'audit'" class="audit-section">
          <div class="audit-filters">
            <button
              v-for="f in auditFilters" :key="f.value"
              class="filter-btn"
              :class="{ 'filter-btn--active': auditFilter === f.value }"
              @click="auditFilter = f.value; auditPage = 1"
            >
              <v-icon :icon="f.icon" size="13" />
              {{ f.label }}
            </button>
          </div>

          <div v-if="filteredAuditLog.length === 0" class="audit-empty">
            <v-icon icon="mdi-clipboard-text-clock-outline" size="36" />
            <p>{{ t('users.audit_empty') }}</p>
          </div>

          <div v-else class="audit-list">
            <div
              v-for="entry in filteredAuditLog.slice((auditPage - 1) * 20, auditPage * 20)"
              :key="entry.id"
              class="audit-entry"
            >
              <span class="audit-dot" :class="`audit-dot--${auditColorClass(entry.action)}`" />
              <div class="audit-body">
                <strong class="audit-who">{{ entry.username }}</strong>
                <span class="audit-verb">{{ auditLabel(entry.action) }}</span>
                <strong v-if="entry.target" class="audit-target">{{ entry.target }}</strong>
                <span v-if="entry.detail" class="audit-detail">· {{ entry.detail }}</span>
              </div>
              <span class="audit-time">{{ formatDate(entry.created_at) }}</span>
            </div>
          </div>

          <div v-if="Math.ceil(filteredAuditLog.length / 20) > 1" class="pagination">
            <button class="page-btn" :disabled="auditPage <= 1" @click="auditPage--">
              <v-icon icon="mdi-chevron-left" size="15" />
            </button>
            <span class="page-info">{{ auditPage }} / {{ Math.ceil(filteredAuditLog.length / 20) }}</span>
            <button class="page-btn" :disabled="auditPage >= Math.ceil(filteredAuditLog.length / 20)" @click="auditPage++">
              <v-icon icon="mdi-chevron-right" size="15" />
            </button>
          </div>
        </div>

      </div>
    </v-main>

    <!-- Create user dialog -->
    <v-dialog v-model="showForm" max-width="400">
      <v-card rounded="xl" class="dialog-glass">
        <v-card-text class="pa-6">
          <div class="dlg-title">{{ t('users.new_user') }}</div>
          <div class="d-flex flex-column ga-3">
            <v-text-field v-model="form.username" :label="t('login.username')"
              density="compact" variant="outlined" hide-details autofocus />
            <v-text-field v-model="form.password" :label="t('login.password')" type="password"
              density="compact" variant="outlined" hide-details />
            <div class="role-picker">
              <button
                v-for="r in [{ value: 'user', label: 'User' }, { value: 'editor', label: 'Editor' }, { value: 'admin', label: 'Admin' }]"
                :key="r.value"
                class="role-pick"
                :class="[`role-pick--${r.value}`, { 'role-pick--sel': form.role === r.value }]"
                @click="form.role = r.value as any"
              >{{ r.label }}</button>
            </div>
            <v-alert v-if="formError" type="error" density="compact" :text="formError" />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="cancelForm">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg" :loading="saving"
            :disabled="!form.username || form.password.length < 8" @click="handleCreate">
            {{ t('users.create') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Password reset dialog -->
    <v-dialog v-model="passwordDialog" max-width="360">
      <v-card rounded="xl" class="dialog-glass">
        <v-card-text class="pa-6">
          <div class="dlg-title">{{ t('users.change_password_title', { name: passwordTarget?.username }) }}</div>
          <v-text-field
            v-model="passwordForm.new_password"
            :label="t('users.new_password')"
            type="password" density="compact" variant="outlined"
            hide-details="auto" :rules="[v => v.length >= 8 || t('login.error_min_length')]" autofocus
          />
          <v-alert v-if="passwordError" type="error" density="compact" class="mt-3" :text="passwordError" />
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="passwordDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" rounded="lg"
            :loading="passwordSaving" :disabled="passwordForm.new_password.length < 8"
            @click="handlePasswordReset">{{ t('users.change_password') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="340">
      <v-card rounded="xl" class="dialog-glass">
        <v-card-text class="pa-6">
          <div class="dlg-title">{{ t('users.delete_title') }}</div>
          <p class="text-body-2 text-medium-emphasis">{{ t('users.delete_body', { name: deleteTarget?.username }) }}</p>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" rounded="lg" :loading="deleting" @click="handleDelete">
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const { user: currentUser } = useUserSession()
const { glass } = useGlassEffect()
const router = useRouter()

onMounted(() => {
  if (currentUser.value?.role !== 'admin') router.replace('/dashboard')
})

interface UserRow {
  id: string
  username: string
  email: string | null
  role: 'admin' | 'editor' | 'user'
  allowed_areas: string[] | null
  allowed_widget_types: string[] | null
  provider: string | null
  force_kiosk: boolean
  force_performance_mode: boolean | null
  force_device_type: string | null
  default_dashboard_id?: string | null
  user_default_dashboard_id?: string | null
}
interface DashboardRow { id: string; name: string; icon?: string }
interface AuditEntry { id: string; username: string; action: string; target?: string; detail?: string; created_at: string }

const users = ref<UserRow[]>([])
const activeTab = ref<'users' | 'audit'>('users')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ username: '', password: '', role: 'user' as 'admin' | 'editor' | 'user' })

const deleteDialog = ref(false)
const deleteTarget = ref<UserRow | null>(null)
const deleting = ref(false)

const passwordDialog = ref(false)
const passwordTarget = ref<UserRow | null>(null)
const passwordForm = reactive({ new_password: '' })
const passwordError = ref('')
const passwordSaving = ref(false)

const accessUser = ref<UserRow | null>(null)
const allDashboards = ref<DashboardRow[]>([])
const selectedDashboardIds = ref<string[]>([])
const selectedDefaultDashboardId = ref<string | null>(null)
const loadingAccess = ref(false)
const savingAccess = ref(false)
const entityStore = useEntityStore()
const selectedAllowedAreaIds = ref<string[]>([])
const selectedAllowedWidgetTypes = ref<string[]>([])

const ALL_WIDGET_TYPES = [
  { type: 'sensor', icon: 'mdi-pulse' },
  { type: 'gauge', icon: 'mdi-gauge' },
  { type: 'template', icon: 'mdi-code-braces' },
  { type: 'switch', icon: 'mdi-toggle-switch' },
  { type: 'button', icon: 'mdi-gesture-tap-button' },
  { type: 'select', icon: 'mdi-form-dropdown' },
  { type: 'light', icon: 'mdi-lightbulb' },
  { type: 'chart', icon: 'mdi-chart-line' },
  { type: 'camera', icon: 'mdi-camera' },
  { type: 'thermostat', icon: 'mdi-thermometer' },
  { type: 'media_player', icon: 'mdi-music' },
  { type: 'cover', icon: 'mdi-window-shutter-open' },
  { type: 'lock', icon: 'mdi-lock' },
  { type: 'weather', icon: 'mdi-weather-partly-cloudy' },
  { type: 'clock', icon: 'mdi-clock-outline' },
  { type: 'label', icon: 'mdi-format-text' },
  { type: 'room_card', icon: 'mdi-home-outline' },
  { type: 'calendar', icon: 'mdi-calendar-today' },
  { type: 'calendar_v2', icon: 'mdi-calendar-month-outline' },
  { type: 'person', icon: 'mdi-account-group-outline' },
  { type: 'energy', icon: 'mdi-lightning-bolt' },
  { type: 'appliance', icon: 'mdi-washing-machine' },
  { type: 'alarm', icon: 'mdi-shield-home-outline' },
  { type: 'problem_overview', icon: 'mdi-home-alert-outline' },
  { type: 'status_bar', icon: 'mdi-view-dashboard-variant' },
  { type: 'vacuum', icon: 'mdi-robot-vacuum' },
  { type: 'fan', icon: 'mdi-fan' },
  { type: 'scene', icon: 'mdi-play-box-multiple-outline' },
  { type: 'timer', icon: 'mdi-timer-outline' },
  { type: 'camera_status', icon: 'mdi-cctv' },
  { type: 'power_consumers', icon: 'mdi-flash' },
] as const

const auditLog = ref<AuditEntry[]>([])
const auditFilter = ref<'all' | 'dashboard' | 'user'>('all')
const auditPage = ref(1)

const stats = computed(() => [
  { value: users.value.length, label: 'Total' },
  { value: users.value.filter(u => u.role === 'admin').length, label: 'Admin' },
  { value: users.value.filter(u => u.role === 'editor').length, label: 'Editor' },
])

const auditFilters = computed(() => [
  { value: 'all' as const, label: t('common.all'), icon: 'mdi-filter-outline', color: 'primary' },
  { value: 'dashboard' as const, label: t('common.dashboards'), icon: 'mdi-view-dashboard-outline', color: 'secondary' },
  { value: 'user' as const, label: t('users.tab_users'), icon: 'mdi-account-outline', color: 'secondary' },
])

const filteredAuditLog = computed(() => {
  if (auditFilter.value === 'all') return auditLog.value
  return auditLog.value.filter(e => e.action.startsWith(auditFilter.value))
})

onMounted(async () => {
  users.value = await $fetch<UserRow[]>('/api/users')
})

watch(activeTab, async (v) => {
  if (v === 'audit' && auditLog.value.length === 0) {
    auditLog.value = await $fetch<AuditEntry[]>('/api/audit-log')
  }
})

function cancelForm() {
  showForm.value = false
  formError.value = ''
  Object.assign(form, { username: '', password: '', role: 'user' })
}

async function handleCreate() {
  formError.value = ''
  saving.value = true
  try {
    const u = await $fetch<UserRow>('/api/users', { method: 'POST', body: { ...form } })
    users.value.push(u)
    cancelForm()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage ?? t('users.error_default')
  } finally {
    saving.value = false
  }
}

function confirmDelete(u: UserRow) {
  deleteTarget.value = u
  deleteDialog.value = true
}

async function handleDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await $fetch(`/api/users/${deleteTarget.value.id}`, { method: 'DELETE' })
    users.value = users.value.filter((u) => u.id !== deleteTarget.value!.id)
    deleteDialog.value = false
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? t('users.error_default'))
  } finally {
    deleting.value = false
  }
}

function openPasswordDialog(u: UserRow) {
  passwordTarget.value = u
  passwordForm.new_password = ''
  passwordError.value = ''
  passwordDialog.value = true
}

async function handlePasswordReset() {
  if (!passwordTarget.value) return
  passwordError.value = ''
  passwordSaving.value = true
  try {
    await $fetch(`/api/users/${passwordTarget.value.id}/password`, {
      method: 'PUT',
      body: { new_password: passwordForm.new_password },
    })
    passwordDialog.value = false
  } catch (e: any) {
    passwordError.value = e?.data?.statusMessage ?? t('users.error_default')
  } finally {
    passwordSaving.value = false
  }
}

async function toggleRole(u: UserRow) {
  const cycle: Record<string, 'admin' | 'editor' | 'user'> = { user: 'editor', editor: 'admin', admin: 'user' }
  const newRole = cycle[u.role] ?? 'user'
  await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { role: newRole } })
  u.role = newRole
}

async function toggleForceKiosk(u: UserRow) {
  const next = !u.force_kiosk
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { force_kiosk: next } })
    u.force_kiosk = next
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? t('users.error_default'))
  }
}

async function setForcePerformanceMode(u: UserRow, value: boolean | null) {
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { force_performance_mode: value } })
    u.force_performance_mode = value
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? t('users.error_default'))
  }
}

async function setForceDeviceType(u: UserRow, deviceType: string | null) {
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { force_device_type: deviceType } })
    u.force_device_type = deviceType
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? t('users.error_default'))
  }
}

async function openAccess(u: UserRow) {
  if (accessUser.value?.id === u.id) { accessUser.value = null; return }
  accessUser.value = u
  loadingAccess.value = true
  try {
    const [dbs, access] = await Promise.all([
      $fetch<DashboardRow[]>('/api/dashboards'),
      $fetch<{ dashboardIds: string[] | null }>(`/api/users/${u.id}/dashboards`),
    ])
    allDashboards.value = dbs
    selectedDashboardIds.value = access.dashboardIds ?? []
    selectedDefaultDashboardId.value = u.default_dashboard_id ?? null
    selectedAllowedAreaIds.value = u.allowed_areas ?? []
    selectedAllowedWidgetTypes.value = u.allowed_widget_types ?? []
  } finally {
    loadingAccess.value = false
  }
}

function toggleDashboardAccess(id: string) {
  const idx = selectedDashboardIds.value.indexOf(id)
  if (idx === -1) selectedDashboardIds.value.push(id)
  else selectedDashboardIds.value.splice(idx, 1)
}

async function saveAccess() {
  if (!accessUser.value) return
  savingAccess.value = true
  try {
    const dashboardIds = [...selectedDashboardIds.value]
    if (selectedDefaultDashboardId.value && dashboardIds.length > 0 && !dashboardIds.includes(selectedDefaultDashboardId.value)) {
      dashboardIds.push(selectedDefaultDashboardId.value)
    }
    const allowedAreas = accessUser.value.role === 'editor' && selectedAllowedAreaIds.value.length > 0
      ? selectedAllowedAreaIds.value
      : null
    const allowedWidgetTypes = selectedAllowedWidgetTypes.value.length > 0
      ? selectedAllowedWidgetTypes.value
      : null
    await Promise.all([
      $fetch(`/api/users/${accessUser.value.id}/dashboards`, { method: 'PUT', body: { dashboardIds } }),
      $fetch(`/api/users/${accessUser.value.id}`, {
        method: 'PATCH',
        body: {
          default_dashboard_id: selectedDefaultDashboardId.value ?? null,
          allowed_areas: allowedAreas,
          allowed_widget_types: allowedWidgetTypes,
        },
      }),
    ])
    accessUser.value.default_dashboard_id = selectedDefaultDashboardId.value ?? null
    accessUser.value.allowed_areas = allowedAreas
    accessUser.value.allowed_widget_types = allowedWidgetTypes
    accessUser.value = null
  } finally {
    savingAccess.value = false
  }
}

function formatDate(iso: string) { return dayjs(iso).locale(locale.value).fromNow() }

function auditLabel(action: string) {
  const map: Record<string, string> = {
    'dashboard.create': t('users.audit_dashboard_create'),
    'dashboard.save': t('users.audit_dashboard_save'),
    'dashboard.delete': t('users.audit_dashboard_delete'),
    'dashboard.default_change': t('users.audit_dashboard_default_change'),
    'user.create': t('users.audit_user_create'),
    'user.delete': t('users.audit_user_delete'),
    'user.role_change': t('users.audit_user_role_change'),
    'user.force_kiosk_change': t('users.audit_user_force_kiosk_change'),
    'user.force_performance_mode_change': t('users.audit_user_force_performance_mode_change'),
    'user.force_device_type_change': t('users.audit_user_force_device_type_change'),
    'user.default_dashboard_change': t('users.audit_user_default_dashboard_change'),
    'user.self_default_dashboard_change': t('users.audit_user_self_default_dashboard_change'),
    'user.password_change': t('users.audit_user_password_change'),
  }
  return map[action] ?? action
}

function auditColorClass(action: string) {
  if (action.includes('delete')) return 'error'
  if (action.includes('create')) return 'success'
  return 'primary'
}

// kept for compatibility
function auditIcon(action: string) {
  if (action.startsWith('dashboard')) return 'mdi-view-dashboard-outline'
  if (action === 'user.delete') return 'mdi-account-remove-outline'
  if (action === 'user.create') return 'mdi-account-plus-outline'
  return 'mdi-account-edit-outline'
}

function auditColor(action: string) {
  if (action.includes('delete')) return 'error'
  if (action.includes('create')) return 'success'
  return 'primary'
}
</script>

<style scoped>
/* ── Page shell ── */
.admin-page {
  min-height: 100vh;
}

.admin-content {
  max-width: 920px;
  margin: 0 auto;
  padding: 36px 24px 72px;
}

/* ── Header ── */
.admin-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 36px;
  flex-wrap: wrap;
}

.admin-header__right {
  display: flex;
  align-items: center;
  gap: 28px;
  flex-shrink: 0;
}

.admin-eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: rgb(var(--v-theme-primary));
  opacity: 0.7;
  margin-bottom: 8px;
}

.admin-title {
  font-size: 1.85rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.1;
  margin: 0 0 6px;
}

.admin-subtitle {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.45);
  margin: 0;
}

.admin-stats {
  display: flex;
  gap: 24px;
}

.admin-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.admin-stat__value {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.admin-stat__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0.4;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.primary-btn:hover { opacity: 0.88; }

/* ── Tabs ── */
.admin-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
  margin-bottom: 20px;
}

.admin-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  font-size: 0.85rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.42);
  border: none;
  background: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.14s, border-color 0.14s;
}

.admin-tab:hover { color: rgba(var(--v-theme-on-surface), 0.7); }

.admin-tab--active {
  color: rgb(var(--v-theme-primary));
  border-bottom-color: rgb(var(--v-theme-primary));
}

/* ── User list ── */
.user-list {
  border: 1px solid rgba(var(--v-border-color), 0.13);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(var(--v-theme-surface), 0.45);
}

.user-row {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.09);
  transition: background 0.14s;
}

.user-row:last-child { border-bottom: none; }
.user-row:hover { background: rgba(var(--v-theme-on-surface), 0.03); }

.user-row__main {
  display: flex;
  align-items: center;
  padding: 13px 18px;
  gap: 14px;
}

/* Avatar */
.u-avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  border: 1.5px solid rgba(var(--v-border-color), 0.14);
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.u-avatar--admin {
  background: rgba(245, 158, 11, 0.14);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.30);
}

.u-avatar--editor {
  background: rgba(34, 211, 238, 0.11);
  color: #22d3ee;
  border-color: rgba(34, 211, 238, 0.26);
}

/* Identity */
.u-identity {
  flex: 1;
  min-width: 0;
}

.u-name {
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.3;
}

.u-you {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.12);
  padding: 1px 5px;
  border-radius: 3px;
}

.u-sub {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.42);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Flags */
.u-flags {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  padding: 2px 8px;
  border-radius: 5px;
  text-transform: uppercase;
  border: 1px solid;
}

.role-badge--admin {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.10);
  border-color: rgba(245, 158, 11, 0.26);
}

.role-badge--editor {
  color: #22d3ee;
  background: rgba(34, 211, 238, 0.09);
  border-color: rgba(34, 211, 238, 0.23);
}

.role-badge--user {
  color: rgba(var(--v-theme-on-surface), 0.4);
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-color: rgba(var(--v-border-color), 0.15);
}

.flag-tag {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.45);
  border: 1px solid rgba(var(--v-border-color), 0.12);
  text-transform: uppercase;
}

.flag-tag--kiosk {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.20);
}

/* Actions */
.u-actions {
  display: flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.14s;
}

.user-row:hover .u-actions,
.user-row--open .u-actions {
  opacity: 1;
}

.u-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: none;
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, color 0.12s;
}

.u-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.u-btn--active {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.u-btn--danger:hover {
  background: rgba(var(--v-theme-error), 0.12);
  color: rgb(var(--v-theme-error));
}

.u-btn:disabled {
  opacity: 0.22;
  pointer-events: none;
}

/* ── Access panel ── */
.access-panel {
  border-top: 1px solid rgba(var(--v-border-color), 0.10);
}

.access-panel__inner {
  padding: 18px 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: rgba(var(--v-theme-on-surface), 0.018);
}

.access-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.access-row__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.45);
  min-width: 180px;
}

.access-divider {
  height: 1px;
  background: rgba(var(--v-border-color), 0.10);
  margin: 2px 0;
}

.access-loading {
  display: flex;
  justify-content: center;
  padding: 12px;
}

.access-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.access-field__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.access-hint {
  font-size: 11px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  opacity: 0.65;
}

.access-select {
  max-width: 340px;
}

.access-select :deep(.v-field) {
  border-radius: 8px;
  font-size: 0.875rem;
}

.access-all-note {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.38);
  margin: 0;
}

/* Toggle pill */
.toggle-pill {
  padding: 4px 14px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.65);
  cursor: pointer;
  transition: all 0.12s;
}

.toggle-pill:hover { background: rgba(var(--v-theme-on-surface), 0.1); }

.toggle-pill--warn {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.09);
  border-color: rgba(245, 158, 11, 0.26);
}

/* Segmented controls */
.seg-ctrl {
  display: flex;
  gap: 4px;
}

.seg-btn {
  padding: 4px 11px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.48);
  cursor: pointer;
  transition: all 0.12s;
}

.seg-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.seg-btn--on {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

/* Tag grid */
.tag-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.5);
  cursor: pointer;
  transition: all 0.12s;
}

.tag-btn:hover { background: rgba(var(--v-theme-on-surface), 0.06); }

.tag-btn--on {
  background: rgba(var(--v-theme-primary), 0.13);
  border-color: rgba(var(--v-theme-primary), 0.38);
  color: rgb(var(--v-theme-primary));
}

.tag-btn--area.tag-btn--on {
  background: rgba(var(--v-theme-secondary), 0.13);
  border-color: rgba(var(--v-theme-secondary), 0.38);
  color: rgb(var(--v-theme-secondary));
}

.tag-btn--widget.tag-btn--on {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.35);
  color: #818cf8;
}

/* Footer */
.access-footer {
  display: flex;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(var(--v-border-color), 0.09);
}

.save-btn {
  padding: 6px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  transition: opacity 0.12s;
}

.save-btn:hover { opacity: 0.88; }
.save-btn:disabled { opacity: 0.45; pointer-events: none; }

.ghost-btn {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.45);
  border: none;
  cursor: pointer;
  transition: color 0.12s;
}

.ghost-btn:hover { color: rgba(var(--v-theme-on-surface), 0.82); }

/* ── Audit log ── */
.audit-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.audit-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.48);
  cursor: pointer;
  transition: all 0.12s;
}

.filter-btn:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.filter-btn--active {
  background: rgba(var(--v-theme-primary), 0.11);
  border-color: rgba(var(--v-theme-primary), 0.28);
  color: rgb(var(--v-theme-primary));
}

.audit-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  color: rgba(var(--v-theme-on-surface), 0.22);
  gap: 12px;
  font-size: 0.875rem;
}

.audit-list {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(var(--v-theme-surface), 0.45);
}

.audit-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.07);
  transition: background 0.12s;
}

.audit-entry:last-child { border-bottom: none; }
.audit-entry:hover { background: rgba(var(--v-theme-on-surface), 0.02); }

.audit-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(var(--v-theme-on-surface), 0.22);
}

.audit-dot--success { background: #34d399; }
.audit-dot--error { background: rgb(var(--v-theme-error)); }
.audit-dot--primary { background: rgb(var(--v-theme-primary)); }

.audit-body {
  flex: 1;
  font-size: 0.82rem;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-who { font-weight: 600; margin-right: 4px; }
.audit-verb { color: rgba(var(--v-theme-on-surface), 0.65); margin-right: 4px; }
.audit-target { font-weight: 600; margin-right: 4px; }
.audit-detail { color: rgba(var(--v-theme-on-surface), 0.38); font-size: 0.78rem; }

.audit-time {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.32);
  flex-shrink: 0;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.page-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.12s;
}

.page-btn:hover:not(:disabled) { background: rgba(var(--v-theme-on-surface), 0.07); }
.page-btn:disabled { opacity: 0.28; pointer-events: none; }

.page-info {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.45);
  min-width: 44px;
  text-align: center;
}

/* ── Dialogs ── */
.dlg-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: -0.01em;
}

.role-picker {
  display: flex;
  gap: 6px;
}

.role-pick {
  flex: 1;
  padding: 7px 8px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  background: none;
  color: rgba(var(--v-theme-on-surface), 0.48);
  cursor: pointer;
  text-align: center;
  transition: all 0.12s;
  letter-spacing: 0.03em;
}

.role-pick:hover { background: rgba(var(--v-theme-on-surface), 0.06); }

.role-pick--admin.role-pick--sel {
  background: rgba(245, 158, 11, 0.13);
  border-color: rgba(245, 158, 11, 0.38);
  color: #f59e0b;
}

.role-pick--editor.role-pick--sel {
  background: rgba(34, 211, 238, 0.11);
  border-color: rgba(34, 211, 238, 0.32);
  color: #22d3ee;
}

.role-pick--user.role-pick--sel {
  background: rgba(var(--v-theme-primary), 0.11);
  border-color: rgba(var(--v-theme-primary), 0.32);
  color: rgb(var(--v-theme-primary));
}
</style>
