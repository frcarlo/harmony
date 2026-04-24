const USER_PREF_PREFIX = 'ha:user'

export function buildUserPreferenceKey(baseKey: string, userId?: string | null) {
  return userId ? `${USER_PREF_PREFIX}:${userId}:${baseKey}` : baseKey
}

export function useUserPreferenceStorage() {
  const { user, loggedIn } = useUserSession()
  const currentUserId = computed(() => loggedIn.value ? (user.value?.id ?? null) : null)

  function key(baseKey: string) {
    return buildUserPreferenceKey(baseKey, currentUserId.value)
  }

  function read(baseKey: string, fallback: string | null = null) {
    if (import.meta.server) return fallback
    return localStorage.getItem(key(baseKey)) ?? fallback
  }

  function write(baseKey: string, value: string) {
    if (import.meta.server) return
    localStorage.setItem(key(baseKey), value)
  }

  function remove(baseKey: string) {
    if (import.meta.server) return
    localStorage.removeItem(key(baseKey))
  }

  function readNotification(ruleId: string) {
    return read(`notif_enabled_${ruleId}`)
  }

  function writeNotification(ruleId: string, value: boolean) {
    write(`notif_enabled_${ruleId}`, String(value))
  }

  function removeNotification(ruleId: string) {
    remove(`notif_enabled_${ruleId}`)
  }

  function clearCurrentUserSettings() {
    if (import.meta.server) return

    for (const baseKey of ['ha-theme', 'ha-glass', 'ha-widget-borders', 'ha-locale']) {
      localStorage.removeItem(key(baseKey))
    }

    const notifPrefix = buildUserPreferenceKey('notif_enabled_', currentUserId.value)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const storageKey = localStorage.key(i)
      if (storageKey?.startsWith(notifPrefix)) localStorage.removeItem(storageKey)
    }
  }

  return {
    currentUserId,
    key,
    read,
    write,
    remove,
    readNotification,
    writeNotification,
    removeNotification,
    clearCurrentUserSettings,
  }
}
