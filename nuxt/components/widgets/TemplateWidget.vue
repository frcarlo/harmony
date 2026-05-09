<template>
  <div class="template-widget h-100 pa-3">
    <div v-if="displayName" class="template-widget__title text-truncate font-weight-medium">
      {{ displayName }}
    </div>

    <div v-if="loading && !rendered" class="template-widget__state text-medium-emphasis">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="error" class="template-widget__state text-error">
      {{ error }}
    </div>
    <div v-else class="template-widget__content" v-html="rendered" />
  </div>
</template>

<script setup lang="ts">
import type { TemplateWidgetConfig } from '~/types/dashboard'

const props = defineProps<{ config: TemplateWidgetConfig }>()
const { t } = useI18n()
const rendered = ref('')
const renderedName = ref('')
const loading = ref(false)
const error = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const nameTemplate = computed(() => props.config.name?.trim() ?? '')
const displayName = computed(() => renderedName.value || nameTemplate.value)
const refreshInterval = computed(() => Math.max(5, Number(props.config.refresh_interval) || 30))

async function renderTemplate(template: string) {
  if (!template.trim()) return ''
  const data = await $fetch<{ rendered: string }>('/api/ha/template', {
    method: 'POST',
    body: { template },
  })
  return data.rendered ?? ''
}

async function loadTemplate() {
  const contentTemplate = props.config.template?.trim() ?? ''
  const titleTemplate = nameTemplate.value
  if (!contentTemplate && !titleTemplate) {
    rendered.value = ''
    renderedName.value = ''
    error.value = ''
    return
  }

  loading.value = true
  try {
    const [nextContent, nextName] = await Promise.all([
      renderTemplate(contentTemplate),
      renderTemplate(titleTemplate),
    ])
    rendered.value = nextContent
    renderedName.value = nextName.trim()
    error.value = ''
  } catch {
    error.value = t('template.render_error')
  } finally {
    loading.value = false
  }
}

function resetTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  refreshTimer = setInterval(loadTemplate, refreshInterval.value * 1000)
}

onMounted(() => {
  loadTemplate()
  resetTimer()
})

watch(() => [props.config.template, props.config.name, props.config.refresh_interval] as const, () => {
  loadTemplate()
  resetTimer()
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<style scoped>
.template-widget {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  overflow: auto;
}

.template-widget__title {
  flex: 0 0 auto;
  font-size: 0.95rem;
}

.template-widget__state {
  margin: auto;
  font-size: 0.9rem;
  text-align: center;
}

.template-widget__content {
  min-width: 0;
  font-size: 0.9rem;
  line-height: 1.35;
}
</style>
