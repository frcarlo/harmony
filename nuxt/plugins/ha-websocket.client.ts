// Client-only plugin: connects to the HA WebSocket proxy on app start
export default defineNuxtPlugin(() => {
  const entityStore = useEntityStore()
  const client = useHAClient()

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/ha-ws`

  // Batch state updates — deduplicate per entity and flush once per frame (or 100ms if hidden)
  let pendingUpdates = new Map<string, Parameters<typeof entityStore.setEntity>[0]>()
  let flushScheduled = false
  let initialized = false

  function flushUpdates() {
    flushScheduled = false
    if (pendingUpdates.size === 0) return
    entityStore.batchSetEntities([...pendingUpdates.values()])
    pendingUpdates = new Map()
  }

  function scheduleFlush() {
    if (flushScheduled) return
    flushScheduled = true
    if (document.visibilityState === 'hidden') {
      // RAF doesn't fire when screen is off — fall back to setTimeout
      setTimeout(flushUpdates, 100)
    } else {
      requestAnimationFrame(flushUpdates)
    }
  }

  client.onStateChange((state) => {
    pendingUpdates.set(state.entity_id, state)
    scheduleFlush()
  })

  // When screen wakes up, patch only changed states to avoid a full re-render flash
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !client.isConnected) return
    try {
      const states = await client.getStates()
      entityStore.batchSetEntities(states)
    } catch { /* ignore */ }
  })

  client.onConnect(async () => {
    entityStore.setConnected(true)
    try {
      const states = await client.getStates()

      if (initialized) {
        entityStore.batchSetEntities(states)
        return
      }

      const [areas, entityRegistry, deviceRegistry, labelRegistry] = await Promise.all([
        client.getAreas(),
        client.getEntityRegistry(),
        client.getDeviceRegistry(),
        client.getLabelRegistry().catch(() => []),
      ])

      entityStore.setEntities(states)
      entityStore.setAreas(areas)
      entityStore.setLabels(labelRegistry)
      const deviceAreaMap = Object.fromEntries(deviceRegistry.map(d => [d.id, d.area_id]))
      const deviceLabelsMap = Object.fromEntries(deviceRegistry.map(d => [d.id, d.labels ?? []]))
      const entityAreaMap: Record<string, string> = {}
      const entityLabelsMap: Record<string, string[]> = {}
      const entityPlatformMap: Record<string, string> = {}
      for (const entry of entityRegistry) {
        const areaId = entry.area_id ?? (entry.device_id ? deviceAreaMap[entry.device_id] : null)
        if (areaId) entityAreaMap[entry.entity_id] = areaId
        const entityLabels = entry.labels ?? []
        const deviceLabels = entry.device_id ? (deviceLabelsMap[entry.device_id] ?? []) : []
        const combined = [...new Set([...entityLabels, ...deviceLabels])]
        if (combined.length) entityLabelsMap[entry.entity_id] = combined
        if (entry.platform) entityPlatformMap[entry.entity_id] = entry.platform
      }
      entityStore.setEntityAreaMap(entityAreaMap)
      entityStore.setEntityLabelsMap(entityLabelsMap)
      entityStore.setEntityPlatformMap(entityPlatformMap)
      initialized = true
    } catch (e) {
      console.error('[HA] onConnect init failed:', e)
    }
  })

  client.onDisconnect(() => {
    entityStore.setConnected(false)
  })

  client.connect(wsUrl)
})
