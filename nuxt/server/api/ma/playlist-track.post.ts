import { maCall } from '~/server/utils/ma-api'

export default defineEventHandler(async (event) => {
  const { action, playlist_uri, track_uri, position } = await readBody(event) as {
    action: 'add' | 'remove'
    playlist_uri: string
    track_uri?: string
    position?: number
  }

  // Extract db_playlist_id — must be the MA integer ID, e.g. from "library://playlist/58"
  const db_playlist_id = playlist_uri.split('/').pop() ?? playlist_uri

  if (action === 'add') {
    return maCall('music/playlists/add_playlist_tracks', {
      db_playlist_id,
      uris: [track_uri],
    }, 15_000)
  } else {
    return maCall('music/playlists/remove_playlist_tracks', {
      db_playlist_id,
      positions_to_remove: [position ?? 0],
    }, 15_000)
  }
})
