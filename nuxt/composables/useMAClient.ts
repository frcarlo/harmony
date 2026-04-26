import type { MASearchResult, MAItem } from '~/server/utils/ma-api'

interface MAStatus { available: boolean; url: string; configured: boolean }

export interface MAPlayer { player_id: string; display_name: string; available: boolean }

const _available = ref<boolean | null>(null)
const _maUrl = ref('')

export function useMAClient() {
  async function checkStatus(force = false): Promise<MAStatus> {
    if (_available.value !== null && !force) return { available: _available.value, url: _maUrl.value, configured: true }
    try {
      const status = await $fetch<{ available: boolean; url: string }>('/api/ma/status')
      _available.value = status.available
      _maUrl.value = status.url ?? ''
    } catch {
      _available.value = false
    }
    return { available: _available.value!, url: _maUrl.value, configured: true }
  }

  async function getPlayers(): Promise<MAPlayer[]> {
    try {
      const raw = await $fetch<unknown>('/api/ma/players')
      return Array.isArray(raw) ? raw as MAPlayer[] : []
    } catch {
      return []
    }
  }

  async function playViaMA(playerId: string, uri: string, mediaType: string): Promise<void> {
    await $fetch('/api/ma/play', {
      method: 'POST',
      body: { player_id: playerId, uri, media_type: mediaType },
    })
  }

  async function search(query: string): Promise<MASearchResult> {
    return $fetch<MASearchResult>('/api/ma/search', { query: { q: query } })
  }

  async function getRecentlyPlayed(limit = 12): Promise<MAItem[]> {
    return $fetch<MAItem[]>('/api/ma/recent', { query: { limit } })
  }

  function maImageUrl(item: MAItem): string | undefined {
    const path = item.image?.path
    if (!path) return undefined
    if (path.startsWith('http')) return path
    return _maUrl.value ? `${_maUrl.value}${path}` : undefined
  }

  const isAvailable = computed(() => _available.value ?? false)

  return { checkStatus, search, getRecentlyPlayed, getPlayers, playViaMA, maImageUrl, isAvailable }
}

export type { MASearchResult, MAItem }
