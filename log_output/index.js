const fs = require('fs/promises')
const Koa = require('koa')

const app = new Koa()

const PORT = process.env.PORT || 3000
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/shared/output.log'
const PING_PONG_COUNT_FILE =
  process.env.PING_PONG_COUNT_FILE || '/shared/ping-pong-count.txt'

const readPingPongCount = async () => {
  try {
    const value = await fs.readFile(PING_PONG_COUNT_FILE, 'utf8')
    const parsedValue = Number.parseInt(value.trim(), 10)
    return Number.isNaN(parsedValue) ? 0 : parsedValue
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0
    }
    throw error
  }
}

app.use(async ctx => {
  if (ctx.path.includes('favicon.ico')) {
    ctx.status = 204
    return
  }

  if (ctx.method !== 'GET') {
    ctx.status = 405
    ctx.body = 'Method Not Allowed\n'
    return
  }

  try {
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf8')
    const pingPongs = await readPingPongCount()
    ctx.type = 'text/plain'
    ctx.body = `${fileContent || 'Log file is empty.\n'}Ping / Pongs: ${pingPongs}\n`
  } catch (error) {
    if (error.code === 'ENOENT') {
      ctx.type = 'text/plain'
      const pingPongs = await readPingPongCount()
      ctx.body = `Log file has not been created yet.\nPing / Pongs: ${pingPongs}\n`
      return
    }

    console.error(`Failed to read ${LOG_FILE_PATH}:`, error)
    ctx.status = 500
    ctx.body = 'Could not read log file.\n'
  }
})

app.listen(PORT, () => {
  console.log(`Reader listening on port ${PORT}, file: ${LOG_FILE_PATH}`)
})
