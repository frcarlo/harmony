export function useDashboardDisplayMode() {
  const storage = useUserPreferenceStorage()
  const performanceMode = useState('dashboard-performance-mode', () =>
    storage.read('ha-performance-mode') === 'true'
  )
  const kioskMode = useState('dashboard-kiosk-mode', () =>
    storage.read('ha-kiosk-mode') === 'true'
  )

  watch(() => storage.currentUserId.value, () => {
    performanceMode.value = storage.read('ha-performance-mode') === 'true'
    kioskMode.value = storage.read('ha-kiosk-mode') === 'true'
  }, { immediate: true })

  function togglePerformanceMode() {
    performanceMode.value = !performanceMode.value
    storage.write('ha-performance-mode', String(performanceMode.value))
  }

  function toggleKioskMode() {
    kioskMode.value = !kioskMode.value
    storage.write('ha-kiosk-mode', String(kioskMode.value))
  }

  return {
    performanceMode,
    kioskMode,
    togglePerformanceMode,
    toggleKioskMode,
  }
}
