<template>
  <UiSheet :open="modelValue" side="right" width="380" @close="emit('update:modelValue', false); closeDialog()">
    <template #header>
      <div class="d-flex align-center mb-2">
        <v-icon icon="mdi-bell-cog-outline" class="mr-2" />
        <span class="text-subtitle-1 font-weight-bold flex-grow-1">{{ t('notifications.title') }}</span>
        <div class="d-flex align-center ga-1" style="flex-shrink: 0">
          <v-btn v-if="isAdmin && activeTab === 'rules'" icon="mdi-cog-outline" size="small" variant="text"
            to="/admin/notifications" :title="t('notifications.title')" @click="closeDialog" />
          <v-btn v-else-if="activeTab === 'log' && log.length > 0" icon="mdi-delete-sweep-outline" size="small"
            variant="text" color="error" @click="handleClearLog" />
          <v-btn class="d-sm-none" icon="mdi-close" size="small" variant="text"
            @click="emit('update:modelValue', false); closeDialog()" />
        </div>
      </div>
      <v-tabs v-model="activeTab" density="compact" class="mb-1">
        <v-tab value="log" prepend-icon="mdi-history" size="small">{{ t('notifications.log') }}</v-tab>
        <v-tab value="rules" prepend-icon="mdi-bell-outline" size="small">{{ t('notifications.title') }}</v-tab>
      </v-tabs>
    </template>

    <!-- Rules with toggles -->
    <div v-if="activeTab === 'rules'">
      <div v-if="rules.length === 0" class="text-center py-8 text-medium-emphasis text-body-2">
        {{ t('notifications.empty') }}
      </div>
      <div v-else class="d-flex flex-column ga-2">
        <v-card v-for="rule in rules" :key="rule.id" variant="outlined" rounded="lg" class="pa-3">
          <div class="d-flex align-center ga-2" style="min-width:0">
            <v-icon :icon="rule.action_type === 'camera' ? 'mdi-camera-outline' : 'mdi-bell-outline'"
              color="medium-emphasis" size="18" class="flex-shrink-0" />
            <div class="flex-grow-1" style="min-width:0">
              <div class="text-body-2 font-weight-medium text-truncate">{{ rule.name }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">
                {{ rule.trigger_entity_id }}<template v-if="rule.trigger_state"> → {{ rule.trigger_state }}</template>
              </div>
            </div>
            <v-switch v-model="localEnabled[rule.id]" density="compact" hide-details color="primary"
              class="flex-shrink-0" @update:model-value="setEnabledLocally(rule.id, $event as boolean)" />
          </div>
        </v-card>
      </div>
    </div>

    <!-- Log -->
    <div v-else>
      <div v-if="loadingLog" class="text-center py-8">
        <v-progress-circular indeterminate size="24" />
      </div>
      <div v-else-if="log.length === 0" class="text-center py-8 text-medium-emphasis text-body-2">
        {{ t('notifications.log_empty') }}
      </div>
      <div v-else class="d-flex flex-column ga-2">
        <v-card v-for="entry in log" :key="entry.id" variant="outlined" rounded="lg" class="pa-3">
          <div class="d-flex align-start ga-2">
            <v-icon icon="mdi-bell-ring-outline" color="primary" size="16" class="mt-1 flex-shrink-0" />
            <div style="min-width:0; flex:1 1 0">
              <div class="text-body-2 font-weight-medium text-truncate">{{ entry.rule_name }}</div>
              <div class="text-caption text-medium-emphasis text-truncate">
                {{ entry.entity_id }} → <strong>{{ entry.entity_state }}</strong>
              </div>
              <div class="text-caption" style="opacity:0.5">{{ formatLogDate(entry.triggered_at) }}</div>
            </div>
          </div>
        </v-card>
      </div>
    </div>
  </UiSheet>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(relativeTime)

const { t, locale } = useI18n()

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

const { closeDialog } = useNotificationRulesDialog()
const { rules, loadRules, isEnabledLocally, setEnabledLocally } = useNotificationRules()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const activeTab = ref<'rules' | 'log'>('log')
const localEnabled = reactive<Record<string, boolean>>({})
const loadingLog = ref(false)
const log = ref<Array<{ id: string; rule_name: string; entity_id: string; entity_state: string; triggered_at: string }>>([])

watch(() => props.modelValue, async (v) => {
  if (v) {
    await loadRules()
    rules.value.forEach((r) => { localEnabled[r.id] = isEnabledLocally(r.id) })
  }
})

watch(activeTab, async (v) => {
  if (v === 'log') {
    loadingLog.value = true
    log.value = await $fetch('/api/notification-log')
    loadingLog.value = false
  }
})

async function handleClearLog() {
  await $fetch('/api/notification-log', { method: 'DELETE' })
  log.value = []
}

function formatLogDate(iso: string) {
  return dayjs(iso).locale(locale.value).fromNow()
}
</script>
