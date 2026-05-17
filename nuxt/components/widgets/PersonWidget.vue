<template>
  <div class="person-card h-100 d-flex flex-column">
    <!-- Header -->
    <div class="person-header">
      <v-icon icon="mdi-account-group-outline" size="12" style="opacity:0.45; flex-shrink:0" />
      <span class="person-title">{{ title }}</span>
    </div>

    <!-- Person list -->
    <div class="person-list flex-grow-1 d-flex flex-column">
      <div
        v-for="p in persons"
        :key="p.entity_id"
        class="person-row"
        :class="p.isHome ? 'person-row--home' : 'person-row--away'"
      >
        <!-- Avatar -->
        <v-avatar size="34" class="person-avatar flex-shrink-0" :class="p.isHome ? 'person-avatar--home' : ''">
          <v-img v-if="p.picture" :src="p.picture" />
          <v-icon v-else icon="mdi-account" size="18" />
        </v-avatar>

        <!-- Name + location -->
        <div class="flex-grow-1 overflow-hidden">
          <div class="person-name text-truncate">{{ p.name }}</div>
          <div class="person-location" :class="p.isHome ? 'person-location--home' : 'person-location--away'">
            {{ p.isHome ? t('person.home') : (p.location || t('person.away')) }}
          </div>
        </div>

        <!-- Home/away indicator -->
        <a
          v-if="!p.isHome && p.mapsUrl"
          :href="p.mapsUrl"
          target="_blank"
          rel="noopener"
          style="line-height:0; color:inherit; flex-shrink:0"
          @click.stop
        >
          <v-icon icon="mdi-map-marker" color="primary" size="16" />
        </a>
        <v-icon
          v-else
          :icon="p.isHome ? 'mdi-home-circle' : 'mdi-map-marker-outline'"
          :color="p.isHome ? 'success' : 'medium-emphasis'"
          size="16"
          style="flex-shrink:0; opacity:0.75"
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
const { glass } = useGlassEffect()
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
      mapsUrl: (() => {
        const lat = attrs?.latitude as number | undefined
        const lon = attrs?.longitude as number | undefined
        return lat != null && lon != null ? `https://maps.google.com/?q=${lat},${lon}` : null
      })(),
    }
  })
})
</script>

<style scoped>
/* ── Shell ──────────────────────────────────── */
.person-card {
  padding: 10px 12px 12px;
  gap: 8px;
}

/* ── Header ─────────────────────────────────── */
.person-header {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.person-title {
  font-size: 11px;
  opacity: 0.6;
  letter-spacing: 0.025em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Person list ────────────────────────────── */
.person-list {
  gap: 5px;
  min-height: 0;
  justify-content: center;
}
.person-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  transition: background 0.3s ease, border-color 0.3s ease;
}
.person-row--home {
  background: rgba(var(--v-theme-success), 0.08);
  border-color: rgba(var(--v-theme-success), 0.14);
}
.person-row--away {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-color: rgba(var(--v-theme-on-surface), 0.06);
}

/* Avatar */
.person-avatar { transition: box-shadow 0.3s ease; }
.person-avatar--home {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-success), 0.4);
}

/* Text */
.person-name {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}
.person-location {
  font-size: 11px;
  margin-top: 1px;
  opacity: 0.7;
}
.person-location--home { color: rgb(var(--v-theme-success)); }
.person-location--away { }
</style>
