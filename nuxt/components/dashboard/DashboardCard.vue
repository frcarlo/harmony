<template>
  <v-card :to="`/dashboard/${dashboard.id}`" hover :class="{ 'widget-glass': glass }"
    class="border-md border-primary rounded-lg dashboard-card">
    <v-card-item>
      <template v-if="isAdmin" #prepend>
        <v-icon class="drag-handle card-drag-handle" icon="mdi-drag-vertical" color="medium-emphasis" size="18" @click.prevent />
      </template>
      <v-card-title class="text-body-1 d-flex align-center ga-2">
        <v-icon :icon="dashboard.icon || 'mdi-view-dashboard-outline'" color="medium-emphasis" size="18" />
        {{ dashboard.name }}
      </v-card-title>
      <v-card-subtitle>{{ t('dashboard.edited', { date: formatDate(dashboard.updated_at) }) }}</v-card-subtitle>
      <template v-if="isAdmin" #append>
        <div class="card-actions d-flex ga-1">
          <v-btn icon="mdi-pencil-outline" size="x-small" variant="plain" :to="`/edit/${dashboard.id}`"
            @click.stop />
          <v-btn icon="mdi-trash-can-outline" size="x-small" variant="plain" color="error"
            @click.stop.prevent="confirmOpen = true" />
        </div>
      </template>
    </v-card-item>
  </v-card>

  <v-dialog v-model="confirmOpen" max-width="340">
    <v-card rounded="lg">
      <v-card-text class="pt-5 pb-2">
        <div class="text-subtitle-1 font-weight-bold mb-1">{{ t('dashboard.delete_title', { name: dashboard.name }) }}</div>
        <div class="text-body-2 text-medium-emphasis">{{ t('dashboard.delete_confirm') }}</div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="confirmOpen = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" :loading="deleting" @click="handleDelete">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import { useNow } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/it'
import 'dayjs/locale/nl'
import type { DashboardListItem } from '~/types/dashboard'

dayjs.extend(relativeTime)

const { t, locale } = useI18n()
const { glass } = useGlassEffect()
const props = defineProps<{ dashboard: DashboardListItem; isAdmin?: boolean }>()
const emit = defineEmits<{ deleted: [] }>()

const now = useNow({ interval: 60_000 })
const confirmOpen = ref(false)
const deleting = ref(false)

function formatDate(iso: string) {
  void now.value
  return dayjs(iso).locale(locale.value).fromNow()
}

async function handleDelete() {
  deleting.value = true
  try {
    await $fetch(`/api/dashboards/${props.dashboard.id}`, { method: 'DELETE' })
    toast.success(t('dashboard.deleted', { name: props.dashboard.name }))
    confirmOpen.value = false
    emit('deleted')
  } catch {
    toast.error(t('dashboard.delete_error'))
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.card-actions,
.card-drag-handle {
  opacity: 0;
  transition: opacity 0.15s ease;
}
.dashboard-card:hover .card-actions,
.dashboard-card:hover .card-drag-handle {
  opacity: 1;
}
.drag-handle {
  cursor: grab;
}
.drag-handle:active {
  cursor: grabbing;
}
</style>
