import type { Ref } from 'vue'

export function useBatteryInfo(entityId: Ref<string | null | undefined>) {
  const entityStore = useEntityStore()

  const batteryEntityId = computed(() => {
    if (!entityId.value) return null
    const deviceId = entityStore.entityDeviceMap[entityId.value]
    return deviceId ? (entityStore.deviceBatteryEntityMap[deviceId] ?? null) : null
  })

  const batteryLevel = computed(() => {
    const s = batteryEntityId.value ? entityStore.entities[batteryEntityId.value] : null
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null
    if (batteryEntityId.value?.startsWith('binary_sensor.')) return s.state === 'on' ? 0 : 100
    const n = Number.parseFloat(s.state)
    return Number.isFinite(n) ? Math.round(n) : null
  })

  const batteryIsNumeric = computed(() => batteryEntityId.value?.startsWith('sensor.') ?? false)

  const batteryIcon = computed(() => {
    const l = batteryLevel.value
    if (l === null) return 'mdi-battery'
    if (l <= 5) return 'mdi-battery-alert'
    if (l <= 15) return 'mdi-battery-10'
    if (l <= 25) return 'mdi-battery-20'
    if (l <= 35) return 'mdi-battery-30'
    if (l <= 45) return 'mdi-battery-40'
    if (l <= 55) return 'mdi-battery-50'
    if (l <= 65) return 'mdi-battery-60'
    if (l <= 75) return 'mdi-battery-70'
    if (l <= 85) return 'mdi-battery-80'
    if (l <= 95) return 'mdi-battery-90'
    return 'mdi-battery'
  })

  const batteryColor = computed<string | undefined>(() => {
    const l = batteryLevel.value
    if (l === null) return undefined
    if (l <= 10) return 'error'
    if (l <= 30) return 'warning'
    return undefined
  })

  return { batteryEntityId, batteryLevel, batteryIsNumeric, batteryIcon, batteryColor }
}
