<template>
  <v-navigation-drawer
    :model-value="open"
    :location="side === 'left' ? 'left' : 'right'"
    :width="drawerWidth"
    temporary
    :class="[{ 'ui-sheet-glass': glass }, side === 'left' ? 'ui-sheet--left' : 'ui-sheet--right']"
    @update:model-value="v => !v && $emit('close')"
  >
    <button
      v-if="resizable"
      type="button"
      class="ui-sheet__resize-handle"
      :aria-label="'Resize panel'"
      @pointerdown="startResize"
    >
      <span class="ui-sheet__resize-grip" />
    </button>
    <div class="pa-5 pb-0">
      <slot name="header" />
    </div>
    <div class="pa-5 overflow-y-auto" style="height: calc(100% - 80px)">
      <slot />
    </div>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  side?: 'left' | 'right'
  width?: string
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
  storageKey?: string
}>(), {
  side: 'right',
  resizable: false,
  minWidth: 320,
  maxWidth: 720,
})
defineEmits<{ close: [] }>()

const { glass } = useGlassEffect()

const defaultWidth = computed(() => {
  if (!props.width) return 320
  return parseInt(props.width) || 320
})

const drawerWidth = ref(defaultWidth.value)
const isResizing = ref(false)

function clampWidth(value: number) {
  return Math.min(props.maxWidth, Math.max(props.minWidth, Math.round(value)))
}

function readStoredWidth() {
  if (!import.meta.client || !props.storageKey) return null
  const raw = window.localStorage.getItem(props.storageKey)
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? clampWidth(parsed) : null
}

function persistWidth() {
  if (!import.meta.client || !props.storageKey) return
  window.localStorage.setItem(props.storageKey, String(drawerWidth.value))
}

function applyInitialWidth() {
  drawerWidth.value = readStoredWidth() ?? clampWidth(defaultWidth.value)
}

function stopResize() {
  if (!isResizing.value || !import.meta.client) return
  isResizing.value = false
  document.body.style.removeProperty('user-select')
  document.body.style.removeProperty('cursor')
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopResize)
  persistWidth()
}

function onPointerMove(event: PointerEvent) {
  if (!isResizing.value || !import.meta.client) return
  const viewportWidth = window.innerWidth
  const rawWidth = props.side === 'right'
    ? viewportWidth - event.clientX
    : event.clientX

  drawerWidth.value = clampWidth(rawWidth)
}

function startResize(event: PointerEvent) {
  if (!props.resizable || !import.meta.client) return
  event.preventDefault()
  isResizing.value = true
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopResize, { once: true })
}

watch(() => props.width, () => {
  if (props.storageKey && import.meta.client && window.localStorage.getItem(props.storageKey)) return
  drawerWidth.value = clampWidth(defaultWidth.value)
}, { immediate: true })

watch(() => props.open, (open) => {
  if (open) applyInitialWidth()
  else stopResize()
})

onMounted(() => {
  applyInitialWidth()
})

onBeforeUnmount(() => {
  stopResize()
})
</script>

<style scoped>
.ui-sheet__resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 14px;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: col-resize;
  z-index: 2;
}

.ui-sheet--right .ui-sheet__resize-handle {
  left: 0;
}

.ui-sheet--left .ui-sheet__resize-handle {
  right: 0;
}

.ui-sheet__resize-grip {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 64px;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.12);
  transition: background 0.2s ease, opacity 0.2s ease;
  opacity: 0.65;
}

.ui-sheet__resize-handle:hover .ui-sheet__resize-grip,
.ui-sheet__resize-handle:focus-visible .ui-sheet__resize-grip {
  background: rgba(var(--v-theme-primary), 0.5);
  opacity: 1;
}
</style>
