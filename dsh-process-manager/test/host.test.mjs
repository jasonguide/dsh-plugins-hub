/**
 * Host-half tests for dsh-process-manager.
 *
 * These drive the real route handlers through a fake cordis context and a fake
 * request/response pair, so the collection, grouping, protection, trust-fence,
 * and termination paths are all exercised against the live machine.
 *
 * Usage:  node test/host.test.mjs
 */

import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { apply } from '../lib/index.js'

/** Capture the routes a plugin registers. */
function mountPlugin(config) {
  const routes = new Map()
  const ctx = {
    webServer: {
      register(route) {
        routes.set(route.path, route)
        return () => routes.delete(route.path)
      },
    },
    effect(callback) {
      const dispose = callback()
      return () => { if (typeof dispose === 'function') dispose() }
    },
  }
  apply(ctx, config)
  return routes
}

/** Build the minimal request shape the handlers read. */
function makeRequest({ method = 'GET', url = '/', body, host = '127.0.0.1:3080', address = '127.0.0.1', origin } = {}) {
  const payload = body === undefined ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]
  const headers = { host }
  if (origin !== undefined) headers.origin = origin
  return {
    method,
    url,
    headers,
    socket: { remoteAddress: address },
    destroy() {},
    async *[Symbol.asyncIterator]() {
      for (const chunk of payload) yield chunk
    },
  }
}

/** Capture one JSON response. */
function makeResponse() {
  const captured = { status: 0, headers: null, body: undefined }
  return {
    captured,
    writeHead(status, headers) {
      captured.status = status
      captured.headers = headers
    },
    end(payload) {
      captured.body = payload === undefined ? undefined : JSON.parse(payload)
    },
  }
}

/** Call one route and return the captured response. */
async function call(routes, path, request) {
  const route = routes.get(path)
  assert.ok(route !== undefined, `route ${path} is registered`)
  const response = makeResponse()
  await route.handler(request, response)
  return response.captured
}

/** Spawn a throwaway HTTP server on a free port and return its PID and port. */
function spawnListener(port) {
  const script = `require('http').createServer((q,s)=>s.end('ok')).listen(${port},'127.0.0.1')`
  const child = spawn(process.execPath, ['-e', script], { stdio: 'ignore', windowsHide: true })
  return child
}

/** Wait until a predicate holds, or throw after the timeout. */
async function waitFor(predicate, timeoutMs = 8000, stepMs = 150) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await predicate()) return true
    await new Promise((resolve) => setTimeout(resolve, stepMs))
  }
  return false
}

let failures = 0
async function test(name, run) {
  try {
    await run()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures += 1
    console.log(`  FAIL ${name}`)
    console.log(`       ${error instanceof Error ? error.message : String(error)}`)
  }
}

const routes = mountPlugin({ cacheMs: 0 })

console.log('dsh-process-manager host tests')

await test('list returns rows grouped by port with protection flags', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list', makeRequest())
  assert.equal(result.status, 200, 'status is 200')
  assert.equal(result.body.ok, true, 'ok is true')
  assert.ok(Array.isArray(result.body.rows), 'rows is an array')
  assert.ok(result.body.rows.length > 0, 'at least one listening port exists')
  assert.ok(result.body.meta.elevated === true || result.body.meta.elevated === false, 'elevation is reported')
  assert.equal(result.body.meta.hostPid, process.pid, 'host pid is reported')

  for (const row of result.body.rows) {
    assert.ok(['TCP', 'UDP'].includes(row.transport), 'transport is TCP or UDP')
    assert.ok(Number.isInteger(row.port), 'port is an integer')
    assert.ok(row.addresses.length > 0, 'row lists at least one address')
    assert.ok(row.pids.length > 0, 'row lists at least one pid')
    assert.equal(row.display.includes(String(row.port)), true, 'display carries the port')
  }

  const ports = result.body.rows.map((row) => row.port)
  const sorted = [...ports].sort((a, b) => a - b)
  assert.deepEqual(ports, sorted, 'rows are sorted by port')
})

await test('every listed port has at least one named process', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list', makeRequest())
  assert.equal(typeof result.body.summary.orphaned, 'number', 'the orphaned count is reported')

  // A row survives the default filter only when some process behind it still
  // exists, so the panel can always name (and act on) what it shows.
  const nameless = result.body.rows.filter((row) => row.pids.every((entry) => entry.known === false))
  assert.equal(nameless.length, 0, `no fully-orphaned row is listed (found ${nameless.length})`)
})

await test('hideOrphanedEndpoints: false lists the orphaned rows instead', async () => {
  const verboseRoutes = mountPlugin({ cacheMs: 0, hideOrphanedEndpoints: false })
  const unfiltered = await call(verboseRoutes, '/api/dsh-process-manager/list', makeRequest())
  const filtered = await call(routes, '/api/dsh-process-manager/list', makeRequest({ url: '/?fresh=1' }))

  assert.equal(unfiltered.body.ok, true, 'ok is true')
  assert.equal(unfiltered.body.summary.orphaned, 0, 'nothing is reported as hidden')
  assert.ok(
    unfiltered.body.summary.ports >= filtered.body.summary.ports,
    'the unfiltered view never lists fewer ports than the filtered one',
  )
  // The difference between the two views is exactly what the filter removes.
  assert.equal(
    unfiltered.body.summary.ports - filtered.body.summary.ports,
    filtered.body.summary.orphaned,
    'the hidden count matches the difference between the two views',
  )
  // Orphaned rows are permitted here, and every one of them is nameless.
  const nameless = unfiltered.body.rows.filter((row) => row.pids.every((entry) => entry.known === false))
  for (const row of nameless) {
    assert.ok(row.pids.every((entry) => entry.name === null), 'an orphaned row carries no process name')
  }
})

await test('a PID that is both an endpoint owner and a host ancestor keeps its name', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list', makeRequest())
  // The collector reports the host's ancestor chain separately from endpoint
  // owners; a PID in both sets must still carry its process details, otherwise
  // the host's own listening port would render as unknown.
  const hostRow = result.body.rows.find((row) => row.pids.some((entry) => entry.pid === process.pid))
  if (hostRow !== undefined) {
    const entry = hostRow.pids.find((candidate) => candidate.pid === process.pid)
    assert.notEqual(entry.name, null, 'the host process keeps its name')
    assert.equal(entry.protected, true, 'the host process is protected')
  }
  for (const row of result.body.rows) {
    for (const entry of row.pids) {
      if (entry.known === true) assert.notEqual(entry.name, null, `PID ${entry.pid} is known, so it has a name`)
    }
  }
})

await test('PID 4 and the dsh host are protected', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list', makeRequest())
  const system = result.body.rows.flatMap((row) => row.pids).find((entry) => entry.pid === 4)
  if (system !== undefined) {
    assert.equal(system.protected, true, 'PID 4 is protected')
  }
  const allPids = result.body.rows.flatMap((row) => row.pids)
  assert.equal(allPids.some((entry) => entry.pid === process.pid), false,
    'the dsh host owns no listening port in this test, so it must not appear as a target')
})

await test('a non-loopback caller is refused', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list',
    makeRequest({ address: '10.0.0.5', host: '10.0.0.5:3080' }))
  assert.equal(result.status, 403, 'status is 403')
})

await test('a cross-site browser request is refused', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list',
    makeRequest({ origin: 'http://evil.example' }))
  assert.equal(result.status, 403, 'status is 403')
})

await test('the wrong method is refused', async () => {
  const result = await call(routes, '/api/dsh-process-manager/list', makeRequest({ method: 'POST' }))
  assert.equal(result.status, 405, 'status is 405')
})

await test('terminate refuses a port that no process listens on', async () => {
  const result = await call(routes, '/api/dsh-process-manager/terminate', makeRequest({
    method: 'POST',
    body: { pid: 123456, port: 1 },
  }))
  assert.equal(result.status, 409, 'status is 409 (stale row)')
  assert.equal(result.body.ok, false, 'ok is false')
})

await test('terminate refuses a protected PID before touching the process', async () => {
  const result = await call(routes, '/api/dsh-process-manager/terminate', makeRequest({
    method: 'POST',
    body: { pid: 4 },
  }))
  assert.equal(result.status, 403, 'status is 403')
})

await test('terminate refuses the dsh host pid', async () => {
  const result = await call(routes, '/api/dsh-process-manager/terminate', makeRequest({
    method: 'POST',
    body: { pid: process.pid, port: 1 },
  }))
  assert.equal(result.status, 403, 'status is 403')
})

await test('an end-to-end termination frees the port', async () => {
  const port = 47895
  const child = spawnListener(port)
  try {
    const up = await waitFor(async () => {
      const result = await call(routes, '/api/dsh-process-manager/list', makeRequest({ url: '/?fresh=1' }))
      return result.body.rows.some((row) => row.port === port)
    })
    assert.ok(up, `the throwaway listener on ${port} appears in the list`)

    const listing = await call(routes, '/api/dsh-process-manager/list', makeRequest({ url: '/?fresh=1' }))
    const row = listing.body.rows.find((candidate) => candidate.port === port)
    const owner = row.pids[0]
    assert.equal(owner.protected, false, 'the throwaway listener is not protected')

    const terminated = await call(routes, '/api/dsh-process-manager/terminate', makeRequest({
      method: 'POST',
      body: { pid: owner.pid, port, transport: row.transport, name: owner.name },
    }))
    assert.equal(terminated.body.ok, true, `termination succeeded: ${JSON.stringify(terminated.body.error ?? terminated.body.result)}`)
    assert.ok(['killed', 'killed-after-request', 'closed'].includes(terminated.body.result.outcome),
      `outcome is a termination: ${terminated.body.result.outcome}`)

    const gone = await waitFor(async () => {
      const result = await call(routes, '/api/dsh-process-manager/list', makeRequest({ url: '/?fresh=1' }))
      return !result.body.rows.some((candidate) => candidate.port === port)
    })
    assert.ok(gone, 'the port is released after termination')
  } finally {
    try { child.kill() } catch { /* already gone */ }
  }
})

console.log(failures === 0 ? '\nall host tests passed' : `\n${failures} host test(s) failed`)
process.exit(failures === 0 ? 0 : 1)
