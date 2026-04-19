<template>
  <UiSheet :open="modelValue" side="right" width="400" @close="emit('update:modelValue', false)">
    <template #header>
      <div class="d-flex align-center mb-2">
        <v-btn v-if="showForm || accessUser" icon="mdi-arrow-left" size="small" variant="text" class="mr-1"
          @click="showForm ? cancelForm() : (accessUser = null)" />
        <v-icon v-else icon="mdi-account-cog-outline" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold flex-grow-1">
          {{ accessUser ? accessUser.username : 'Benutzerverwaltung' }}
        </span>
        <v-btn v-if="!showForm && !accessUser && activeTab === 'users'" icon="mdi-plus" size="small"
          variant="tonal" color="primary" @click="showForm = true" />
      </div>
      <v-tabs v-if="!showForm && !accessUser" v-model="activeTab" density="compact" class="mb-1">
        <v-tab value="users" prepend-icon="mdi-account-group-outline" size="small">Benutzer</v-tab>
        <v-tab value="audit" prepend-icon="mdi-clipboard-text-clock-outline" size="small">Audit-Log</v-tab>
      </v-tabs>
    </template>

    <!-- User list -->
    <div v-if="!showForm && !accessUser && activeTab === 'users'">
      <v-card v-for="u in users" :key="u.id" variant="outlined" rounded="lg" class="pa-3 mb-2">
        <div class="d-flex align-center ga-2">
          <v-icon :icon="u.provider ? 'mdi-shield-key-outline' : 'mdi-account-outline'" size="20" class="flex-shrink-0" />
          <div class="flex-grow-1" style="min-width: 0">
            <div class="text-body-2 font-weight-medium text-truncate">{{ u.username }}</div>
            <div class="text-caption text-medium-emphasis">{{ u.email ?? u.provider ?? 'lokal' }}</div>
          </div>
          <v-chip :color="u.role === 'admin' ? 'primary' : undefined" size="x-small" variant="tonal">
            {{ u.role }}
          </v-chip>
          <v-menu>
            <template #activator="{ props: mp }">
              <v-btn icon="mdi-dots-vertical" size="x-small" variant="text" v-bind="mp" />
            </template>
            <v-list density="compact" nav>
              <v-list-item :title="u.role === 'admin' ? 'Zu User herabstufen' : 'Zum Admin befördern'"
                :prepend-icon="u.role === 'admin' ? 'mdi-account-arrow-down' : 'mdi-account-arrow-up'"
                rounded="lg" @click="toggleRole(u)" />
              <v-list-item v-if="u.role !== 'admin'" title="Dashboard-Zugriff" prepend-icon="mdi-view-dashboard-outline"
                rounded="lg" @click="openAccess(u)" />
              <v-list-item title="Löschen" prepend-icon="mdi-trash-can-outline" rounded="lg"
                color="error" :disabled="u.id === currentUser?.id" @click="handleDelete(u.id)" />
            </v-list>
          </v-menu>
        </div>
      </v-card>
    </div>

    <!-- Audit Log -->
    <div v-if="!showForm && !accessUser && activeTab === 'audit'">
      <div v-if="auditLog.length === 0" class="text-center py-8 text-medium-emphasis text-body-2">
        Noch keine Aktionen protokolliert.
      </div>
      <div v-else class="d-flex flex-column ga-2">
        <v-card v-for="entry in auditLog" :key="entry.id" variant="outlined" rounded="lg" class="pa-3">
          <div class="d-flex align-start ga-2">
            <v-icon :icon="auditIcon(entry.action)" :color="auditColor(entry.action)" size="16" class="mt-1 flex-shrink-0" />
            <div style="min-width:0; flex:1 1 0">
              <div class="text-body-2 font-weight-medium">
                <span class="text-medium-emphasis">{{ entry.username }}</span>
                {{ auditLabel(entry.action) }}
                <span v-if="entry.target" class="font-weight-bold"> {{ entry.target }}</span>
                <span v-if="entry.detail" class="text-medium-emphasis"> {{ entry.detail }}</span>
              </div>
              <div class="text-caption" style="opacity:0.5">{{ formatAuditDate(entry.created_at) }}</div>
            </div>
          </div>
        </v-card>
      </div>
    </div>

    <!-- Dashboard access panel -->
    <div v-else-if="accessUser">
      <p class="text-caption text-medium-emphasis mb-3">
        Welche Dashboards darf <strong>{{ accessUser.username }}</strong> sehen?
        Wenn nichts ausgewählt, sieht der User alle.
      </p>
      <div v-if="loadingAccess" class="text-center py-6">
        <v-progress-circular indeterminate size="24" />
      </div>
      <div v-else class="d-flex flex-column ga-2">
        <v-card
          v-for="db in allDashboards" :key="db.id"
          variant="outlined" rounded="lg" class="pa-3"
          :color="selectedDashboardIds.includes(db.id) ? 'primary' : undefined"
          style="cursor: pointer"
          @click="toggleDashboardAccess(db.id)"
        >
          <div class="d-flex align-center ga-2">
            <v-icon :icon="db.icon || 'mdi-view-dashboard-outline'" size="18" />
            <span class="text-body-2 flex-grow-1">{{ db.name }}</span>
            <v-icon v-if="selectedDashboardIds.includes(db.id)" icon="mdi-check-circle" color="primary" size="18" />
          </div>
        </v-card>
        <p v-if="selectedDashboardIds.length === 0" class="text-caption text-medium-emphasis text-center mt-2">
          Keine Einschränkung — alle Dashboards sichtbar
        </p>
      </div>
      <v-btn color="primary" variant="flat" class="mt-4 w-100" :loading="savingAccess" @click="saveAccess">
        Speichern
      </v-btn>
    </div>

    <!-- Add user form -->
    <div v-else>
      <div class="d-flex flex-column ga-3">
        <v-text-field v-model="form.username" label="Benutzername" density="compact" variant="outlined"
          hide-details autofocus />
        <v-text-field v-model="form.password" label="Passwort" type="password" density="compact"
          variant="outlined" hide-details />
        <v-btn-toggle v-model="form.role" mandatory density="compact" variant="outlined" divided class="w-100">
          <v-btn value="user" size="small" class="flex-grow-1">User</v-btn>
          <v-btn value="admin" size="small" class="flex-grow-1">Admin</v-btn>
        </v-btn-toggle>
        <v-alert v-if="formError" type="error" density="compact" :text="formError" />
        <v-btn color="primary" variant="flat" :loading="saving"
          :disabled="!form.username || form.password.length < 8" @click="handleCreate">
          Anlegen
        </v-btn>
      </div>
    </div>
  </UiSheet>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { user: currentUser } = useUserSession()

interface UserRow { id: string; username: string; email: string | null; role: 'admin' | 'user'; provider: string | null }
interface DashboardRow { id: string; name: string; icon?: string }

const users = ref<UserRow[]>([])
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ username: '', password: '', role: 'user' as 'admin' | 'user' })
const activeTab = ref<'users' | 'audit'>('users')

// Audit log
interface AuditEntry { id: string; user_id: string; username: string; action: string; target?: string; detail?: string; created_at: string }
const auditLog = ref<AuditEntry[]>([])

async function loadAuditLog() {
  auditLog.value = await $fetch<AuditEntry[]>('/api/audit-log')
}

function formatAuditDate(iso: string) { return dayjs(iso).fromNow() }

function auditLabel(action: string) {
  const map: Record<string, string> = {
    'dashboard.create': 'hat Dashboard erstellt:',
    'dashboard.save': 'hat Dashboard gespeichert:',
    'dashboard.delete': 'hat Dashboard gelöscht:',
    'user.create': 'hat Benutzer angelegt:',
    'user.delete': 'hat Benutzer gelöscht:',
    'user.role_change': 'hat Rolle geändert:',
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

// Dashboard access state
const accessUser = ref<UserRow | null>(null)
const allDashboards = ref<DashboardRow[]>([])
const selectedDashboardIds = ref<string[]>([])
const loadingAccess = ref(false)
const savingAccess = ref(false)

watch(() => props.modelValue, async (v) => {
  if (v) {
    users.value = await $fetch<UserRow[]>('/api/users')
    showForm.value = false
    accessUser.value = null
    activeTab.value = 'users'
  }
})

watch(activeTab, (v) => { if (v === 'audit') loadAuditLog() })

function cancelForm() {
  showForm.value = false
  formError.value = ''
  Object.assign(form, { username: '', password: '', role: 'user' })
}

async function openAccess(u: UserRow) {
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

async function handleCreate() {
  formError.value = ''
  saving.value = true
  try {
    const u = await $fetch<UserRow>('/api/users', { method: 'POST', body: { ...form } })
    users.value.push(u)
    cancelForm()
  } catch (e: any) {
    formError.value = e?.data?.statusMessage ?? 'Fehler'
  } finally {
    saving.value = false
  }
}

async function toggleRole(u: UserRow) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  try {
    await $fetch(`/api/users/${u.id}`, { method: 'PATCH', body: { role: newRole } })
    u.role = newRole
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Fehler')
  }
}

async function handleDelete(id: string) {
  try {
    await $fetch(`/api/users/${id}`, { method: 'DELETE' })
    users.value = users.value.filter((u) => u.id !== id)
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Fehler')
  }
}
</script>
