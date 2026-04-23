export interface DashboardThemeOption {
  id: string
  name: string
  dark: boolean
  bg: string
  primary: string
}

const DASHBOARD_THEMES: DashboardThemeOption[] = [
  { id: 'dark',        name: 'Dark',             dark: true,  bg: '#0f172a', primary: '#6366f1' },
  { id: 'light',       name: 'Light',            dark: false, bg: '#f8fafc', primary: '#4f46e5' },
  { id: 'mistlight',   name: 'Mist Light',       dark: false, bg: '#cfd5db', primary: '#47515d' },
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

export function useDashboardThemes() {
  function getThemeOption(themeId?: string | null) {
    if (!themeId) return null
    return DASHBOARD_THEMES.find(theme => theme.id === themeId) ?? null
  }

  return {
    themes: DASHBOARD_THEMES,
    getThemeOption,
  }
}
