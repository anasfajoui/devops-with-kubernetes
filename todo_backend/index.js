const http = require('http')

const PORT = process.env.PORT || 3000
const MAX_TODO_LENGTH = 140
const todos = [
  'Learn Kubernetes basics',
  'Deploy the application to the cluster',
  'Configure persistent volumes',
]

const sendJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readJsonBody = req =>
  new Promise((resolve, reject) => {
    let body = ''

    req.on('data', chunk => {
      body += chunk
      if (body.length > 10_000) {
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
    sendJson(res, 200, todos)
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

    todos.push(todo)
    sendJson(res, 201, { todo })
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
