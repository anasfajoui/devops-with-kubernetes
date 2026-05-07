const fs = require('fs/promises')

const LOG_FILE_PATH = process.env.LOG_FILE_PATH || '/shared/output.log'
const WRITE_INTERVAL_MS = Number(process.env.WRITE_INTERVAL_MS || 5000)
const randomString = Math.random().toString(36).slice(2)

const writeLine = async () => {
  try {
    const timestamp = new Date().toISOString()
    const output = `${timestamp}: ${randomString}.\n`

    await fs.writeFile(LOG_FILE_PATH, output, 'utf8')
    console.log(`Wrote output: ${output.trim()}`)
  } catch (error) {
    console.error(`Failed writing to ${LOG_FILE_PATH}:`, error)
  }
}

const start = async () => {
  console.log(`Writer started with random string: ${randomString}`)
  await writeLine()
  setInterval(writeLine, WRITE_INTERVAL_MS)
}

start()
