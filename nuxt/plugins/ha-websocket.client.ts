// Client-only plugin: connects to the HA WebSocket proxy on app start
export default defineNuxtPlugin(() => {
  const entityStore = useEntityStore()
  const client = useHAClient()

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/ha-ws`

  // Batch state updates — collect changes and apply once per animation frame
  let pendingUpdates: Parameters<typeof entityStore.setEntity>[0][] = []
  let rafScheduled = false

  function flushUpdates() {
    rafScheduled = false
    if (pendingUpdates.length === 0) return
    entityStore.batchSetEntities(pendingUpdates)
    pendingUpdates = []
  }

  client.onStateChange((state) => {
    pendingUpdates.push(state)
    if (!rafScheduled) {
      rafScheduled = true
      requestAnimationFrame(flushUpdates)
    }
  })

  client.onConnect(async () => {
    entityStore.setConnected(true)
    try {
      const [states, areas, entityRegistry, deviceRegistry, labelRegistry] = await Promise.all([
        client.getStates(),
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
    } catch (e) {
      console.error('[HA] onConnect init failed:', e)
    }
  })

  client.onDisconnect(() => {
    entityStore.setConnected(false)
  })

  client.connect(wsUrl)
})
