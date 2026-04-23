<template>
  <v-app>
    <div v-if="glass" class="glass-blobs" aria-hidden="true">
      <div class="blob blob-1" />
      <div class="blob blob-2" />
    </div>


    <NuxtPage />

    <NotificationPopup />
    <NotificationRulesDialog :model-value="notifDialogOpen" @update:model-value="closeNotifDialog" />
    <Toaster rich-colors position="bottom-right" :theme="isDark ? 'dark' : 'light'" />
  </v-app>
</template>

<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import { useTheme } from 'vuetify'
const { glass } = useGlassEffect()
const theme = useTheme()
const isDark = computed(() => theme.current.value.dark)
const { loggedIn } = useUserSession()
const { loadRules, startWatcher } = useNotificationRules()
useServerUpdates()
const { open: notifDialogOpen, closeDialog: closeNotifDialog } = useNotificationRulesDialog()

onMounted(async () => {
  if (!loggedIn.value) return
  await loadRules()
  startWatcher()
})
</script>

<style>
/* 1. Der Container muss den ganzen Bildschirm füllen */
.glass-blobs {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  /* Explizite Breite */
  height: 100vh;
  /* Explizite Höhe */
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  /* Höherer Blur für weichere Übergänge */
  opacity: 0.2;
}

.blob-1 {
  width: min(46vw, 560px);
  height: min(46vw, 560px);
  top: 28%;
  left: 42%;
  transform: translate(-50%, -50%);
  background: rgb(var(--v-theme-primary));
  opacity: 0.14;
}

.blob-2 {
  width: min(42vw, 520px);
  height: min(42vw, 520px);
  top: -10vh;
  left: -8vw;
  background: rgba(255, 255, 255, 0.9);
  opacity: 0.06;
}

@keyframes auroraPulse {

  0%,
  100% {
    background-position: 0% 0%, 100% 100%, 50% 50%;
  }

  50% {
    background-position: 5% 15%, 95% 85%, 55% 45%;
  }
}

.aurora-background-animated {
  background-color: #0d0d12;
  background-image:
    radial-gradient(at center, hsla(38, 70%, 25%, 0.2) 0px, transparent 40%),
    radial-gradient(at center, hsla(190, 70%, 15%, 0.15) 0px, transparent 35%);
  background-repeat: no-repeat;

  /* Das ist wichtig: Wir verschieben die Position */
  background-position: 15% 10%, 85% 90%;

  /* Animation hinzufügen */
  animation: auroraPulse 15s ease-in-out infinite;

  background-attachment: fixed;
  min-height: 100vh;
}

/* ... blob-2 und blob-3 analog ... */

/* WICHTIG: Vuetify Korrekturen */
.v-application {
  /* Macht den Standard-Hintergrund von Vuetify unsichtbar */
  background: transparent !important;
}

.v-application__wrap {
  /* Stellt sicher, dass der Inhalt über den Blobs liegt, 
     aber die Blobs sichtbar bleiben */
  position: relative;
  z-index: 1;
}
</style>
