import type { NotificationRule } from '~/types/dashboard'

interface ActiveNotification {
  rule: NotificationRule
  triggeredAt: number
}

const DISMISS_MS = 15_000

const rules = ref<NotificationRule[]>([])
const active = ref<ActiveNotification | null>(null)
const lastFired = new Map<string, number>()

let initialized = false
let dismissTimer: ReturnType<typeof setTimeout> | null = null

export function useNotificationRules() {
  const entityStore = useEntityStore()

  function isEnabledLocally(id: string): boolean {
    if (import.meta.server) return false
    const val = localStorage.getItem(`notif_enabled_${id}`)
    return val === 'true'
  }

  function setEnabledLocally(id: string, enabled: boolean) {
    localStorage.setItem(`notif_enabled_${id}`, String(enabled))
  }

  async function loadRules() {
    rules.value = await $fetch<NotificationRule[]>('/api/notification-rules')
  }

  async function createRule(data: Omit<NotificationRule, 'id' | 'created_at'>) {
    const rule = await $fetch<NotificationRule>('/api/notification-rules', { method: 'POST', body: data })
    rules.value.push(rule)
    return rule
  }

  async function updateRule(id: string, data: Omit<NotificationRule, 'id' | 'created_at'>) {
    await $fetch(`/api/notification-rules/${id}`, { method: 'PUT', body: data })
    const idx = rules.value.findIndex((r) => r.id === id)
    if (idx >= 0) rules.value[idx] = { ...rules.value[idx], ...data }
  }

  async function deleteRule(id: string) {
    await $fetch(`/api/notification-rules/${id}`, { method: 'DELETE' })
    rules.value = rules.value.filter((r) => r.id !== id)
    localStorage.removeItem(`notif_enabled_${id}`)
  }

  function dismiss() {
    if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
    active.value = null
  }

  function startWatcher() {
    if (initialized) return
    initialized = true

    // Manual prev-state map avoids relying on Vue's deep-watch old-value tracking,
    // which can silently fail when the computed returns a new plain object each run.
    const prevStates = new Map<string, { state: string; last_updated: string }>()
    let firstRun = true

    watchEffect(() => {
      // Build current snapshot (tracks reactive deps on each accessed entity)
      const snapshot: Record<string, { state: string; last_updated: string }> = {}
      for (const rule of rules.value) {
        const e = entityStore.entities[rule.trigger_entity_id]
        if (e) snapshot[rule.trigger_entity_id] = { state: e.state, last_updated: e.last_updated ?? '' }
      }

      if (firstRun) {
        firstRun = false
        for (const [id, val] of Object.entries(snapshot)) prevStates.set(id, { ...val })
        return
      }

      const now = Date.now()
      for (const rule of rules.value) {
        if (!isEnabledLocally(rule.id)) continue
        const curr = snapshot[rule.trigger_entity_id]
        const prev = prevStates.get(rule.trigger_entity_id)
        if (!curr || !prev) continue

        const isEventDomain = rule.trigger_entity_id.startsWith('event.')
        let fired = false

        if (isEventDomain) {
          fired = curr.last_updated !== prev.last_updated &&
            (!rule.trigger_state || curr.state === rule.trigger_state)
        } else {
          fired = curr.state === rule.trigger_state && prev.state !== rule.trigger_state
        }

        if (fired) {
          const last = lastFired.get(rule.id) ?? 0
          if (now - last >= rule.cooldown_seconds * 1000) {
            lastFired.set(rule.id, now)
            if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null }
            active.value = { rule, triggeredAt: now }
            dismissTimer = setTimeout(() => dismiss(), DISMISS_MS)
            $fetch('/api/notification-log', {
              method: 'POST',
              body: {
                rule_id: rule.id,
                rule_name: rule.name,
                entity_id: rule.trigger_entity_id,
                entity_state: entityStore.entities[rule.trigger_entity_id]?.state ?? '',
                triggered_at: new Date(now).toISOString(),
              },
            }).catch(() => {})
          }
        }
      }

      // Update prevStates after evaluating all rules
      for (const [id, val] of Object.entries(snapshot)) prevStates.set(id, { ...val })
      for (const id of prevStates.keys()) { if (!snapshot[id]) prevStates.delete(id) }
    })
  }

  return {
    rules: readonly(rules),
    active: readonly(active),
    loadRules,
    createRule,
    updateRule,
    deleteRule,
    isEnabledLocally,
    setEnabledLocally,
    dismiss,
    startWatcher,
  }
}
