const http = require('node:http')
const { connect } = require('@nats-io/transport-node')

const requireEnv = name => {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const requirePositiveIntegerEnv = name => {
  const value = Number(requireEnv(name))
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`)
  }
  return value
}

const PORT = requirePositiveIntegerEnv('PORT')
const NATS_URL = requireEnv('NATS_URL')
const NATS_SUBJECT = requireEnv('NATS_SUBJECT')
const NATS_QUEUE_GROUP = requireEnv('NATS_QUEUE_GROUP')
const INSTANCE = process.env.HOSTNAME || `broadcaster-${process.pid}`
const BROADCASTER_MODE = process.env.BROADCASTER_MODE || 'discord'

let webhookUrl
let webhookTimeoutMs
if (BROADCASTER_MODE === 'discord') {
  webhookTimeoutMs = requirePositiveIntegerEnv('WEBHOOK_TIMEOUT_MS')
  const url = requireEnv('DISCORD_WEBHOOK_URL')
  try {
    webhookUrl = new URL(url)
    if (!['http:', 'https:'].includes(webhookUrl.protocol)) throw new Error()
    webhookUrl.searchParams.set('wait', 'true')
  } catch {
    throw new Error('DISCORD_WEBHOOK_URL must be an HTTP or HTTPS URL')
  }
} else if (BROADCASTER_MODE !== 'log') {
  throw new Error('BROADCASTER_MODE must be discord or log')
}

let connection
let subscription
let consumption
let ready = false
let stopping = false

const log = (event, details = {}) => {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), instance: INSTANCE, event, ...details }))
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || !['/healthz', '/readyz'].includes(req.url)) {
    res.writeHead(404).end()
    return
  }
  const healthy = req.url === '/healthz' ||
    (ready && !stopping && connection && !connection.isClosed() && !connection.isDraining())
  res.writeHead(healthy ? 200 : 503, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: healthy ? 'ok' : 'unavailable' }))
})

const isTodoEvent = event =>
  event &&
  typeof event.eventId === 'string' &&
  ['todo.created', 'todo.updated'].includes(event.type) &&
  typeof event.timestamp === 'string' &&
  event.todo && typeof event.todo.id === 'string' &&
  typeof event.todo.todo === 'string' && typeof event.todo.done === 'boolean'

const handleMessage = async message => {
  if (BROADCASTER_MODE === 'log') {
    log('nats_message', { subject: message.subject, message: message.string() })
    return
  }

  let event
  try {
    event = message.json()
    if (!isTodoEvent(event)) throw new Error()
  } catch {
    log('invalid_event_dropped')
    return
  }

  const action = event.type === 'todo.created' ? 'created' : 'updated'
  const content = [
    `Todo #${event.todo.id} ${action}`,
    event.todo.todo.slice(0, 1400),
    `Status: ${event.todo.done ? 'Done' : 'Pending'}`,
    `Event: ${event.eventId}`,
  ].join('\n')

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
      redirect: 'error',
      signal: AbortSignal.timeout(webhookTimeoutMs),
    })
    await response.body?.cancel()
    log(response.ok ? 'notification_forwarded' : 'notification_dropped', {
      eventId: event.eventId,
      status: response.status,
    })
  } catch {
    log('notification_dropped', { eventId: event.eventId, reason: 'Webhook request failed or timed out' })
  }
}

const shutdown = async (exitCode = 0) => {
  if (stopping) return
  stopping = true
  ready = false
  const deadline = setTimeout(() => process.exit(exitCode), 10000)
  deadline.unref()
  try {
    if (subscription) await subscription.drain()
    if (consumption) await consumption
    if (connection && !connection.isClosed()) await connection.drain()
  } catch {
    log('shutdown_drain_incomplete')
  } finally {
    server.close(() => process.exit(exitCode))
    server.closeIdleConnections()
  }
}

const main = async () => {
  server.listen(PORT)
  connection = await connect({
    servers: NATS_URL,
    name: INSTANCE,
    waitOnFirstConnect: true,
    maxReconnectAttempts: -1,
    reconnectTimeWait: 1000,
  })
  if (stopping) {
    await connection.close()
    return
  }
  ;(async () => {
    for await (const status of connection.status()) {
      if (status.type === 'disconnect') ready = false
      if (status.type === 'reconnect' && !stopping) {
        try {
          await connection.flush()
          ready = !stopping
        } catch {
          ready = false
        }
      }
    }
  })().catch(() => { ready = false })

  subscription = connection.subscribe(NATS_SUBJECT, { queue: NATS_QUEUE_GROUP })
  consumption = (async () => {
    for await (const message of subscription) await handleMessage(message)
  })()
  consumption.catch(() => {
    ready = false
    log('nats_subscription_failed')
    shutdown(1)
  })
  await connection.flush()
  ready = !stopping
  log('subscribed', { subject: NATS_SUBJECT, queue: NATS_QUEUE_GROUP })

  const error = await connection.closed()
  ready = false
  if (!stopping) {
    log('nats_connection_closed', { failed: Boolean(error) })
    await shutdown(1)
  }
}

process.on('SIGTERM', () => shutdown())
process.on('SIGINT', () => shutdown())
server.on('error', () => {
  log('health_server_error')
  shutdown(1)
})
main().catch(() => {
  log('broadcaster_startup_failed')
  shutdown(1)
})
