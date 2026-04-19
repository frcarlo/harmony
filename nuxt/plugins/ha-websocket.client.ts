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
    const [states, areas, entityRegistry, deviceRegistry] = await Promise.all([
      client.getStates(),
      client.getAreas(),
      client.getEntityRegistry(),
      client.getDeviceRegistry(),
    ])
    entityStore.setEntities(states)
    entityStore.setAreas(areas)

    // Build entity → area map: entity direct area_id, fallback to device area_id
    const deviceAreaMap = Object.fromEntries(deviceRegistry.map(d => [d.id, d.area_id]))
    const entityAreaMap: Record<string, string> = {}
    for (const entry of entityRegistry) {
      const areaId = entry.area_id ?? (entry.device_id ? deviceAreaMap[entry.device_id] : null)
      if (areaId) entityAreaMap[entry.entity_id] = areaId
    }
    entityStore.setEntityAreaMap(entityAreaMap)
  })

  client.onDisconnect(() => {
    entityStore.setConnected(false)
  })

  client.connect(wsUrl)
})
