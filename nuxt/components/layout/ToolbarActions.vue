<template>
  <ConnectionStatus class="mr-2" />

  <v-btn icon="mdi-bell-cog-outline" size="small" variant="text" @click="openDialog" />

  <!-- Desktop-only actions -->
  <div class="d-none d-sm-inline-flex align-center ga-0">
    <v-btn :icon="glass ? 'mdi-blur' : 'mdi-blur-off'" size="small" variant="text"
      :color="glass ? 'primary' : undefined" :title="t('toolbar.glass_effect')" @click="toggleGlass" />

    <v-menu>
      <template #activator="{ props: mp }">
        <v-btn size="small" variant="text" v-bind="mp">{{ locale.toUpperCase() }}</v-btn>
      </template>
      <v-card rounded="lg" :class="{ 'theme-card-glass': glass }">
        <v-list density="compact" nav>
          <v-list-item v-for="loc in availableLocales" :key="loc.code" :title="loc.name"
            :active="locale === loc.code" :color="locale === loc.code ? 'primary' : undefined"
            rounded="lg" @click="setLocale(loc.code)" />
        </v-list>
      </v-card>
    </v-menu>

    <ThemeToggle />

    <v-divider v-if="canEdit" vertical class="mx-1 my-2" />
    <v-btn v-if="canEdit" :icon="editMode ? 'mdi-pencil-off-outline' : 'mdi-pencil-outline'"
      size="small" variant="text" :color="editMode ? 'primary' : undefined"
      :title="editMode ? t('toolbar.edit_mode_off') : t('toolbar.edit_mode_on')"
      @click="emit('toggle-edit')" />
  </div>

  <!-- User menu (always visible, contains mobile extras) -->
  <v-menu>
    <template #activator="{ props: mp }">
      <v-btn icon="mdi-account-circle-outline" size="small" variant="text" v-bind="mp" />
    </template>
    <v-card rounded="lg" min-width="200" :class="{ 'theme-card-glass': glass }">
      <v-list density="compact" nav>
        <v-list-item :title="user?.username" :subtitle="t('toolbar.signed_in')" disabled />
        <v-divider class="my-1" />

        <!-- Mobile-only extras -->
        <v-list-item class="d-sm-none" :prepend-icon="glass ? 'mdi-blur' : 'mdi-blur-off'"
          :title="t('toolbar.glass_effect')" :active="glass" :color="glass ? 'primary' : undefined"
          rounded="lg" @click="toggleGlass" />
        <v-list-item class="d-sm-none" prepend-icon="mdi-translate" :title="locale.toUpperCase()"
          rounded="lg">
          <template #append>
            <div class="d-flex ga-1 flex-wrap justify-end" style="max-width:120px">
              <v-chip v-for="loc in availableLocales" :key="loc.code" size="x-small"
                :color="locale === loc.code ? 'primary' : undefined"
                :variant="locale === loc.code ? 'flat' : 'outlined'"
                @click.stop="setLocale(loc.code)">
                {{ loc.code.toUpperCase() }}
              </v-chip>
            </div>
          </template>
        </v-list-item>
        <v-list-item
          v-if="canEdit"
          :prepend-icon="editMode ? 'mdi-pencil-off-outline' : 'mdi-pencil-outline'"
          :title="editMode ? t('toolbar.edit_mode_off') : t('toolbar.edit_mode_on')"
          :active="editMode"
          :color="editMode ? 'primary' : undefined"
          rounded="lg"
          @click="emit('toggle-edit')"
        />
        <v-divider class="d-sm-none my-1" />

        <v-list-item v-if="user?.role === 'admin'" prepend-icon="mdi-account-cog-outline"
          :title="t('toolbar.user_mgmt')" rounded="lg" to="/admin/users" />
        <v-list-item prepend-icon="mdi-logout" :title="t('toolbar.logout')" rounded="lg" @click="logout" />
        <v-divider class="my-1" />
        <v-list-item prepend-icon="mdi-github" title="GitHub" :subtitle="`v${config.public.appVersion}`"
          rounded="lg" :href="config.public.githubUrl" target="_blank" density="compact" />
      </v-list>
    </v-card>
  </v-menu>

</template>

<script setup lang="ts">
const { t, locale, setLocale, locales } = useI18n()
const config = useRuntimeConfig()
const { glass, toggle: toggleGlass } = useGlassEffect()
const availableLocales = computed(() => (locales.value as { code: string; name: string }[]))
const { openDialog } = useNotificationRulesDialog()

const props = defineProps<{ editMode?: boolean; canEdit?: boolean }>()
const emit = defineEmits<{ 'toggle-edit': [] }>()

const { user, clear } = useUserSession()

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch { /* ignore server errors — still clear client state */ }
  clear()
  await navigateTo('/login')
}
</script>
