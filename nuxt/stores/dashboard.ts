import { defineStore } from 'pinia'
import type { Dashboard, Widget, GridConfig } from '~/types/dashboard'

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

const MAX_HISTORY = 50

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: null as Dashboard | null,
    editMode: false,
    selectedWidgetId: null as string | null,
    _history: [] as string[],
    _future: [] as string[],
    _pendingSnapshot: null as string | null,
  }),

  getters: {
    canUndo: (state) => state._history.length > 0,
    canRedo: (state) => state._future.length > 0,
  },

  actions: {
    setDashboard(dashboard: Dashboard) {
      this.dashboard = dashboard
      this._history = []
      this._future = []
      this._pendingSnapshot = null
    },

    clearDashboard() {
      this.dashboard = null
    },

    setEditMode(editMode: boolean) {
      this.editMode = editMode
      if (!editMode) this.selectedWidgetId = null
    },

    setSelectedWidget(id: string | null) {
      this.selectedWidgetId = id
    },

    // Snapshot current widgets state before a mutating action
    _pushHistory() {
      if (!this.dashboard) return
      this._history.push(JSON.stringify(this.dashboard.widgets))
      if (this._history.length > MAX_HISTORY) this._history.shift()
      this._future = []
    },

    // Begin a "group" undo — call before a continuous interaction like drag/config edit
    beginUndoGroup() {
      if (!this.dashboard || this._pendingSnapshot !== null) return
      this._pendingSnapshot = JSON.stringify(this.dashboard.widgets)
    },

    // Commit the group — only pushes if something actually changed
    commitUndoGroup() {
      if (!this.dashboard || this._pendingSnapshot === null) return
      const current = JSON.stringify(this.dashboard.widgets)
      if (current !== this._pendingSnapshot) {
        this._history.push(this._pendingSnapshot)
        if (this._history.length > MAX_HISTORY) this._history.shift()
        this._future = []
      }
      this._pendingSnapshot = null
    },

    undo() {
      if (!this.dashboard || this._history.length === 0) return
      this._future.unshift(JSON.stringify(this.dashboard.widgets))
      this.dashboard.widgets = JSON.parse(this._history.pop()!)
      this.selectedWidgetId = null
    },

    redo() {
      if (!this.dashboard || this._future.length === 0) return
      this._history.push(JSON.stringify(this.dashboard.widgets))
      this.dashboard.widgets = JSON.parse(this._future.shift()!)
    },

    updateWidgetLayout(id: string, layout: Widget['layout']) {
      if (!this.dashboard) return
      const w = this.dashboard.widgets.find((w) => w.id === id)
      if (w) w.layout = { ...w.layout, ...layout }
    },

    updateWidgetConfig(id: string, config: Widget['config']) {
      if (!this.dashboard) return
      const w = this.dashboard.widgets.find((w) => w.id === id)
      if (w) w.config = config
    },

    addWidget(widget: Widget) {
      if (!this.dashboard) return
      this._pushHistory()
      this.dashboard.widgets.push(widget)
    },

    removeWidget(id: string) {
      if (!this.dashboard) return
      this._pushHistory()
      this.dashboard.widgets = this.dashboard.widgets.filter((w) => w.id !== id)
      if (this.selectedWidgetId === id) this.selectedWidgetId = null
    },

    updateDashboardName(name: string) {
      if (!this.dashboard) return
      this.dashboard.name = name
    },

    updateDashboardIcon(icon: string) {
      if (!this.dashboard) return
      this.dashboard.icon = normalizeOptionalString(icon)
    },

    updateDashboardBackground(background: string | undefined) {
      if (!this.dashboard) return
      this.dashboard.background = normalizeOptionalString(background)
    },

    updateDashboardBgOpacity(opacity: number) {
      if (!this.dashboard) return
      this.dashboard.bg_opacity = opacity
    },

    updateDashboardBgSize(size: 'cover' | 'contain' | 'auto') {
      if (!this.dashboard) return
      this.dashboard.bg_size = size
    },

    updateDashboardTheme(theme: string | null | undefined) {
      if (!this.dashboard) return
      this.dashboard.theme_override = normalizeOptionalString(theme ?? undefined)
    },

    updateGridConfig(config: GridConfig) {
      if (!this.dashboard) return
      this.dashboard.grid_config = config
    },

    cloneWidget(id: string) {
      if (!this.dashboard) return
      const original = this.dashboard.widgets.find((w) => w.id === id)
      if (!original) return
      this._pushHistory()
      const clone: Widget = {
        ...original,
        id: crypto.randomUUID(),
        layout: { ...original.layout, x: original.layout.x + original.layout.w, y: original.layout.y },
        config: JSON.parse(JSON.stringify(original.config)),
        ...(original.appearance ? { appearance: JSON.parse(JSON.stringify(original.appearance)) } : {}),
        ...(original.visibility ? { visibility: JSON.parse(JSON.stringify(original.visibility)) } : {}),
      }
      this.dashboard.widgets.push(clone)
    },
  },
})
