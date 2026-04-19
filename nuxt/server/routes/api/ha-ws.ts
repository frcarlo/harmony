import { WebSocket } from 'ws'

// Map peer.id → HA WebSocket connection
const haConnections = new Map<string, WebSocket>()

export default defineWebSocketHandler({
  open(peer) {
    const config = useRuntimeConfig()
    const haUrl = config.haUrl ?? 'http://localhost:8123'
    const haWsUrl = haUrl.replace(/^http/, 'ws') + '/api/websocket'
    const haToken = config.haToken ?? ''

    const haWs = new WebSocket(haWsUrl)
    haConnections.set(peer.id, haWs)

    haWs.on('message', (data: Buffer) => {
      try {
        peer.send(data.toString())
      } catch {
        // client disconnected
      }
    })

    haWs.on('close', (code: number, reason: Buffer) => {
      haConnections.delete(peer.id)
      try {
        peer.close(code, reason.toString())
      } catch {
        // already closed
      }
    })

    haWs.on('error', (err: Error) => {
      console.error('[HA Proxy] HA WebSocket error:', err.message)
      haConnections.delete(peer.id)
      try {
        peer.close(1011, 'HA connection error')
      } catch {
        // already closed
      }
    })

    // Store token reference for auth interception
    ;(haWs as WebSocket & { _haToken: string })._haToken = haToken
  },

  message(peer, message) {
    const haWs = haConnections.get(peer.id) as (WebSocket & { _haToken: string }) | undefined
    if (!haWs || haWs.readyState !== WebSocket.OPEN) return

    try {
      const msg = JSON.parse(message.text())
      // Inject server-side HA token, replacing any browser-sent token
      if (msg.type === 'auth') {
        msg.access_token = haWs._haToken
      }
      haWs.send(JSON.stringify(msg))
    } catch {
      haWs.send(message.text())
    }
  },

  close(peer) {
    const haWs = haConnections.get(peer.id)
    if (haWs) {
      haConnections.delete(peer.id)
      if (haWs.readyState === WebSocket.OPEN) {
        haWs.close()
      }
    }
  },

  error(peer, error) {
    console.error('[HA Proxy] Client error:', error)
    const haWs = haConnections.get(peer.id)
    if (haWs) {
      haConnections.delete(peer.id)
      haWs.close()
    }
  },
})
