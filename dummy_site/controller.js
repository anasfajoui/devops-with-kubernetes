const { readFileSync } = require('node:fs')
const { createInterface } = require('node:readline')
const { Readable } = require('node:stream')
const { setTimeout: delay } = require('node:timers/promises')
const { siteResources } = require('./resources')

function clusterRequest(path, options = {}) {
  const token = readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8').trim()
  return fetch(`https://kubernetes.default.svc${path}`, {
    signal: AbortSignal.timeout(15000),
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${token}` },
  })
}

async function checkResponse(response) {
  if (!response.ok) {
    throw new Error(`Kubernetes API returned ${response.status}: ${await response.text()}`)
  }
  return response
}

async function ensureResource(resource, request) {
  const { name, namespace, ownerReferences } = resource.metadata
  const collection = resource.kind === 'Deployment'
    ? `/apis/apps/v1/namespaces/${namespace}/deployments`
    : `/api/v1/namespaces/${namespace}/services`
  const path = `${collection}/${name}`
  const response = await request(path)

  if (response.status === 404) {
    await response.body?.cancel()
    const created = await request(collection, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resource),
    })
    await checkResponse(created)
    await created.body?.cancel()
    return
  }

  await checkResponse(response)
  const existing = await response.json()
  const owner = existing.metadata.ownerReferences?.find(ref => ref.controller)
  if (owner?.uid !== ownerReferences[0].uid) {
    throw new Error(`${resource.kind}/${name} already belongs to another owner`)
  }

  if (resource.kind === 'Service') return
  const downloadUrl = deployment => deployment.spec.template.spec.initContainers
    ?.find(container => container.name === 'download')?.env?.find(env => env.name === 'WEBSITE_URL')?.value
  if (downloadUrl(existing) === downloadUrl(resource)) return

  const updated = await request(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/strategic-merge-patch+json' },
    body: JSON.stringify({
      metadata: { resourceVersion: existing.metadata.resourceVersion },
      spec: resource.spec,
    }),
  })
  await checkResponse(updated)
  await updated.body?.cancel()
}

async function reconcile(site, request) {
  if (site.metadata.deletionTimestamp) return
  try {
    for (const resource of siteResources(site)) {
      await ensureResource(resource, request)
    }
  } catch (error) {
    console.error(`DummySite ${site.metadata.namespace}/${site.metadata.name}: ${error.message}`)
  }
}

async function listAndWatch(request) {
  const path = '/apis/dwk.dev/v1/dummysites'
  const response = await checkResponse(await request(path))
  const list = await response.json()
  for (const site of list.items) await reconcile(site, request)

  const query = new URLSearchParams({
    watch: 'true', resourceVersion: list.metadata.resourceVersion, timeoutSeconds: '60',
  })
  const watch = await checkResponse(await request(`${path}?${query}`, { signal: AbortSignal.timeout(75000) }))
  const stream = Readable.fromWeb(watch.body)
  try {
    for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
      if (!line.trim()) continue
      const { type, object } = JSON.parse(line)
      if (type === 'ERROR') throw new Error(object.message)
      if (type === 'ADDED' || type === 'MODIFIED') await reconcile(object, request)
    }
  } finally {
    stream.destroy()
  }
}

async function run() {
  for (;;) {
    try {
      await listAndWatch(clusterRequest)
    } catch (error) {
      console.error(`DummySite watch: ${error.message}`)
    }
    await delay(2000)
  }
}

if (require.main === module) run()

module.exports = { listAndWatch }
