const { randomUUID } = require('node:crypto')
const { connect } = require('@nats-io/transport-node')

const createTodoPublisher = ({ servers, subject }) => {
  let connection
  let stopping = false

  const connectToNats = async () => {
    try {
      connection = await connect({
        servers,
        name: 'todo-backend',
        timeout: 2_000,
        reconnect: true,
        waitOnFirstConnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2_000,
      })
      if (stopping) {
        await connection.close()
        return
      }
      console.log('Connected to NATS for todo events')
      const error = await connection.closed()
      if (error && !stopping) {
        console.warn(`NATS connection closed: ${error.message}`)
      }
    } catch (error) {
      if (!stopping) {
        console.warn(`Failed to connect to NATS: ${error.message}`)
      }
    }
  }

  connectToNats()

  return {
    publish(type, todo) {
      const event = {
        eventId: randomUUID(),
        type,
        timestamp: new Date().toISOString(),
        todo,
      }
      if (stopping || !connection || connection.isClosed() || connection.isDraining()) {
        console.warn(`Dropped ${type} event ${event.eventId}: NATS is unavailable`)
        return
      }
      try {
        connection.publish(subject, JSON.stringify(event))
      } catch (error) {
        console.warn(`Dropped ${type} event ${event.eventId}: ${error.message}`)
      }
    },
    async close() {
      stopping = true
      if (!connection || connection.isClosed()) return

      let timeout
      try {
        await Promise.race([
          connection.drain(),
          new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('NATS drain timed out')), 5_000)
          }),
        ])
      } catch (error) {
        console.warn(`NATS drain failed; forcing connection closed: ${error.message}`)
        await connection.close()
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}

module.exports = { createTodoPublisher }
