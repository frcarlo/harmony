import { defineStore } from 'pinia'
import type { Dashboard, Widget } from '~/types/dashboard'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: null as Dashboard | null,
    editMode: false,
    selectedWidgetId: null as string | null,
  }),

  actions: {
    setDashboard(dashboard: Dashboard) {
      this.dashboard = dashboard
    },

    setEditMode(editMode: boolean) {
      this.editMode = editMode
      if (!editMode) this.selectedWidgetId = null
    },

    setSelectedWidget(id: string | null) {
      this.selectedWidgetId = id
    },

    updateWidgetLayout(id: string, layout: Widget['layout']) {
      if (!this.dashboard) return
      const w = this.dashboard.widgets.find((w) => w.id === id)
      console.log('Updated layout for widget', id, layout)
      if (w) w.layout = { ...w.layout, ...layout }

    },

    updateWidgetConfig(id: string, config: Widget['config']) {
      if (!this.dashboard) return
      const w = this.dashboard.widgets.find((w) => w.id === id)
      console.log('Updated layout for widget', id, config)
      if (w) w.config = config
    },

    addWidget(widget: Widget) {
      if (!this.dashboard) return
      this.dashboard.widgets.push(widget)
    },

    removeWidget(id: string) {
      if (!this.dashboard) return
      this.dashboard.widgets = this.dashboard.widgets.filter((w) => w.id !== id)
      if (this.selectedWidgetId === id) this.selectedWidgetId = null
    },

    updateDashboardName(name: string) {
      if (!this.dashboard) return
      this.dashboard.name = name
    },

    updateDashboardIcon(icon: string) {
      if (!this.dashboard) return
      this.dashboard.icon = icon || undefined
    },

    updateDashboardBackground(background: string | undefined) {
      if (!this.dashboard) return
      this.dashboard.background = background || undefined
    },

    cloneWidget(id: string) {
      if (!this.dashboard) return
      const original = this.dashboard.widgets.find((w) => w.id === id)
      if (!original) return
      const clone: Widget = {
        ...original,
        id: crypto.randomUUID(),
        layout: { ...original.layout, x: original.layout.x + original.layout.w, y: original.layout.y },
        config: JSON.parse(JSON.stringify(original.config)),
        ...(original.appearance ? { appearance: JSON.parse(JSON.stringify(original.appearance)) } : {}),
      }
      this.dashboard.widgets.push(clone)
    },
  },
})
