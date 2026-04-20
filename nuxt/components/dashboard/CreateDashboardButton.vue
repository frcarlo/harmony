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

const PRESET_ICONS = [
  'mdi-view-dashboard-outline', 'mdi-home-outline', 'mdi-sofa-outline',
  'mdi-bed-outline', 'mdi-silverware-fork-knife', 'mdi-garage-variant',
  'mdi-sprout-outline', 'mdi-office-building-outline', 'mdi-car-outline',
  'mdi-star-outline', 'mdi-heart-outline', 'mdi-lightning-bolt-outline',
]

const dialog = ref(false)
const name = ref('')
const icon = ref('')
const loading = ref(false)

watch(dialog, (v) => { if (!v) { name.value = ''; icon.value = '' } })

async function handleCreate() {
  if (!name.value.trim()) return
  loading.value = true
  try {
    const dashboard = await $fetch<Dashboard>('/api/dashboards', {
      method: 'POST',
      body: { name: name.value.trim(), icon: icon.value || undefined },
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
