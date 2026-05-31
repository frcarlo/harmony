import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { player_id } = getQuery(event) as { player_id?: string }

  // If a specific player_id is requested, use it directly
  if (player_id) {
    try {
      const raw = await maCall('player_queues/items', { queue_id: player_id, limit: 100, offset: 0 }, 10_000)
      if (Array.isArray(raw) && raw.length > 0) return { player_id, items: raw }
    } catch { /* fall through */ }
  }

  // Try all available players — prefer playing/paused, fall back to most items
  try {
    const players = await maCall('players/all') as Array<{ player_id: string; available: boolean; state?: string }>
    const available = players.filter(p => p.available && p.player_id !== player_id)

    // Sort: playing > paused > other
    const sorted = [...available].sort((a, b) => {
      const rank = (s?: string) => s === 'playing' ? 0 : s === 'paused' ? 1 : 2
      return rank(a.state) - rank(b.state)
    })

    let bestId = ''
    let best: unknown[] = []
    for (const p of sorted) {
      try {
        const raw = await maCall('player_queues/items', { queue_id: p.player_id, limit: 100, offset: 0 }, 5_000)
        if (Array.isArray(raw) && raw.length > 0) {
          // Take the first playing/paused player with items, otherwise keep longest queue
          if (p.state === 'playing' || p.state === 'paused') {
            return { player_id: p.player_id, items: raw }
          }
          if (raw.length > best.length) {
            best = raw
            bestId = p.player_id
          }
        }
      } catch { /* skip */ }
    }
    return { player_id: bestId, items: best }
  } catch {
    return { player_id: '', items: [] }
  }
})
