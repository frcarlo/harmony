<template>
  <div class="d-flex flex-column" style="min-height: 100vh">
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
      <v-container fluid class="pa-6" style="max-width: 900px">

        <!-- Header row -->
        <div class="d-flex align-center mb-6">
          <div>
            <h2 class="text-h6 font-weight-bold">{{ t('users.heading') }}</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">{{ t('users.subtitle') }}</p>
          </div>
          <v-spacer />
          <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="showForm = true">
            {{ t('users.new_user') }}
          </v-btn>
        </div>

        <!-- Tabs -->
        <v-tabs v-model="activeTab" class="mb-4">
          <v-tab value="users" prepend-icon="mdi-account-group-outline">{{ t('users.tab_users') }}</v-tab>
          <v-tab value="audit" prepend-icon="mdi-clipboard-text-clock-outline">{{ t('users.tab_audit') }}</v-tab>
        </v-tabs>

        <!-- User list -->
        <div v-if="activeTab === 'users'">
          <v-card
            v-for="u in users" :key="u.id"
            :class="{ 'widget-glass': glass }"
            rounded="lg" class="mb-3" border
          >
            <v-card-item>
              <template #prepend>
                <v-avatar :color="u.role === 'admin' ? 'primary' : 'surface-variant'" size="40">
                  <v-icon :icon="u.provider ? 'mdi-shield-key-outline' : 'mdi-account-outline'" size="20" />
                </v-avatar>
              </template>
              <v-card-title class="text-body-1">{{ u.username }}</v-card-title>
              <v-card-subtitle>{{ u.email ?? (u.provider ? `OAuth: ${u.provider}` : t('users.local_account')) }}</v-card-subtitle>
              <template #append>
                <div class="d-flex align-center ga-2">
                  <v-chip :color="u.role === 'admin' ? 'primary' : undefined" size="small" variant="tonal">
                    {{ u.role === 'admin' ? 'Admin' : 'User' }}
                  </v-chip>
                  <v-btn
                    v-if="u.role !== 'admin'"
                    icon="mdi-view-dashboard-outline"
                    size="small" variant="text"
                    :title="t('users.access_title', { name: u.username })"
                    @click="openAccess(u)"
                  />
                  <v-btn
                    :icon="u.role === 'admin' ? 'mdi-account-arrow-down' : 'mdi-account-arrow-up'"
                    size="small" variant="text"
                    :title="u.role === 'admin' ? t('users.demote') : t('users.promote')"
                    :disabled="u.id === currentUser?.id"
                    @click="toggleRole(u)"
                  />
                  <v-btn
                    icon="mdi-trash-can-outline"
                    size="small" variant="text" color="error"
                    :disabled="u.id === currentUser?.id"
                    @click="confirmDelete(u)"
                  />
                </div>
              </template>
            </v-card-item>

            <!-- Dashboard access inline -->
            <v-expand-transition>
              <div v-if="accessUser?.id === u.id" class="px-4 pb-4">
                <v-divider class="mb-4" />
                <p class="text-body-2 font-weight-medium mb-1">{{ t('users.access_title', { name: u.username }) }}</p>
                <p class="text-caption text-medium-emphasis mb-3">{{ t('users.access_hint') }}</p>
                <div v-if="loadingAccess" class="py-4 text-center">
                  <v-progress-circular indeterminate size="24" />
                </div>
                <div v-else class="d-flex flex-wrap ga-2 mb-3">
                  <v-chip
                    v-for="db in allDashboards" :key="db.id"
                    :color="selectedDashboardIds.includes(db.id) ? 'primary' : undefined"
                    :variant="selectedDashboardIds.includes(db.id) ? 'flat' : 'outlined'"
                    :prepend-icon="db.icon || 'mdi-view-dashboard-outline'"
                    style="cursor: pointer"
                    @click="toggleDashboardAccess(db.id)"
                  >
                    {{ db.name }}
                  </v-chip>
                </div>
                <div class="d-flex ga-2">
                  <v-btn color="primary" variant="flat" size="small" :loading="savingAccess" @click="saveAccess">
                    {{ t('common.save') }}
                  </v-btn>
                  <v-btn variant="text" size="small" @click="accessUser = null">{{ t('common.cancel') }}</v-btn>
                </div>
              </div>
            </v-expand-transition>
          </v-card>
        </div>

        <!-- Audit Log -->
        <div v-else-if="activeTab === 'audit'">
          <div v-if="auditLog.length === 0" class="text-center py-12 text-medium-emphasis">
            <v-icon icon="mdi-clipboard-text-clock-outline" size="48" style="opacity:0.3" class="mb-3" />
            <p class="text-body-2">{{ t('users.audit_empty') }}</p>
          </div>
          <v-timeline v-else density="compact" side="end">
            <v-timeline-item
              v-for="entry in auditLog" :key="entry.id"
              :dot-color="auditColor(entry.action)"
              size="small"
            >
              <template #icon>
                <v-icon :icon="auditIcon(entry.action)" size="14" />
              </template>
              <div class="d-flex align-baseline ga-2 flex-wrap">
                <span class="text-body-2">
                  <strong>{{ entry.username }}</strong>
                  {{ auditLabel(entry.action) }}
                  <strong v-if="entry.target"> {{ entry.target }}</strong>
                  <span v-if="entry.detail" class="text-medium-emphasis"> {{ entry.detail }}</span>
                </span>
                <span class="text-caption text-medium-emphasis">{{ formatDate(entry.created_at) }}</span>
              </div>
            </v-timeline-item>
          </v-timeline>
        </div>

      </v-container>
    </v-main>

    <!-- Add user dialog -->
    <v-dialog v-model="showForm" max-width="420">
      <v-card rounded="xl" :class="{ 'widget-glass': glass }">
        <v-card-text class="pa-6">
          <div class="text-subtitle-1 font-weight-bold mb-4">{{ t('users.new_user') }}</div>
          <div class="d-flex flex-column ga-3">
            <v-text-field v-model="form.username" :label="t('login.username')" density="compact"
              variant="outlined" hide-details autofocus />
            <v-text-field v-model="form.password" :label="t('login.password')" type="password"
              density="compact" variant="outlined" hide-details />
            <v-btn-toggle v-model="form.role" mandatory density="compact" variant="outlined" divided class="w-100">
              <v-btn value="user" size="small" class="flex-grow-1">User</v-btn>
              <v-btn value="admin" size="small" class="flex-grow-1">Admin</v-btn>
            </v-btn-toggle>
            <v-alert v-if="formError" type="error" density="compact" :text="formError" />
          </div>
        </v-card-text>
        <v-card-actions class="px-6 pb-5">
          <v-spacer />
          <v-btn variant="text" @click="cancelForm">{{ t('common.cancel') }}</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving"
            :disabled="!form.username || form.password.length < 8" @click="handleCreate">
            {{ t('users.create') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete confirm dialog -->
    <v-dialog v-model="deleteDialog" max-width="360">
      <v-card rounded="xl" :class="{ 'widget-glass': glass }">
        <v-card-text class="pt-5 pb-2">
          <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('users.delete_title') }}</div>
          <div class="text-body-2 text-medium-emphasis">
            {{ t('users.delete_body', { name: deleteTarget?.username }) }}
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" :loading="deleting" @click="handleDelete">{{ t('common.delete') }}</v-btn>
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

// Redirect non-admins
onMounted(() => {
  if (currentUser.value?.role !== 'admin') router.replace('/dashboard')
})

interface UserRow { id: string; username: string; email: string | null; role: 'admin' | 'user'; provider: string | null }
interface DashboardRow { id: string; name: string; icon?: string }
interface AuditEntry { id: string; username: string; action: string; target?: string; detail?: string; created_at: string }

const users = ref<UserRow[]>([])
const activeTab = ref<'users' | 'audit'>('users')
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ username: '', password: '', role: 'user' as 'admin' | 'user' })

const deleteDialog = ref(false)
const deleteTarget = ref<UserRow | null>(null)
const deleting = ref(false)

// Dashboard access
const accessUser = ref<UserRow | null>(null)
const allDashboards = ref<DashboardRow[]>([])
const selectedDashboardIds = ref<string[]>([])
const loadingAccess = ref(false)
const savingAccess = ref(false)

// Audit log
const auditLog = ref<AuditEntry[]>([])

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

async function toggleRole(u: UserRow) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { role: newRole } })
  u.role = newRole
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
    await $fetch(`/api/users/${accessUser.value.id}/dashboards`, {
      method: 'PUT',
      body: { dashboardIds: selectedDashboardIds.value },
    })
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
    'user.create': t('users.audit_user_create'),
    'user.delete': t('users.audit_user_delete'),
    'user.role_change': t('users.audit_user_role_change'),
  }
  return map[action] ?? action
}

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
