export default defineEventHandler((event) => {
  const res = event.node.res

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  serverBus.addClient(send)
  send({ type: 'init', startupId: SERVER_STARTUP_ID })

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000)

  res.on('close', () => {
    clearInterval(keepAlive)
    serverBus.removeClient(send)
  })
})
