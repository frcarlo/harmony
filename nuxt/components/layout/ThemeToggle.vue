<template>
  <v-menu :close-on-content-click="false" offset="8">
    <template #activator="{ props: menuProps }">
      <v-btn
        v-bind="menuProps"
        :icon="props.buttonIcon || 'mdi-palette'"
        size="small"
        variant="text"
        :title="props.buttonTitle || t('toolbar.theme')"
      />
    </template>

    <v-card width="232" rounded="lg" :class="{ 'theme-card-glass': glass }">
      <div class="px-3 pt-3 pb-1 text-caption text-medium-emphasis font-weight-medium">
        {{ t('toolbar.theme') }}
      </div>
      <div v-if="props.allowDefault" class="px-2 pt-1">
        <v-btn
          block
          variant="text"
          size="small"
          class="justify-start"
          :color="currentTheme === null ? 'primary' : undefined"
          prepend-icon="mdi-monitor-dashboard"
          @click="setTheme(null)"
        >
          {{ t('toolbar.theme_dashboard_default') }}
        </v-btn>
      </div>
      <div class="theme-grid pa-2">
        <v-tooltip v-for="th in themes" :key="th.id" :text="th.name" location="top" :open-delay="300">
          <template #activator="{ props: tp }">
            <button
              v-bind="tp"
              class="theme-swatch"
              :class="{ 'theme-swatch--active': currentTheme === th.id }"
              :style="{ '--swatch-bg': th.bg, '--swatch-primary': th.primary }"
              :aria-label="th.name"
              @click="setTheme(th.id)"
            >
              <span class="swatch-bg" />
              <span class="swatch-primary" />
              <span v-if="currentTheme === th.id" class="swatch-check">
                <v-icon icon="mdi-check" size="14" color="white" />
              </span>
            </button>
          </template>
        </v-tooltip>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'

const { t } = useI18n()
const { glass } = useGlassEffect()
const props = defineProps<{
  modelValue?: string | null
  allowDefault?: boolean
  buttonIcon?: string
  buttonTitle?: string
}>()
const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const theme = useTheme()
const { themes } = useDashboardThemes()
const storage = useUserPreferenceStorage()
const isControlled = computed(() => props.allowDefault || props.modelValue !== undefined)
const currentTheme = computed(() => isControlled.value ? (props.modelValue ?? null) : theme.name.value)

watch(() => storage.currentUserId.value, () => {
  if (isControlled.value) return
  theme.change(storage.read('ha-theme', 'dark') ?? 'dark')
}, { immediate: true })

function setTheme(id: string | null) {
  if (isControlled.value) {
    emit('update:modelValue', id)
    return
  }
  if (!id) return
  theme.change(id)
  storage.write('ha-theme', id)
}
</script>

<style>
.theme-card-glass,
.theme-card-glass .v-list,
.theme-card-glass .v-list-item {
  background: transparent !important;
}
.theme-card-glass {
  backdrop-filter: blur(20px) saturate(160%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(160%) !important;
  background: rgb(var(--v-theme-surface) / 0.4) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
  border: 1px solid rgba(var(--v-border-color), 0.2) !important;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.theme-swatch {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.15);
  cursor: pointer;
  outline: none;
  transition: transform 0.15s, border-color 0.15s;
  display: flex;
}

.theme-swatch:hover {
  transform: scale(1.12);
  border-color: rgba(255, 255, 255, 0.4);
}

.theme-swatch--active {
  border-color: #ffffff;
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary)), 0 0 8px rgb(var(--v-theme-primary) / 0.6);
  transform: scale(1.1);
}

.swatch-check {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}

.swatch-bg {
  flex: 1;
  background: var(--swatch-bg);
}

.swatch-primary {
  width: 40%;
  background: var(--swatch-primary);
}
</style>
