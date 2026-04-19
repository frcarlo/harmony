<template>
  <ConnectionStatus class="mr-2" />

  <v-btn icon="mdi-bell-cog-outline" size="small" variant="text" @click="openDialog" />

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

  <!-- User menu -->
  <v-menu>
    <template #activator="{ props: mp }">
      <v-btn icon="mdi-account-circle-outline" size="small" variant="text" v-bind="mp" />
    </template>
    <v-card rounded="lg" min-width="180" :class="{ 'theme-card-glass': glass }">
      <v-list density="compact" nav>
        <v-list-item :title="user?.username" :subtitle="t('toolbar.signed_in')" disabled />
        <v-divider class="my-1" />
        <v-list-item v-if="user?.role === 'admin'" prepend-icon="mdi-account-cog-outline"
          :title="t('toolbar.user_mgmt')" rounded="lg" to="/admin/users" />
        <v-list-item prepend-icon="mdi-logout" :title="t('toolbar.logout')" rounded="lg" @click="logout" />
      </v-list>
    </v-card>
  </v-menu>

</template>

<script setup lang="ts">
const { t, locale, setLocale, locales } = useI18n()
const { glass, toggle: toggleGlass } = useGlassEffect()
const availableLocales = computed(() => (locales.value as { code: string; name: string }[]))
const { openDialog } = useNotificationRulesDialog()

const { user, clear } = useUserSession()

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch { /* ignore server errors — still clear client state */ }
  clear()
  await navigateTo('/login')
}
</script>
