const fs = require('fs')
const fsPromises = require('fs/promises')
const path = require('path')
const Koa = require('koa')

const app = new Koa()

const PORT = process.env.PORT || 3000
const IMAGE_URL = process.env.IMAGE_URL || 'https://picsum.photos/800/600'
const IMAGE_CACHE_PATH = process.env.IMAGE_CACHE_PATH || '/cache/image.jpg'
const IMAGE_CACHE_TTL_MS = Number(process.env.IMAGE_CACHE_TTL_MS || 10 * 60 * 1000)

const createRandomString = () => Math.random().toString(36).slice(2, 8)

const startingString = createRandomString()
let refreshPromise
let server

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

  ctx.type = 'html'
  ctx.body = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>The Project Server</title>
        <style>
          body { font-family: sans-serif; max-width: 75rem; margin: 2rem auto; padding: 0 1rem; }
          img { display: block; width: auto; height: auto; border-radius: 0.5rem; }
          button { margin-top: 1rem; padding: 0.5rem 0.75rem; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>Application ${startingString}</h1>
        <p>Request: ${stringNow}</p>
        <img src="/image" alt="Random landscape from Lorem Picsum" width="800" height="600">
        <form method="post" action="/shutdown">
          <button type="submit">Shut down container</button>
        </form>
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
