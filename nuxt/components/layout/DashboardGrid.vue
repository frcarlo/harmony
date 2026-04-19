<template>
  <div class="w-100">
    <div ref="gridEl" class="grid-stack">
      <div v-for="widget in widgets" :key="widget.id" class="grid-stack-item" :gs-id="widget.id" :gs-x="widget.layout.x"
        :gs-y="widget.layout.y" :gs-w="widget.layout.w" :gs-h="widget.layout.h" :gs-min-w="widget.layout.minW ?? 2"
        :gs-min-h="widget.layout.minH ?? 2"
        :style="widget.appearance?.min_width ? { minWidth: widget.appearance.min_width + 'px' } : undefined">
        <div class="grid-stack-item-content">
          <WidgetWrapper :widget="widget" :edit-mode="editMode" />
        </div>
      </div>
    </div>

    <div v-if="editMode && widgets.length === 0"
      class="d-flex flex-column align-center justify-center py-16 text-center"
      style="border: 2px dashed rgba(99,102,241,0.3); border-radius: 12px; margin-top: 16px">
      <v-icon icon="mdi-grid" size="48" color="medium-emphasis" class="mb-3" />
      <p class="text-medium-emphasis">Klicke auf „Widget hinzufügen" um loszulegen</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GridStack } from 'gridstack'

const props = defineProps<{ editMode?: boolean }>()

const dashboardStore = useDashboardStore()
const widgets = computed(() => dashboardStore.dashboard?.widgets ?? [])
const gridEl = ref<HTMLElement | null>(null)
let grid: GridStack | null = null

function initGrid() {
  if (!gridEl.value) return
  grid = GridStack.init(
    {
      column: 24,
      columnOpts: {
        breakpoints: [
          { w: 480,  c: 2,  layout: 'list'  },
          { w: 768,  c: 4,  layout: 'list'  },
          { w: 1024, c: 12, layout: 'scale' },
          { w: 1440, c: 16, layout: 'scale' },
          { w: 1920, c: 20, layout: 'scale' },
        ],
        layout: 'scale',
      },
      cellHeight: 60,
      margin: 6,
      animate: true,
      float: true,
      draggable: { handle: '.drag-handle' },
      disableDrag: !props.editMode,
      disableResize: !props.editMode,
    },
    gridEl.value,
  )
  grid.on('change', (_event, items) => {
    if (!props.editMode || !items) return
    for (const item of items as Array<{ id?: string; x: number; y: number; w: number; h: number }>) {
      if (item.id) dashboardStore.updateWidgetLayout(item.id, { x: item.x, y: item.y, w: item.w, h: item.h })
    }
  })
}

async function reinitGrid() {
  if (grid) { grid.destroy(false); grid = null }
  await nextTick()
  // GridStack mutates gs-* attributes directly — Vue won't restore them on its own.
  // Manually reset from store so initGrid reads the correct original positions.
  widgets.value.forEach(w => {
    const el = gridEl.value?.querySelector(`[gs-id="${w.id}"]`)
    if (!el) return
    el.setAttribute('gs-x', String(w.layout.x))
    el.setAttribute('gs-y', String(w.layout.y))
    el.setAttribute('gs-w', String(w.layout.w))
    el.setAttribute('gs-h', String(w.layout.h))
  })
  initGrid()
}

onMounted(async () => {
  await nextTick()
  if (widgets.value.length > 0) initGrid()
})

// Reinit when dashboard data loads (new dashboard ID = new data)
watch(() => dashboardStore.dashboard?.id, async () => {
  if (grid) { grid.destroy(false); grid = null }
  await nextTick()
  await nextTick()
  initGrid()
})

// Reinit when widgets are added/removed
watch(() => widgets.value.length, async () => {
  if (grid) { grid.destroy(false); grid = null }
  await nextTick()
  await nextTick()
  initGrid()
})

watch(() => props.editMode, (v) => { if (!grid) return; v ? grid.enable() : grid.disable() })

onUnmounted(() => {
  grid?.destroy(false)
  grid = null
})
</script>
