<template>
  <div class="d-flex flex-column" style="min-height: 100vh">
    <v-app-bar density="compact" color="transparent" border="b" elevation="0">
      <v-btn icon="mdi-chevron-left" size="small" to="/dashboard" />
      <v-divider vertical class="mx-2 my-2" />
      <v-icon icon="mdi-bell-cog-outline" size="20" class="mr-2" />
      <v-app-bar-title class="text-body-2 font-weight-medium">{{ t('notifications.title') }}</v-app-bar-title>
      <template #append>
        <ToolbarActions />
      </template>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-6" style="max-width: 860px">

        <div class="d-flex align-center mb-6">
          <div>
            <h2 class="text-h6 font-weight-bold">{{ t('notifications.title') }}</h2>
            <p class="text-body-2 text-medium-emphasis mt-1">Regeln für automatische Benachrichtigungen.</p>
          </div>
          <v-spacer />
          <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="startAdd">
            {{ t('notifications.add_rule') }}
          </v-btn>
        </div>

        <!-- Rule list -->
        <div v-if="!editing">
          <div v-if="rules.length === 0" class="text-center py-12 text-medium-emphasis">
            <v-icon icon="mdi-bell-sleep-outline" size="64" style="opacity:0.3" class="mb-3" />
            <p class="text-body-1">{{ t('notifications.empty') }}</p>
          </div>

          <div v-else class="d-flex flex-column ga-3">
            <v-card
              v-for="rule in rules" :key="rule.id"
              :class="{ 'widget-glass': glass }"
              rounded="lg" border
            >
              <v-card-item>
                <template #prepend>
                  <v-avatar color="surface-variant" size="40">
                    <v-icon :icon="rule.action_type === 'camera' ? 'mdi-camera-outline' : 'mdi-bell-outline'" size="20" />
                  </v-avatar>
                </template>
                <v-card-title class="text-body-1">{{ rule.name }}</v-card-title>
                <v-card-subtitle>
                  {{ rule.trigger_entity_id }}
                  <template v-if="rule.trigger_state"> → {{ rule.trigger_state }}</template>
                </v-card-subtitle>
                <template #append>
                  <div class="d-flex align-center ga-2">
                    <v-switch v-model="localEnabled[rule.id]" density="compact" hide-details color="primary"
                      @update:model-value="setEnabledLocally(rule.id, $event as boolean)" />
                    <v-btn icon="mdi-pencil-outline" size="small" variant="text" @click="startEdit(rule)" />
                    <v-btn icon="mdi-trash-can-outline" size="small" variant="text" color="error"
                      @click="handleDelete(rule.id)" />
                  </div>
                </template>
              </v-card-item>
              <v-card-text class="pt-0 text-caption text-medium-emphasis">
                {{ rule.action_type === 'camera' ? t('notifications.type_camera') : t('notifications.type_entity') }}:
                {{ rule.action_entity_id }}
                · {{ t('notifications.cooldown') }}: {{ rule.cooldown_seconds }}s
              </v-card-text>
            </v-card>
          </div>
        </div>

        <!-- Add / Edit form -->
        <v-card v-else :class="{ 'widget-glass': glass }" rounded="xl" border class="pa-6">
          <div class="d-flex align-center mb-5">
            <v-btn icon="mdi-arrow-left" size="small" variant="text" class="mr-2" @click="cancelEdit" />
            <span class="text-subtitle-1 font-weight-semibold">
              {{ editingId ? t('notifications.edit_rule') : t('notifications.add_rule') }}
            </span>
          </div>

          <div class="d-flex flex-column ga-4" style="max-width: 480px">
            <v-text-field v-model="form.name" :label="t('notifications.rule_name')"
              density="compact" variant="outlined" hide-details autofocus />

            <div>
              <div class="text-caption text-medium-emphasis mb-1">{{ t('notifications.trigger_entity') }}</div>
              <EntityPicker v-model="form.trigger_entity_id" />
            </div>

            <template v-if="isEventEntity">
              <v-select v-if="availableEventTypes.length"
                v-model="form.trigger_state"
                :label="t('notifications.trigger_event_type')"
                :items="[{ title: t('notifications.any_event'), value: '' }, ...availableEventTypes.map(e => ({ title: e, value: e }))]"
                density="compact" variant="outlined" hide-details />
              <v-text-field v-else v-model="form.trigger_state"
                :label="t('notifications.trigger_event_type')"
                density="compact" variant="outlined" hide-details
                :placeholder="t('notifications.any_event')" />
              <div class="text-caption text-medium-emphasis">{{ t('notifications.event_hint') }}</div>
            </template>
            <v-text-field v-else v-model="form.trigger_state" :label="t('notifications.trigger_state')"
              density="compact" variant="outlined" hide-details placeholder="on" />

            <v-btn-toggle v-model="form.action_type" mandatory density="compact" variant="outlined" divided class="w-100">
              <v-btn value="camera" prepend-icon="mdi-camera-outline" size="small" class="flex-grow-1">
                {{ t('notifications.type_camera') }}
              </v-btn>
              <v-btn value="entity" prepend-icon="mdi-bell-outline" size="small" class="flex-grow-1">
                {{ t('notifications.type_entity') }}
              </v-btn>
            </v-btn-toggle>

            <div>
              <div class="text-caption text-medium-emphasis mb-1">{{ t('notifications.action_entity') }}</div>
              <EntityPicker v-model="form.action_entity_id"
                :domain="form.action_type === 'camera' ? 'camera' : undefined" />
            </div>

            <v-text-field v-model.number="form.cooldown_seconds" :label="t('notifications.cooldown')"
              density="compact" variant="outlined" hide-details type="number" min="0" suffix="s" />

            <div class="d-flex ga-2">
              <v-btn color="primary" variant="flat" :loading="saving"
                :disabled="!form.name || !form.trigger_entity_id || !form.action_entity_id"
                @click="handleSave">
                {{ editingId ? t('common.save') : t('notifications.add_rule') }}
              </v-btn>
              <v-btn variant="text" @click="cancelEdit">{{ t('common.cancel') }}</v-btn>
            </div>
          </div>
        </v-card>

      </v-container>
    </v-main>
  </div>
</template>

<script setup lang="ts">
import type { NotificationRule } from '~/types/dashboard'

const { t } = useI18n()
const { glass } = useGlassEffect()
const entityStore = useEntityStore()

const { rules, loadRules, createRule, updateRule, deleteRule, isEnabledLocally, setEnabledLocally } = useNotificationRules()

const saving = ref(false)
const editing = ref(false)
const editingId = ref<string | null>(null)
const localEnabled = reactive<Record<string, boolean>>({})

const defaultForm = (): Omit<NotificationRule, 'id' | 'created_at'> => ({
  name: '', trigger_entity_id: '', trigger_state: 'on',
  action_type: 'camera', action_entity_id: '', cooldown_seconds: 30,
})
const form = reactive(defaultForm())

const isEventEntity = computed(() => form.trigger_entity_id.startsWith('event.'))
const availableEventTypes = computed(() => {
  const e = entityStore.entities[form.trigger_entity_id]
  return (e?.attributes?.event_types as string[] | undefined) ?? []
})

onMounted(async () => {
  await loadRules()
  rules.value.forEach((r) => { localEnabled[r.id] = isEnabledLocally(r.id) })
})

function startAdd() {
  Object.assign(form, defaultForm())
  editingId.value = null
  editing.value = true
}

function startEdit(rule: NotificationRule) {
  editingId.value = rule.id
  Object.assign(form, {
    name: rule.name, trigger_entity_id: rule.trigger_entity_id,
    trigger_state: rule.trigger_state, action_type: rule.action_type,
    action_entity_id: rule.action_entity_id, cooldown_seconds: rule.cooldown_seconds,
  })
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editingId.value = null
  Object.assign(form, defaultForm())
}

async function handleSave() {
  saving.value = true
  try {
    if (editingId.value) {
      await updateRule(editingId.value, { ...form })
    } else {
      const r = await createRule({ ...form })
      localEnabled[r.id] = isEnabledLocally(r.id)
    }
    cancelEdit()
  } finally {
    saving.value = false
  }
}

async function handleDelete(id: string) {
  await deleteRule(id)
  delete localEnabled[id]
}
</script>
