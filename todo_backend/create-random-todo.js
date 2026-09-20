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

const RANDOM_ARTICLE_URL = requireEnv('RANDOM_ARTICLE_URL')
const TODO_BACKEND_URL = requireEnv('TODO_BACKEND_URL')
const HTTP_REQUEST_TIMEOUT_MS = requirePositiveIntegerEnv('HTTP_REQUEST_TIMEOUT_MS')
const MAX_TODO_LENGTH = requirePositiveIntegerEnv('MAX_TODO_LENGTH')
const RANDOM_ARTICLE_ATTEMPTS = requirePositiveIntegerEnv('RANDOM_ARTICLE_ATTEMPTS')

const getRandomArticleTodo = async () => {
  for (let attempt = 1; attempt <= RANDOM_ARTICLE_ATTEMPTS; attempt += 1) {
    const response = await fetch(RANDOM_ARTICLE_URL, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS),
    })

    if (response.status < 300 || response.status >= 400) {
      throw new Error(`Random article endpoint responded with status ${response.status}`)
    }

    const location = response.headers.get('location')
    if (!location) {
      throw new Error('Random article response did not include a Location header')
    }

    const articleUrl = new URL(location, RANDOM_ARTICLE_URL).toString()
    const todo = `Read ${articleUrl}`

    if (todo.length <= MAX_TODO_LENGTH) {
      return todo
    }

    console.warn(
      `Random article URL was too long on attempt ${attempt}/${RANDOM_ARTICLE_ATTEMPTS}`
    )
  }

  throw new Error('Could not find a random article URL that fits in a todo')
}

const createTodo = async todo => {
  const response = await fetch(TODO_BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ todo }),
    signal: AbortSignal.timeout(HTTP_REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Todo backend responded with status ${response.status}`)
  }
}

const main = async () => {
  const todo = await getRandomArticleTodo()
  await createTodo(todo)
  console.log(`Created todo: ${todo}`)
}

main().catch(error => {
  console.error('Failed to create a random Wikipedia todo:', error)
  process.exitCode = 1
})
