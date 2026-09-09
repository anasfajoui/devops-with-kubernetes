const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const Koa = require('koa')

const app = new Koa()

const PORT = process.env.PORT || 3000
const IMAGE_URL = process.env.IMAGE_URL || 'https://picsum.photos/800/600'
const IMAGE_CACHE_PATH = process.env.IMAGE_CACHE_PATH || '/cache/image.jpg'
const IMAGE_CACHE_TTL_MS = Number(process.env.IMAGE_CACHE_TTL_MS || 10 * 60 * 1000)
const TODO_BACKEND_URL =
  process.env.TODO_BACKEND_URL || 'http://todo-backend-svc:2345/todos'

const createRandomString = () => Math.random().toString(36).slice(2, 8)

const startingString = createRandomString()
let refreshPromise
let server

const escapeHtml = value =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const getTodos = async () => {
  const response = await fetch(TODO_BACKEND_URL, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`Todo backend responded with status ${response.status}`)
  }

  const todos = await response.json()
  if (!Array.isArray(todos) || !todos.every(todo => typeof todo === 'string')) {
    throw new Error('Todo backend returned an invalid response')
  }

  return todos
}

const imageDetails = async () => {
  try {
    const stats = await fsPromises.stat(IMAGE_CACHE_PATH)
    return { exists: true, isFresh: Date.now() - stats.mtimeMs < IMAGE_CACHE_TTL_MS }
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { exists: false, isFresh: false }
    }
    throw error
  }
}

const refreshImage = () => {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const response = await fetch(IMAGE_URL, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })

    if (!response.ok) {
      throw new Error(`Lorem Picsum responded with status ${response.status}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.startsWith('image/')) {
      throw new Error(`Lorem Picsum returned unexpected content type: ${contentType}`)
    }

    const image = Buffer.from(await response.arrayBuffer())
    const temporaryPath = `${IMAGE_CACHE_PATH}.${process.pid}.tmp`

    await fsPromises.mkdir(path.dirname(IMAGE_CACHE_PATH), { recursive: true })
    await fsPromises.writeFile(temporaryPath, image)
    await fsPromises.rename(temporaryPath, IMAGE_CACHE_PATH)
    console.log(`Cached a new image at ${IMAGE_CACHE_PATH}`)
  })().finally(() => {
    refreshPromise = undefined
  })

  return refreshPromise
}

const serveImage = async ctx => {
  const details = await imageDetails()

  if (!details.exists) {
    await refreshImage()
  } else if (!details.isFresh) {
    if (refreshPromise) {
      // A stale request already started the refresh.
      try {
        await refreshPromise
      } catch (error) {
        console.error('Could not refresh cached image:', error)
      }
    } else {
      // Serve the stale image once and replace it for the following request.
      refreshImage().catch(error => {
        console.error('Could not refresh cached image:', error)
      })
    }
  }

  ctx.set('Cache-Control', 'no-store')
  ctx.type = 'image/jpeg'
  ctx.body = fs.createReadStream(IMAGE_CACHE_PATH)
}

const shutDown = signal => {
  console.log(`${signal} received, shutting down`)
  server.close(() => process.exit(0))
}

app.use(async ctx => {
  if (ctx.path === '/image' && ctx.method === 'GET') {
    await serveImage(ctx)
    return
  }

  if (ctx.path === '/shutdown' && ctx.method === 'POST') {
    ctx.status = 202
    ctx.body = 'Container is shutting down. Kubernetes will restart it.\n'
    setImmediate(() => shutDown('Test shutdown'))
    return
  }

  if (ctx.path.includes('favicon.ico')) {
    ctx.status = 204
    return
  }

  const stringNow = createRandomString()
  console.log('--------------------')
  console.log(`Responding with ${stringNow}`)

  let todos

  try {
    todos = await getTodos()
  } catch (error) {
    console.error(`Could not fetch todos from ${TODO_BACKEND_URL}:`, error)
    ctx.status = 502
    ctx.body = 'Could not fetch todos.\n'
    return
  }

  const todoItems = todos.map(todo => `<li>${escapeHtml(todo)}</li>`).join('')

  ctx.type = 'html'
  ctx.body = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Todo App</title>
        <style>
          * { box-sizing: border-box; }
          body {
            color: #292929;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 3rem 1rem;
          }
          main {
            margin: 0 auto;
            max-width: 64rem;
          }
          h1, h2 { text-align: center; }
          h1 { font-size: 3rem; margin: 0 0 2rem; }
          h2 { font-size: 2rem; margin: 2.5rem 0 1.5rem; }
          img {
            border-radius: 0.75rem;
            box-shadow: 0 0.25rem 0.75rem rgb(0 0 0 / 15%);
            display: block;
            height: auto;
            margin: 0 auto 3rem;
            max-width: 100%;
            width: 25rem;
          }
          .todo-form {
            display: flex;
            gap: 0.75rem;
            margin: 0 auto;
            max-width: 48rem;
          }
          .todo-form input {
            border: 0.125rem solid #4caf50;
            border-radius: 0.35rem;
            flex: 1;
            font: inherit;
            min-width: 0;
            padding: 0.85rem 1rem;
          }
          .todo-form button {
            background: #4caf50;
            border: 0;
            border-radius: 0.35rem;
            color: white;
            cursor: pointer;
            font: inherit;
            padding: 0.85rem 1.5rem;
          }
          .form-error {
            color: #b71c1c;
            margin: 0.75rem auto 0;
            max-width: 48rem;
            min-height: 1.25rem;
          }
          .todos {
            list-style: none;
            margin: 0;
            padding: 0;
          }
          .todos li {
            border-left: 0.35rem solid #4caf50;
            border-radius: 0.3rem;
            box-shadow: 0 0.15rem 0.6rem rgb(0 0 0 / 10%);
            margin-bottom: 0.75rem;
            padding: 1rem 1.25rem;
          }
          .shutdown-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            justify-content: center;
            margin-top: 1.5rem;
          }
          .shutdown-actions form { margin: 0; }
          .shutdown-actions button {
            background: #d32f2f;
            border: 0;
            border-radius: 0.35rem;
            color: white;
            cursor: pointer;
            font: inherit;
            padding: 0.7rem 1rem;
          }
          @media (max-width: 35rem) {
            .todo-form { flex-direction: column; }
            .todo-form button { width: 100%; }
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Todo App</h1>
          <img src="/image" alt="Random landscape from Lorem Picsum" width="800" height="600">
          <form class="todo-form" id="todo-form">
            <input
              type="text"
              name="todo"
              maxlength="140"
              placeholder="Enter a new todo (max 140 characters)"
              aria-label="New todo"
              required
            >
            <button type="submit">Send</button>
          </form>
          <p class="form-error" id="form-error" role="alert"></p>
          <h2>Todos</h2>
          <ul class="todos">${todoItems}</ul>
          <div class="shutdown-actions">
            <form method="post" action="/shutdown">
              <button type="submit">Shut down Todo App</button>
            </form>
            <form method="post" action="/todos/shutdown">
              <button type="submit">Shut down Todo Backend</button>
            </form>
          </div>
        </main>
        <script>
          const form = document.querySelector('#todo-form')
          const input = form.elements.todo
          const errorMessage = document.querySelector('#form-error')

          form.addEventListener('submit', async event => {
            event.preventDefault()
            errorMessage.textContent = ''

            try {
              const response = await fetch('/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ todo: input.value }),
              })

              if (!response.ok) {
                const result = await response.json()
                throw new Error(result.error || 'Could not create todo')
              }

              window.location.reload()
            } catch (error) {
              errorMessage.textContent = error.message
            }
          })
        </script>
      </body>
    </html>
  `
})

app.on('error', error => {
  console.error('Server error:', error)
})

server = app.listen(PORT)

process.on('SIGTERM', () => shutDown('SIGTERM'))
process.on('SIGINT', () => shutDown('SIGINT'))

console.log(`Started with ${startingString}, listening on port ${PORT}`)
