// Client-only plugin: connects to the HA WebSocket proxy on app start
import type { EntityGroupFilter } from '~/types/dashboard'

export default defineNuxtPlugin(() => {
  const entityStore = useEntityStore()
  const dashboardStore = useDashboardStore()
  const { rules: notificationRules } = useNotificationRules()
  const client = useHAClient()

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsUrl = `${protocol}//${window.location.host}/api/ha-ws`

  // Batch state updates — deduplicate per entity and flush once per frame (or 100ms if hidden)
  let pendingUpdates = new Map<string, Parameters<typeof entityStore.setEntity>[0]>()
  let flushScheduled = false
  let initialized = false
  let trackProblemUpdates = false
  let repairRefreshTimer: ReturnType<typeof setInterval> | null = null

  const entityIdPattern = /\b[a-z_]+\.[a-zA-Z0-9_]+\b/g

  function collectEntityIds(value: unknown, target: Set<string>) {
    if (!value) return
    if (typeof value === 'string') {
      for (const match of value.matchAll(entityIdPattern)) target.add(match[0])
      return
    }
    if (Array.isArray(value)) {
      for (const item of value) collectEntityIds(item, target)
      return
    }
    if (typeof value === 'object') {
      for (const item of Object.values(value as Record<string, unknown>)) collectEntityIds(item, target)
    }
  }

  function domainOf(entityId: string) {
    return entityId.split('.')[0] ?? ''
  }

  function deviceClassOf(entity: { attributes?: Record<string, unknown> }) {
    return entity.attributes?.device_class as string | undefined
  }

  function friendlyNameOf(entity: { entity_id: string; attributes?: Record<string, unknown> }) {
    return (entity.attributes?.friendly_name as string | undefined) ?? entity.entity_id
  }

  function matchesFilter(entityId: string, filter?: EntityGroupFilter) {
    if (!filter) return false
    const entity = entityStore.entities[entityId]
    if (!entity) return false
    if (filter.exclude_groups && domainOf(entityId) === 'group') return false
    if (filter.domains?.length && !filter.domains.includes(domainOf(entityId))) return false

    const name = `${entityId} ${friendlyNameOf(entity)}`.toLowerCase()
    if (filter.name_contains && !name.includes(filter.name_contains.toLowerCase())) return false
    if (filter.name_starts_with && !friendlyNameOf(entity).toLowerCase().startsWith(filter.name_starts_with.toLowerCase())) return false

    if (filter.areas?.length) {
      const areaId = entityStore.entityAreaMap[entityId]
      if (!areaId || !filter.areas.includes(areaId)) return false
    }

    if (filter.labels?.length) {
      const labels = entityStore.entityLabelsMap[entityId] ?? []
      if (!filter.labels.some((label) => labels.includes(label))) return false
    }

    return true
  }

  function isOpeningSensor(entityId: string) {
    const entity = entityStore.entities[entityId]
    if (!entity || domainOf(entityId) !== 'binary_sensor') return false
    return ['door', 'window', 'garage_door'].includes(deviceClassOf(entity) ?? '')
  }

  function addRoomAutoStatusEntities(config: Record<string, unknown>, target: Set<string>) {
    if (config.auto_status_entities === false) return
    const firstEntityId =
      typeof config.light_entity === 'string' ? config.light_entity
        : typeof config.climate_entity === 'string' ? config.climate_entity
          : typeof config.sensor_entity === 'string' ? config.sensor_entity
            : undefined
    const areaId = firstEntityId ? entityStore.entityAreaMap[firstEntityId] : undefined
    if (!areaId) return
    for (const entityId of Object.keys(entityStore.entities)) {
      if (entityStore.entityAreaMap[entityId] === areaId && isOpeningSensor(entityId)) target.add(entityId)
    }
  }

  function isProblemCandidate(entityId: string) {
    const entity = entityStore.entities[entityId]
    if (!entity) return false
    return isProblemCandidateState(entity)
  }

  function isProblemCandidateState(entity: { entity_id: string; state: string; attributes?: Record<string, unknown> }) {
    if (entity.state === 'unavailable' || entity.state === 'unknown') return true

    const domain = domainOf(entity.entity_id)
    const deviceClass = deviceClassOf(entity)
    if (domain === 'update' || domain === 'alarm_control_panel') return true
    if (domain === 'binary_sensor') {
      return ['battery', 'problem', 'safety', 'smoke', 'moisture', 'gas', 'heat', 'tamper', 'door', 'window', 'garage_door'].includes(deviceClass ?? '')
    }
    if (domain !== 'sensor') return false

    if (deviceClass !== 'battery') return false

    return true
  }

  function addProblemCandidates(config: Record<string, unknown>, target: Set<string>) {
    for (const entityId of Object.keys(entityStore.entities)) {
      if (isProblemCandidate(entityId)) target.add(entityId)
    }
  }

  function applyDashboardEntityFilter() {
    const dashboard = dashboardStore.dashboard
    if (!dashboard || dashboardStore.editMode) {
      trackProblemUpdates = false
      entityStore.setActiveEntityFilter(null)
      return
    }

    const ids = new Set<string>()
    let nextTrackProblemUpdates = false
    for (const rule of notificationRules.value) {
      ids.add(rule.trigger_entity_id)
      ids.add(rule.action_entity_id)
    }

    for (const widget of dashboard.widgets) {
      collectEntityIds(widget.config, ids)

      const config = widget.config as Record<string, unknown>
      if (widget.type === 'room_card') addRoomAutoStatusEntities(config, ids)
      if (widget.type === 'problem_overview') {
        nextTrackProblemUpdates = true
        addProblemCandidates(config, ids)
      }

      if (widget.type === 'status_bar') {
        const entries = Array.isArray(config.entries) ? config.entries as Array<Record<string, unknown>> : []
        for (const entry of entries) {
          if (entry.entry_type === 'group') {
            const filter = entry.filter as EntityGroupFilter | undefined
            for (const entityId of Object.keys(entityStore.entities)) {
              if (matchesFilter(entityId, filter)) ids.add(entityId)
            }
          } else if (entry.entry_type === 'room') {
            addRoomAutoStatusEntities(entry, ids)
          } else if (entry.entry_type === 'problem') {
            nextTrackProblemUpdates = true
            addProblemCandidates(entry, ids)
          }
        }
      }
    }

    trackProblemUpdates = nextTrackProblemUpdates
    entityStore.setActiveEntityFilter(ids)
  }

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

  async function refreshRepairIssues() {
    if (!client.isConnected) return
    try {
      entityStore.setRepairIssues(await client.getRepairIssues())
    } catch { /* repairs may be unavailable on older HA versions */ }
  }

  function startRepairRefresh() {
    if (repairRefreshTimer) return
    repairRefreshTimer = setInterval(refreshRepairIssues, 60000)
  }

  function stopRepairRefresh() {
    if (!repairRefreshTimer) return
    clearInterval(repairRefreshTimer)
    repairRefreshTimer = null
  }

  client.onStateChange((state) => {
    if (!entityStore.shouldProcessLiveUpdate(state.entity_id)) {
      if (!trackProblemUpdates || !isProblemCandidateState(state)) return
      entityStore.setActiveEntityFilter([...(entityStore.activeEntityFilter ?? []), state.entity_id])
    }
    pendingUpdates.set(state.entity_id, state)
    scheduleFlush()
  })

  // When screen wakes up, patch only changed states to avoid a full re-render flash
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !client.isConnected) return
    try {
      const [states, repairIssues] = await Promise.all([
        client.getStates(),
        client.getRepairIssues().catch(() => entityStore.repairIssues),
      ])
      entityStore.batchSetEntities(states)
      entityStore.setRepairIssues(repairIssues)
    } catch { /* ignore */ }
  })

  client.onConnect(async () => {
    entityStore.setConnected(true)
    startRepairRefresh()
    try {
      const states = await client.getStates()

      if (initialized) {
        entityStore.batchSetEntities(states)
        client.getRepairIssues().then((issues) => entityStore.setRepairIssues(issues)).catch(() => undefined)
        return
      }

      const [areas, entityRegistry, deviceRegistry, labelRegistry, repairIssues] = await Promise.all([
        client.getAreas(),
        client.getEntityRegistry(),
        client.getDeviceRegistry(),
        client.getLabelRegistry().catch(() => []),
        client.getRepairIssues().catch(() => []),
      ])

      entityStore.setEntities(states)
      entityStore.setAreas(areas)
      entityStore.setLabels(labelRegistry)
      entityStore.setRepairIssues(repairIssues)
      const deviceAreaMap = Object.fromEntries(deviceRegistry.map(d => [d.id, d.area_id]))
      const deviceLabelsMap = Object.fromEntries(deviceRegistry.map(d => [d.id, d.labels ?? []]))
      const entityAreaMap: Record<string, string> = {}
      const entityDeviceMap: Record<string, string> = {}
      const entityLabelsMap: Record<string, string[]> = {}
      const entityPlatformMap: Record<string, string> = {}
      for (const entry of entityRegistry) {
        if (entry.device_id) entityDeviceMap[entry.entity_id] = entry.device_id
        const areaId = entry.area_id ?? (entry.device_id ? deviceAreaMap[entry.device_id] : null)
        if (areaId) entityAreaMap[entry.entity_id] = areaId
        const entityLabels = entry.labels ?? []
        const deviceLabels = entry.device_id ? (deviceLabelsMap[entry.device_id] ?? []) : []
        const combined = [...new Set([...entityLabels, ...deviceLabels])]
        if (combined.length) entityLabelsMap[entry.entity_id] = combined
        if (entry.platform) entityPlatformMap[entry.entity_id] = entry.platform
      }
      entityStore.setEntityAreaMap(entityAreaMap)
      entityStore.setEntityDeviceMap(entityDeviceMap)
      entityStore.setEntityLabelsMap(entityLabelsMap)
      entityStore.setEntityPlatformMap(entityPlatformMap)
      initialized = true
      applyDashboardEntityFilter()
    } catch (e) {
      console.error('[HA] onConnect init failed:', e)
    }
  })

  client.onDisconnect(() => {
    entityStore.setConnected(false)
    stopRepairRefresh()
  })

  client.connect(wsUrl)

  watch(
    () => [dashboardStore.dashboard?.id, dashboardStore.dashboard?.updated_at, dashboardStore.dashboard?.widgets, dashboardStore.editMode, entityStore.entityAreaMap, entityStore.entityLabelsMap, notificationRules.value] as const,
    applyDashboardEntityFilter,
    { flush: 'post' },
  )
})
