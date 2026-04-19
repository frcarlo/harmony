<template>
  <div v-if="dashboard" class="d-flex flex-column" :style="bgStyle" style="min-height:100vh">
    <AppToolbar
      :dashboard-name="dashboard.name"
      :dashboard-id="dashboard.id"
      :edit-mode="false"
      :hide-edit="!isAdmin"
      @toggle-edit="router.push(`/edit/${dashboard.id}`)"
    />
    <v-main>
      <div class="pa-4">
        <DashboardGrid :edit-mode="false" />
      </div>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import type { Dashboard } from '~/types/dashboard'

const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')
const dashboardStore = useDashboardStore()
const dashboard = computed(() => dashboardStore.dashboard)

const bgStyle = computed(() => {
  const bg = dashboard.value?.background
  if (!bg) return {}
  if (bg.startsWith('http') || bg.startsWith('/')) return { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  return { background: bg }
})

onMounted(async () => {
  const data = await $fetch<Dashboard>(`/api/dashboards/${route.params.id}`)
  if (!data) throw createError({ statusCode: 404 })
  dashboardStore.setDashboard(data)
})
</script>
