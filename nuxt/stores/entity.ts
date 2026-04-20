import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import type { HAState, HAArea, HALabel } from '~/types/ha'

export const useEntityStore = defineStore('entity', {
  state: () => ({
    entities: {} as Record<string, HAState>,
    connected: false,
    areas: [] as HAArea[],
    labels: [] as HALabel[],
    entityAreaMap: {} as Record<string, string>,   // entity_id → area_id
    entityLabelsMap: {} as Record<string, string[]>, // entity_id → label_ids
  }),

  actions: {
    setEntity(state: HAState) {
      const existing = this.entities[state.entity_id]
      if (existing?.state === state.state && existing?.last_updated === state.last_updated) return
      this.entities[state.entity_id] = markRaw(state)
    },

    setEntities(states: HAState[]) {
      this.entities = Object.fromEntries(states.map((s) => [s.entity_id, markRaw(s)]))
    },

    batchSetEntities(states: HAState[]) {
      for (const state of states) {
        const existing = this.entities[state.entity_id]
        if (existing?.state === state.state && existing?.last_updated === state.last_updated) continue
        this.entities[state.entity_id] = markRaw(state)
      }
    },

    setConnected(connected: boolean) {
      this.connected = connected
    },

    setAreas(areas: HAArea[]) {
      this.areas = areas
    },

    setLabels(labels: HALabel[]) {
      this.labels = labels
    },

    setEntityAreaMap(map: Record<string, string>) {
      this.entityAreaMap = map
    },

    setEntityLabelsMap(map: Record<string, string[]>) {
      this.entityLabelsMap = map
    },
  },

  getters: {
    getEntity: (state) => (entityId: string) => state.entities[entityId],
    areaForEntity: (state) => (entityId: string) => state.entityAreaMap[entityId],
  },
})
