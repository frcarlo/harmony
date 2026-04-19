<template>
  <div>
    <!-- Trigger field -->
    <v-text-field
      :model-value="modelValue"
      :label="label"
      :placeholder="placeholder ?? 'mdi-home'"
      clearable
      @update:model-value="$emit('update:modelValue', $event ?? '')"
    >
      <template #prepend-inner>
        <v-icon :icon="modelValue || 'mdi-grid'" size="18" class="mr-1" style="cursor:pointer" @click="open = true" />
      </template>
      <template #append-inner>
        <v-btn icon="mdi-dots-grid" size="x-small" variant="text" density="compact" @click="open = true" />
      </template>
    </v-text-field>

    <!-- Picker dialog -->
    <v-dialog v-model="open" max-width="480" scrollable>
      <v-card rounded="lg">
        <v-card-title class="d-flex align-center ga-2 pa-3 pb-2">
          <span class="text-subtitle-2 font-weight-semibold flex-grow-1">Icon wählen</span>
          <v-btn icon="mdi-close" size="x-small" variant="text" @click="open = false" />
        </v-card-title>

        <v-card-text class="pa-3 pt-0" style="height: 420px; overflow-y: auto">
          <v-text-field
            v-model="search"
            placeholder="Suchen…"
            prepend-inner-icon="mdi-magnify"
            clearable
            autofocus
            class="mb-3"
          />

          <div v-if="loading" class="d-flex justify-center py-8">
            <v-progress-circular indeterminate color="primary" />
          </div>

          <template v-else>
            <div class="text-caption text-medium-emphasis mb-2">{{ filtered.length }} Icons</div>
            <div class="icon-grid">
              <v-btn
                v-for="icon in visible"
                :key="icon"
                :icon="icon"
                size="small"
                :variant="modelValue === icon ? 'flat' : 'text'"
                :color="modelValue === icon ? 'primary' : undefined"
                :title="icon"
                @click="select(icon)"
              />
            </div>
            <div v-if="visible.length < filtered.length" class="d-flex justify-center mt-3">
              <v-btn variant="tonal" size="small" @click="showMore">
                {{ filtered.length - visible.length }} weitere laden
              </v-btn>
            </div>
          </template>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string; label?: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [v: string] }>()

const open = ref(false)
const search = ref('')
const allIcons = ref<string[]>([])
const loading = ref(false)
const PAGE = 200

// Load icon list lazily when dialog opens
watch(open, async (v) => {
  if (v && allIcons.value.length === 0) {
    loading.value = true
    try {
      allIcons.value = await $fetch<string[]>('/mdi-icons.json')
    } finally {
      loading.value = false
    }
  }
  if (v) {
    search.value = ''
    pageCount.value = 1
  }
})

const pageCount = ref(1)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return allIcons.value
  return allIcons.value.filter(i => i.includes(q))
})

watch(search, () => { pageCount.value = 1 })

const visible = computed(() => filtered.value.slice(0, PAGE * pageCount.value))

function showMore() { pageCount.value++ }

function select(icon: string) {
  emit('update:modelValue', icon)
  open.value = false
}
</script>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 40px);
  gap: 4px;
}
</style>
