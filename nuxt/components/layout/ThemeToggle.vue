<template>
  <v-menu :close-on-content-click="false" offset="8">
    <template #activator="{ props: menuProps }">
      <v-btn v-bind="menuProps" icon="mdi-palette" size="small" variant="text" :title="t('toolbar.theme')" />
    </template>

    <v-card width="232" rounded="lg" :class="{ 'theme-card-glass': glass }">
      <div class="px-3 pt-3 pb-1 text-caption text-medium-emphasis font-weight-medium">
        {{ t('toolbar.theme') }}
      </div>
      <div class="theme-grid pa-2">
        <v-tooltip v-for="th in THEMES" :key="th.id" :text="th.name" location="top" :open-delay="300">
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

const theme = useTheme()
const currentTheme = computed(() => theme.global.name.value)

const THEMES = [
  { id: 'dark',        name: 'Dark',             dark: true,  bg: '#0f172a', primary: '#6366f1' },
  { id: 'light',       name: 'Light',            dark: false, bg: '#f8fafc', primary: '#4f46e5' },
  { id: 'dracula',     name: 'Dracula',          dark: true,  bg: '#282a36', primary: '#bd93f9' },
  { id: 'nord',        name: 'Nord',             dark: true,  bg: '#2e3440', primary: '#88c0d0' },
  { id: 'catppuccin',  name: 'Catppuccin',       dark: true,  bg: '#1e1e2e', primary: '#cba6f7' },
  { id: 'lumon',       name: 'Lumon',            dark: true,  bg: '#0d1b2a', primary: '#4d9de0' },
  { id: 'retro82',     name: "Retro '82",        dark: true,  bg: '#1a0e02', primary: '#ff8c00' },
  { id: 'miasma',      name: 'Miasma',           dark: true,  bg: '#222222', primary: '#7d9a8a' },
  { id: 'neongreen',   name: 'Neon Green',       dark: true,  bg: '#090909', primary: '#39ff14' },
  { id: 'jarvis',      name: 'Jarvis 3D',        dark: true,  bg: '#0a0c12', primary: '#e63946' },
  { id: 'anime',       name: 'Anime Pack',       dark: true,  bg: '#0d0d14', primary: '#e91e8c' },
  { id: 'gruvboxmat',  name: 'Gruvbox Material', dark: true,  bg: '#1d2021', primary: '#a9b665' },
  { id: 'aethernight', name: 'Aether Night',     dark: true,  bg: '#0e0e10', primary: '#7c83e5' },
  { id: 'auradark',    name: 'Aura Dark',        dark: true,  bg: '#15141b', primary: '#a277ff' },
  { id: 'anthropic',   name: 'Anthropic',        dark: true,  bg: '#19191c', primary: '#e8612c' },
  { id: 'claudedark',  name: 'Claude Dark',      dark: true,  bg: '#1a1a1a', primary: '#c96a2f' },
  { id: 'liquidray',   name: 'Liquid Ray',       dark: true,  bg: '#1a1d1e', primary: '#c0c0c0' },
  { id: 'matrix',      name: 'Tema Matrix',      dark: true,  bg: '#0d1117', primary: '#00d26a' },
  { id: 'roblox',      name: 'Roblox Studio',    dark: true,  bg: '#1a1a1a', primary: '#0066bf' },
  { id: 'zoro',        name: 'Zoro',             dark: true,  bg: '#0a120a', primary: '#4caf50' },
  { id: 'polarblack',  name: 'Polar Black',      dark: true,  bg: '#1b1e21', primary: '#e0e0e0' },
]

function setTheme(id: string) {
  theme.global.name.value = id
  localStorage.setItem('ha-theme', id)
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
