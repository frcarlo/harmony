export function useDashboardDisplayMode() {
  const storage = useUserPreferenceStorage()
  const { user } = useUserSession()
  const forcedKioskMode = computed(() => user.value?.force_kiosk === true)
  const performanceMode = useState('dashboard-performance-mode', () =>
    storage.read('ha-performance-mode') === 'true'
  )
  const kioskMode = useState('dashboard-kiosk-mode', () =>
    forcedKioskMode.value || storage.read('ha-kiosk-mode') === 'true'
  )

  watch([() => storage.currentUserId.value, forcedKioskMode], () => {
    performanceMode.value = storage.read('ha-performance-mode') === 'true'
    kioskMode.value = forcedKioskMode.value || storage.read('ha-kiosk-mode') === 'true'
  }, { immediate: true })

  function togglePerformanceMode() {
    performanceMode.value = !performanceMode.value
    storage.write('ha-performance-mode', String(performanceMode.value))
  }

  function toggleKioskMode() {
    if (forcedKioskMode.value) {
      kioskMode.value = true
      return
    }
    kioskMode.value = !kioskMode.value
    storage.write('ha-kiosk-mode', String(kioskMode.value))
  }

  return {
    performanceMode,
    kioskMode,
    forcedKioskMode,
    togglePerformanceMode,
    toggleKioskMode,
  }
}
