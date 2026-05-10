export type DeviceOverride = 'auto' | 'desktop' | 'tablet' | 'mobile'

export function useDashboardDisplayMode() {
  const storage = useUserPreferenceStorage()
  const { user } = useUserSession()
  const forcedKioskMode = computed(() => user.value?.force_kiosk === true)
  const forcedPerformanceMode = computed(() => user.value?.force_performance_mode ?? null)
  const forcedDeviceType = computed(() => (user.value?.force_device_type as DeviceOverride | null | undefined) ?? null)
  const wakeLock = useState<any | null>('dashboard-kiosk-wake-lock', () => null)
  const wakeLockActive = useState('dashboard-kiosk-wake-lock-active', () => false)
  const fullscreenActive = useState('dashboard-kiosk-fullscreen-active', () => false)
  const listenersReady = useState('dashboard-kiosk-listeners-ready', () => false)
  const performanceMode = useState('dashboard-performance-mode', () =>
    storage.read('ha-performance-mode') === 'true'
  )
  const kioskMode = useState('dashboard-kiosk-mode', () =>
    forcedKioskMode.value || storage.read('ha-kiosk-mode') === 'true'
  )
  const deviceOverride = useState<DeviceOverride>('dashboard-device-override', () =>
    (storage.read('ha-device-type') as DeviceOverride | null) ?? 'auto'
  )

  watch([() => storage.currentUserId.value, forcedKioskMode, forcedPerformanceMode], () => {
    performanceMode.value = forcedPerformanceMode.value ?? (storage.read('ha-performance-mode') === 'true')
    kioskMode.value = forcedKioskMode.value || storage.read('ha-kiosk-mode') === 'true'
    deviceOverride.value = (storage.read('ha-device-type') as DeviceOverride | null) ?? 'auto'
  }, { immediate: true })

  const wakeLockSupported = computed(() => import.meta.client && 'wakeLock' in navigator)
  const fullscreenSupported = computed(() => import.meta.client && !!document.documentElement.requestFullscreen)

  async function requestWakeLock() {
    if (!import.meta.client || !wakeLockSupported.value || document.visibilityState !== 'visible') return
    if (wakeLock.value) {
      wakeLockActive.value = true
      return
    }
    try {
      wakeLock.value = await (navigator as any).wakeLock.request('screen')
      wakeLockActive.value = true
      wakeLock.value.addEventListener?.('release', () => {
        wakeLock.value = null
        wakeLockActive.value = false
      })
    } catch {
      wakeLock.value = null
      wakeLockActive.value = false
    }
  }

  async function releaseWakeLock() {
    if (!import.meta.client || !wakeLock.value) {
      wakeLock.value = null
      wakeLockActive.value = false
      return
    }
    try {
      await wakeLock.value.release?.()
    } catch {
      // Ignore browser-specific release failures.
    } finally {
      wakeLock.value = null
      wakeLockActive.value = false
    }
  }

  async function enterFullscreen() {
    if (!import.meta.client || !fullscreenSupported.value || document.fullscreenElement) return
    try {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions)
    } catch {
      // Fullscreen usually requires a user gesture; kiosk still works without it.
    } finally {
      fullscreenActive.value = !!document.fullscreenElement
    }
  }

  async function exitFullscreen() {
    if (!import.meta.client || !document.fullscreenElement) {
      fullscreenActive.value = false
      return
    }
    try {
      await document.exitFullscreen()
    } catch {
      // Keep kiosk exit independent from browser fullscreen state.
    } finally {
      fullscreenActive.value = !!document.fullscreenElement
    }
  }

  async function setKioskMode(next: boolean, options: { fullscreen?: boolean } = {}) {
    if (forcedKioskMode.value) {
      kioskMode.value = true
      if (options.fullscreen !== false) await enterFullscreen()
      await requestWakeLock()
      return
    }

    kioskMode.value = next
    storage.write('ha-kiosk-mode', String(kioskMode.value))

    if (kioskMode.value) {
      if (options.fullscreen !== false) await enterFullscreen()
      await requestWakeLock()
    } else {
      await releaseWakeLock()
      await exitFullscreen()
    }
  }

  function togglePerformanceMode() {
    if (forcedPerformanceMode.value != null) return
    performanceMode.value = !performanceMode.value
    storage.write('ha-performance-mode', String(performanceMode.value))
  }

  function toggleKioskMode(options: { fullscreen?: boolean } = {}) {
    void setKioskMode(!kioskMode.value, options)
  }

  function setDeviceOverride(value: DeviceOverride) {
    deviceOverride.value = value
    if (value === 'auto') storage.remove('ha-device-type')
    else storage.write('ha-device-type', value)
  }

  if (import.meta.client && !listenersReady.value) {
    listenersReady.value = true
    document.addEventListener('fullscreenchange', () => {
      fullscreenActive.value = !!document.fullscreenElement
    })
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && kioskMode.value) void requestWakeLock()
    })
    watch(kioskMode, (active) => {
      if (active) void requestWakeLock()
      else void releaseWakeLock()
    }, { immediate: true })
    watch(forcedKioskMode, (forced) => {
      if (forced) void setKioskMode(true, { fullscreen: false })
    }, { immediate: true })
  }

  return {
    performanceMode,
    kioskMode,
    forcedKioskMode,
    forcedPerformanceMode,
    wakeLockActive,
    wakeLockSupported,
    fullscreenActive,
    fullscreenSupported,
    deviceOverride,
    forcedDeviceType,
    setKioskMode,
    togglePerformanceMode,
    toggleKioskMode,
    setDeviceOverride,
  }
}
