import { useRuntimeConfig } from '#imports'

let _msgId = 1

export interface MASearchResult {
  tracks: MAItem[]
  albums: MAItem[]
  artists: MAItem[]
  playlists: MAItem[]
  radio: MAItem[]
}

export interface MAItemImage {
  type: string
  path: string
  provider: string
  remotely_accessible?: boolean
}

export interface MAItem {
  item_id: string
  provider: string
  name: string
  media_type: string
  uri: string
  image?: { path: string; provider: string } | null
  metadata?: { images?: MAItemImage[] } | null
  artists?: Array<{ name: string }>
  album?: { name: string }
  duration?: number
}

function getConfig() {
  const config = getServerConfig()
  const explicit = config.maUrl
  const token = config.maToken
  if (explicit) return { url: explicit, token, configured: true }

  // Derive MA URL from HA URL — same host, port 8095
  const haUrl = (config.haUrl as string) || 'http://homeassistant.local:8123'
  try {
    const parsed = new URL(haUrl)
    parsed.port = '8095'
    parsed.pathname = ''
    return { url: parsed.origin, token, configured: false }
  } catch {
    return { url: 'http://homeassistant.local:8095', token, configured: false }
  }
}

export async function maCall(command: string, args: Record<string, unknown> = {}, timeout = 10_000): Promise<unknown> {
  const { url, token } = getConfig()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body = { message_id: _msgId++, command, args }
  let res: Record<string, unknown>
  try {
    res = await $fetch<Record<string, unknown>>(`${url}/api`, {
      method: 'POST',
      headers,
      body,
      timeout,
      redirect: 'error',
    })
  } catch (e: unknown) {
    // Extract MA's actual error body from HTTP 4xx/5xx responses
    const data = (e as { data?: unknown })?.data
    if (data && typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>
      const msg = d.message ?? d.error ?? JSON.stringify(d)
      throw new Error(`MA error (${command}): ${msg}`)
    }
    throw e
  }
  if (!res) return null
  if (res.error && typeof res.error === 'object' && res.error !== null && 'message' in res.error)
    throw new Error((res.error as { message: string }).message)
  if (res.error === true) throw new Error(String(res.message ?? 'Unknown MA error'))
  // MA may return result directly or nested under 'result'
  return res.result !== undefined ? res.result : res
}

export async function maStatus(): Promise<{ available: boolean; auth_required: boolean; url: string; configured: boolean }> {
  const { url, configured } = getConfig()
  try {
    await maCall('music/recently_played_items', { limit: 1 })
    return { available: true, auth_required: false, url, configured }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const isAuth = msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized') || msg.includes('Forbidden')
    const isReachable = isAuth || msg.includes('400') || msg.includes('500')
    return { available: isReachable, auth_required: isAuth, url, configured }
  }
}

export async function maSearch(query: string, limit = 25): Promise<MASearchResult> {
  const raw = await maCall('music/search', {
    search_query: query,
    media_types: ['track', 'album', 'artist', 'playlist', 'radio'],
    limit,
    library_only: false,
  }, 10_000)

  // MA may return { tracks: [...], albums: [...] } directly or wrapped
  const result = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, MAItem[]>
    : {}

  return {
    tracks: result.tracks ?? [],
    albums: result.albums ?? [],
    artists: result.artists ?? [],
    playlists: result.playlists ?? [],
    radio: result.radio ?? [],
  }
}

export async function maRecentlyPlayed(limit = 12): Promise<MAItem[]> {
  const raw = await maCall('music/recently_played_items', { limit }, 20_000)
  return Array.isArray(raw) ? raw as MAItem[] : []
}

export async function maLibraryItems(mediaType: string, limit = 200): Promise<MAItem[]> {
  // music/library_items is not supported in MA 2.8.x — use search with library_only instead
  const raw = await maCall('music/search', {
    search_query: '',
    media_types: [mediaType],
    limit,
    library_only: true,
  }, 20_000)
  const result = (raw && typeof raw === 'object' && !Array.isArray(raw))
    ? raw as Record<string, MAItem[]>
    : {}
  // Result key is plural: playlist→playlists, track→tracks, etc.
  const key = mediaType.endsWith('s') ? mediaType : `${mediaType}s`
  return result[key] ?? []
}
