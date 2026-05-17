import { defineStore } from 'pinia'
import { markRaw } from 'vue'
import type { HAState, HAArea, HALabel, HARepairIssue } from '~/types/ha'

export const useEntityStore = defineStore('entity', {
  state: () => ({
    entities: {} as Record<string, HAState>,
    connected: false,
    hasConnectedOnce: false,
    areas: [] as HAArea[],
    labels: [] as HALabel[],
    repairIssues: [] as HARepairIssue[],
    entityAreaMap: {} as Record<string, string>,   // entity_id → area_id
    entityDeviceMap: {} as Record<string, string>, // entity_id → device_id
    entityLabelsMap: {} as Record<string, string[]>, // entity_id → label_ids
    entityPlatformMap: {} as Record<string, string>,  // entity_id → platform/integration
    deviceBatteryEntityMap: {} as Record<string, string>, // device_id → battery entity_id
    activeEntityFilter: null as Set<string> | null, // null → process all live updates
  }),

  actions: {
    setEntity(state: HAState) {
      if (!this.shouldProcessLiveUpdate(state.entity_id)) return
      const existing = this.entities[state.entity_id]
      if (existing?.state === state.state && existing?.last_updated === state.last_updated) return
      this.entities[state.entity_id] = markRaw(state)
    },

    setEntities(states: HAState[]) {
      this.entities = Object.fromEntries(states.map((s) => [s.entity_id, markRaw(s)]))
    },

    batchSetEntities(states: HAState[]) {
      for (const state of states) {
        if (!this.shouldProcessLiveUpdate(state.entity_id)) continue
        const existing = this.entities[state.entity_id]
        if (existing?.state === state.state && existing?.last_updated === state.last_updated) continue
        this.entities[state.entity_id] = markRaw(state)
      }
    },

    setConnected(connected: boolean) {
      this.connected = connected
      if (connected) this.hasConnectedOnce = true
    },

    setAreas(areas: HAArea[]) {
      this.areas = areas
    },

    setLabels(labels: HALabel[]) {
      this.labels = labels
    },

    setRepairIssues(issues: HARepairIssue[]) {
      this.repairIssues = issues
    },

    setEntityAreaMap(map: Record<string, string>) {
      this.entityAreaMap = map
    },

    setEntityDeviceMap(map: Record<string, string>) {
      this.entityDeviceMap = map
    },

    setEntityLabelsMap(map: Record<string, string[]>) {
      this.entityLabelsMap = map
    },

    setEntityPlatformMap(map: Record<string, string>) {
      this.entityPlatformMap = map
    },

    setDeviceBatteryEntityMap(map: Record<string, string>) {
      this.deviceBatteryEntityMap = map
    },

    setActiveEntityFilter(entityIds: Iterable<string> | null) {
      this.activeEntityFilter = entityIds ? new Set(entityIds) : null
    },

    shouldProcessLiveUpdate(entityId: string) {
      return !this.activeEntityFilter || this.activeEntityFilter.has(entityId)
    },
  },

  getters: {
    getEntity: (state) => (entityId: string) => state.entities[entityId],
    areaForEntity: (state) => (entityId: string) => state.entityAreaMap[entityId],
  },
})
