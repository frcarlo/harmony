export const SERVER_STARTUP_ID = Date.now().toString()

type SendFn = (data: object) => void
const clients = new Map<SendFn, string | null>()

export const serverBus = {
  addClient(fn: SendFn, userId: string | null = null) { clients.set(fn, userId) },
  removeClient(fn: SendFn) { clients.delete(fn) },
  broadcast(data: object, excludeUserId?: string) {
    for (const [fn, userId] of clients) {
      if (excludeUserId && userId === excludeUserId) continue
      try { fn(data) } catch { clients.delete(fn) }
    }
  },
}
