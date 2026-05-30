export default defineEventHandler(async (event) => {
  const q = getQuery(event) as { track?: string; artist?: string; album?: string; duration?: string }
  if (!q.track || !q.artist) throw createError({ statusCode: 400, statusMessage: 'Missing track or artist' })

  const params = new URLSearchParams({ track_name: q.track, artist_name: q.artist })
  if (q.album) params.set('album_name', q.album)
  if (q.duration) params.set('duration', q.duration)

  try {
    const data = await $fetch<{ syncedLyrics?: string; plainLyrics?: string } | null>(
      `https://lrclib.net/api/get?${params}`,
      { headers: { 'Lrclib-Client': 'HArmony (https://github.com/frcarlo/harmony)' } }
    )
    return data ?? null
  } catch {
    return null
  }
})
