export const SERVER_STARTUP_ID = Date.now().toString()

type SendFn = (data: object) => void
const clients = new Set<SendFn>()

export const serverBus = {
  addClient(fn: SendFn) { clients.add(fn) },
  removeClient(fn: SendFn) { clients.delete(fn) },
  broadcast(data: object) {
    for (const fn of clients) {
      try { fn(data) } catch { clients.delete(fn) }
    }
  },
}
