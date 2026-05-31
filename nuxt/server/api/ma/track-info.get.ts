import { maCall } from '~/server/utils/ma-api'

// Look up a track by its Spotify URI (spotify:track:TRACKID)
// Returns { name, artist, album, uri } or null
export default defineEventHandler(async (event) => {
  const { uri } = getQuery(event) as { uri?: string }
  if (!uri) throw createError({ statusCode: 400, statusMessage: 'uri required' })

  // spotify:track:TRACKID → item_id=TRACKID, provider=spotify
  const parts = uri.split(':')
  if (parts.length < 3) return null
  const [provider, , item_id] = parts

  try {
    const track = await maCall('music/track', {
      item_id,
      provider_instance_id_or_domain: provider,
    }, 8_000) as Record<string, unknown> | null
    if (!track) return null

    const artists = track.artists as Array<{ name: string }> | undefined
    const album = track.album as { name: string } | undefined
    return {
      name: track.name as string,
      artist: artists?.[0]?.name,
      album: album?.name,
      uri: track.uri as string | undefined,
    }
  } catch {
    return null
  }
})
