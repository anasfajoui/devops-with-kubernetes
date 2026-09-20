const http = require('http')
const { Pool } = require('pg')

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
const MAX_TODO_LENGTH = requirePositiveIntegerEnv('MAX_TODO_LENGTH')
const MAX_REQUEST_BODY_LENGTH = requirePositiveIntegerEnv('MAX_REQUEST_BODY_LENGTH')
const pool = new Pool({
  host: requireEnv('PGHOST'),
  port: requirePositiveIntegerEnv('PGPORT'),
  database: requireEnv('PGDATABASE'),
  user: requireEnv('PGUSER'),
  password: requireEnv('PGPASSWORD'),
})
const INITIAL_TODOS = [
  'Learn Kubernetes basics',
  'Deploy the application to the cluster',
  'Configure persistent volumes',
]

let databaseInitialization

const initializeDatabase = () => {
  if (!databaseInitialization) {
    databaseInitialization = (async () => {
      const client = await pool.connect()

      try {
        await client.query('BEGIN')
        await client.query(`
          CREATE TABLE IF NOT EXISTS todos (
            id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            todo TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `)
        await client.query(`
          CREATE TABLE IF NOT EXISTS application_metadata (
            key TEXT PRIMARY KEY
          )
        `)

        const seedClaim = await client.query(`
          INSERT INTO application_metadata (key)
          VALUES ('initial-todos-created')
          ON CONFLICT (key) DO NOTHING
          RETURNING key
        `)

        if (seedClaim.rowCount === 1) {
          await client.query(
            'INSERT INTO todos (todo) SELECT unnest($1::text[])',
            [INITIAL_TODOS]
          )
        }

        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    })().catch(error => {
      databaseInitialization = undefined
      throw error
    })
  }

  return databaseInitialization
}

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readJsonBody = req =>
  new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk
      if (body.length > MAX_REQUEST_BODY_LENGTH) {
        reject(new Error('Request body is too large'))
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Request body must be valid JSON'))
      }
    })
    req.on('error', reject)
  })

const handleRequest = async (req, res) => {
  const requestPath = req.url.split('?')[0]

  if (requestPath === '/todos/shutdown' && req.method === 'POST') {
    sendJson(res, 202, {
      message: 'Todo Backend is shutting down. Kubernetes will restart it.',
    })
    setImmediate(() => {
      console.log('Test shutdown requested, shutting down')
      server.close(() => process.exit(0))
    })
    return
  }

  if (requestPath !== '/todos') {
    sendJson(res, 404, { error: 'Not Found' })
    return
  }

  if (req.method === 'GET') {
    await initializeDatabase()
    const result = await pool.query('SELECT todo FROM todos ORDER BY id')
    sendJson(res, 200, result.rows.map(row => row.todo))
    return
  }

  if (req.method === 'POST') {
    let requestBody

    try {
      requestBody = await readJsonBody(req)
    } catch (error) {
      sendJson(res, 400, { error: error.message })
      return
    }

    const todo = typeof requestBody.todo === 'string' ? requestBody.todo.trim() : ''

    if (!todo) {
      sendJson(res, 400, { error: 'Todo must not be empty' })
      return
    }

    if (todo.length > MAX_TODO_LENGTH) {
      sendJson(res, 400, {
        error: `Todo must not exceed ${MAX_TODO_LENGTH} characters`,
      })
      return
    }

    await initializeDatabase()
    const result = await pool.query(
      'INSERT INTO todos (todo) VALUES ($1) RETURNING todo',
      [todo]
    )
    sendJson(res, 201, result.rows[0])
    return
  }

  res.writeHead(405, {
    Allow: 'GET, POST',
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify({ error: 'Method Not Allowed' }))
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error(`Failed to process request for ${req.url}:`, error)
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal Server Error' })
    } else {
      res.end()
    }
  })
})

server.listen(PORT, () => {
  console.log(`Todo backend listening on port ${PORT}`)
})
