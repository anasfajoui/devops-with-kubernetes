const fs = require('fs/promises')
const Koa = require('koa')

const app = new Koa()

const PORT = process.env.PORT || 3000
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/shared/output.log'
const INFORMATION_FILE_PATH =
  process.env.INFORMATION_FILE_PATH || '/config/information.txt'
const MESSAGE = process.env.MESSAGE || ''
const PING_PONG_URL = process.env.PING_PONG_URL || 'http://ping-pong-svc:2345/pings'

const readPingPongCount = async () => {
  const response = await fetch(PING_PONG_URL, {
    signal: AbortSignal.timeout(5_000),
  })

  if (!response.ok) {
    throw new Error(`Ping Pong responded with status ${response.status}`)
  }

  const value = Number.parseInt((await response.text()).trim(), 10)
  if (Number.isNaN(value)) {
    throw new Error('Ping Pong returned an invalid counter value')
  }

  return value
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

  let fileContent
  let information

  try {
    fileContent = await fs.readFile(LOG_FILE_PATH, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') {
      fileContent = 'Log file has not been created yet.\n'
    } else {
      console.error(`Failed to read ${LOG_FILE_PATH}:`, error)
      ctx.status = 500
      ctx.body = 'Could not read log file.\n'
      return
    }
  }

  try {
    information = (await fs.readFile(INFORMATION_FILE_PATH, 'utf8')).trimEnd()
  } catch (error) {
    console.error(`Failed to read ${INFORMATION_FILE_PATH}:`, error)
    ctx.status = 500
    ctx.body = 'Could not read information file.\n'
    return
  }

  try {
    const pingPongs = await readPingPongCount()
    ctx.type = 'text/plain'
    ctx.body = `file content: ${information}\nenv variable: MESSAGE=${MESSAGE}\n${fileContent || 'Log file is empty.\n'}Ping / Pongs: ${pingPongs}\n`
  } catch (error) {
    console.error(`Failed to fetch pong count from ${PING_PONG_URL}:`, error)
    ctx.status = 502
    ctx.body = 'Could not fetch pong count.\n'
  }
})

app.listen(PORT, () => {
  console.log(`Reader listening on port ${PORT}, file: ${LOG_FILE_PATH}`)
})
