import type { HAState, HAWSMessage, HAServiceCall, BrowseMediaNode, HAArea, HAEntityRegistryEntry, HADeviceRegistryEntry, HALabel } from '~/types/ha'

type StateCallback = (state: HAState) => void
type VoidCallback = () => void

class HAWebSocketClient {
  private ws: WebSocket | null = null
  private msgId = 1
  private authenticated = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private maxReconnectDelay = 30000

  private globalStateCallback: StateCallback | null = null
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private subscriptions = new Map<number, (event: unknown) => void>()
  private onConnectCallbacks = new Set<VoidCallback>()
  private onDisconnectCallbacks = new Set<VoidCallback>()

  private url = ''

  connect(url: string): void {
    this.url = url
    this._connect()
  }

  private _connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    try {
      this.ws = new WebSocket(this.url)
    } catch (e) {
      console.error('[HA WS] Failed to create WebSocket:', e)
      this._scheduleReconnect()
      return
    }

    this.ws.onmessage = (event) => {
      const msg: HAWSMessage = JSON.parse(event.data)
      this._handleMessage(msg)
    }
    this.ws.onerror = () => console.error('[HA WS] Connection error')
    this.ws.onclose = () => {
      console.warn('[HA WS] Disconnected')
      this.authenticated = false
      this.onDisconnectCallbacks.forEach((cb) => cb())
      this._scheduleReconnect()
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      console.log('[HA WS] Reconnecting...')
      this._connect()
    }, this.reconnectDelay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  private _send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private _sendWithId(msg: object): number {
    const id = this.msgId++
    this._send({ ...msg, id })
    return id
  }

  private _call(msg: object): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this._sendWithId(msg)
      this.pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error('Timeout'))
        }
      }, 10000)
    })
  }

  private _handleMessage(msg: HAWSMessage): void {
    if (msg.type === 'auth_required') {
      // Token is handled by the server proxy — send empty auth
      this._send({ type: 'auth', access_token: '' })
      return
    }
    if (msg.type === 'auth_ok') {
      console.log('[HA WS] Authenticated')
      this.authenticated = true
      this.reconnectDelay = 1000
      this.onConnectCallbacks.forEach((cb) => cb())
      this._sendWithId({ type: 'subscribe_events', event_type: 'state_changed' })
      return
    }
    if (msg.type === 'auth_invalid') {
      console.error('[HA WS] Auth invalid')
      return
    }
    if (msg.type === 'result') {
      const pending = this.pending.get(msg.id)
      if (pending) {
        this.pending.delete(msg.id)
        if (msg.success) pending.resolve(msg.result)
        else pending.reject(new Error(msg.error?.message ?? 'Unknown error'))
      }
      return
    }
    if (msg.type === 'event') {
      // Check subscription callbacks first
      const sub = this.subscriptions.get(msg.id)
      if (sub) { sub((msg as any).event); return }

      const ev = (msg as { event: { event_type?: string; data?: { entity_id?: string; new_state?: HAState } } }).event
      if (ev?.event_type === 'state_changed' && ev.data?.new_state && this.globalStateCallback) {
        this.globalStateCallback(ev.data.new_state)
      }
    }
  }

  onConnect(cb: VoidCallback): () => void {
    this.onConnectCallbacks.add(cb)
    return () => this.onConnectCallbacks.delete(cb)
  }

  onDisconnect(cb: VoidCallback): () => void {
    this.onDisconnectCallbacks.add(cb)
    return () => this.onDisconnectCallbacks.delete(cb)
  }

  onStateChange(cb: StateCallback): () => void {
    this.globalStateCallback = cb
    return () => { this.globalStateCallback = null }
  }

  async getStates(): Promise<HAState[]> {
    return this._call({ type: 'get_states' }) as Promise<HAState[]>
  }

  async getAreas(): Promise<HAArea[]> {
    return this._call({ type: 'config/area_registry/list' }) as Promise<HAArea[]>
  }

  async getEntityRegistry(): Promise<HAEntityRegistryEntry[]> {
    return this._call({ type: 'config/entity_registry/list' }) as Promise<HAEntityRegistryEntry[]>
  }

  async getDeviceRegistry(): Promise<HADeviceRegistryEntry[]> {
    return this._call({ type: 'config/device_registry/list' }) as Promise<HADeviceRegistryEntry[]>
  }

  async getLabelRegistry(): Promise<HALabel[]> {
    return this._call({ type: 'config/label_registry/list' }) as Promise<HALabel[]>
  }

  async callService(call: HAServiceCall): Promise<void> {
    await this._call({
      type: 'call_service',
      domain: call.domain,
      service: call.service,
      service_data: call.service_data,
      target: call.target,
    })
  }

  async callServiceWithResponse<T = unknown>(call: HAServiceCall): Promise<T> {
    const result = await this._call({
      type: 'call_service',
      domain: call.domain,
      service: call.service,
      service_data: call.service_data,
      target: call.target,
      return_response: true,
    }) as { response?: T } | T
    // HA wraps service response in { response: ..., context: ... }
    if (result && typeof result === 'object' && 'response' in result) {
      return (result as { response: T }).response
    }
    return result as T
  }

  async getCameraStreamUrl(entityId: string): Promise<string> {
    const result = await this._call({ type: 'camera/stream', entity_id: entityId }) as { url: string }
    return result.url
  }

  subscribeWebRTC(
    entityId: string,
    offer: string,
    onMessage: (msg: { type: string; answer?: string; candidate?: RTCIceCandidateInit }) => void,
  ): () => void {
    const id = this.msgId++
    this.subscriptions.set(id, onMessage as (e: unknown) => void)
    this._send({ id, type: 'camera/webrtc/offer', entity_id: entityId, offer })
    return () => {
      this.subscriptions.delete(id)
      this._send({ id: this.msgId++, type: 'unsubscribe_events', subscription: id })
    }
  }

  async browseMedia(entityId: string, mediaContentType?: string, mediaContentId?: string): Promise<BrowseMediaNode> {
    const msg: Record<string, unknown> = { type: 'media_player/browse_media', entity_id: entityId }
    if (mediaContentType) msg.media_content_type = mediaContentType
    if (mediaContentId) msg.media_content_id = mediaContentId
    return this._call(msg) as Promise<BrowseMediaNode>
  }

  get isConnected(): boolean {
    return this.authenticated
  }
}

let _client: HAWebSocketClient | null = null

export function useHAClient(): HAWebSocketClient {
  if (!_client) _client = new HAWebSocketClient()
  return _client
}
