<template>
  <div class="h-100 d-flex flex-column pa-3">
    <div class="d-flex align-center ga-2 mb-3">
      <v-icon icon="mdi-account-group-outline" size="14" color="medium-emphasis" />
      <span class="text-caption text-medium-emphasis">{{ title }}</span>
    </div>

    <div class="flex-grow-1 d-flex flex-column ga-2 overflow-auto">
      <div
        v-for="p in persons"
        :key="p.entity_id"
        class="d-flex align-center ga-3 pa-2 rounded-lg"
        :class="p.isHome ? 'person-home' : 'person-away'"
      >
        <v-avatar size="36" :color="p.isHome ? 'success' : 'surface-variant'">
          <v-img v-if="p.picture" :src="p.picture" />
          <v-icon v-else icon="mdi-account" size="20" />
        </v-avatar>
        <div class="flex-grow-1 min-width-0">
          <div class="text-body-2 font-weight-medium text-truncate">{{ p.name }}</div>
          <div class="text-caption" :class="p.isHome ? 'text-success' : 'text-medium-emphasis'">
            {{ p.isHome ? t('person.home') : (p.location || t('person.away')) }}
          </div>
        </div>
        <v-icon
          :icon="p.isHome ? 'mdi-home-circle' : 'mdi-map-marker-outline'"
          :color="p.isHome ? 'success' : 'medium-emphasis'"
          size="18"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PersonWidgetConfig } from '~/types/dashboard'

defineOptions({ inheritAttrs: false })

const props = defineProps<{ config: PersonWidgetConfig }>()
const { t } = useI18n()
const entityStore = useEntityStore()

const title = computed(() => props.config.name || t('widget.person.label'))

const persons = computed(() => {
  const entries = props.config.persons ?? []
  return entries.map((entry) => {
    const entity = entityStore.entities[entry.entity_id]
    const attrs = entity?.attributes as Record<string, unknown> | undefined
    const state = entity?.state ?? 'unknown'
    const isHome = state === 'home'
    return {
      entity_id: entry.entity_id,
      name: entry.name ?? (attrs?.friendly_name as string) ?? entry.entity_id,
      isHome,
      location: isHome ? null : (state !== 'not_home' ? state : null),
      picture: attrs?.entity_picture as string | undefined,
    }
  })
})
</script>

<style scoped>
.person-home {
  background: rgb(var(--v-theme-success) / 0.08);
}
.person-away {
  background: rgb(var(--v-theme-surface-variant) / 0.4);
}
</style>
