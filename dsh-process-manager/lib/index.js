/**
 * dsh-process-manager — host half.
 *
 * Exposes the listening-port inventory of the machine running dsh, and the
 * ability to terminate the process behind one port. Two loopback-only JSON
 * routes carry it:
 *
 *   GET  /api/dsh-process-manager/list       → endpoints grouped by port
 *   POST /api/dsh-process-manager/terminate  → terminate one PID, gracefully first
 *
 * The browser half (./client) renders the sidebar entry and the center-column
 * panel. The heavy lifting lives in two PowerShell scripts under
 * `lib/scripts/`, invoked with `-File` and read back as NDJSON, so the same
 * code path serves Windows PowerShell 5.1 and PowerShell 7.
 *
 * Safety model — every layer is enforced on the host, never only in the UI:
 *   1. Loopback + same-origin fence: the routes act on the local machine's
 *      processes, so a LAN-exposed dsh must not serve them.
 *   2. Critical-process list: kernel and session-critical PIDs are refused.
 *   3. dsh lineage: the host process and every ancestor are refused — killing
 *      one tears down this very session.
 *   4. Identity + ownership re-check: a PID that no longer owns the requested
 *      port is refused, so a recycled PID can never be killed by a stale row.
 *   5. Graceful first: WM_CLOSE is posted, the process is given a grace window,
 *      and only then is it terminated.
 */

import { execFile } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Stable cordis plugin name. */
export const name = 'process-manager'

/** Services required before the routes can mount. */
export const inject = ['webServer']

/** Route paths owned by this plugin. */
const API = {
  list: '/api/dsh-process-manager/list',
  terminate: '/api/dsh-process-manager/terminate',
}

const SCRIPT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'scripts')

/**
 * Process names that are never terminated, normalized to lower case without
 * the `.exe` suffix. These hold Windows together: `lsass`, `wininit`,
 * `services`, and `csrss` are unrecoverable when killed, `svchost` hosts
 * service groups (stop the service instead), and `dwm`/`explorer`/`sihost`
 * belong to the interactive session. Extend it with `protectedNames`.
 */
const CRITICAL_NAMES = [
  'system',
  'idle',
  'registry',
  'memory compression',
  'secure system',
  'smss',
  'csrss',
  'wininit',
  'winlogon',
  'services',
  'lsass',
  'lsaiso',
  'fontdrvhost',
  'dwm',
  'audiodg',
  'svchost',
  'sihost',
  'wudfhost',
  'explorer',
]

/** Defaults for the plugin's plain-object config (no schema dependency). */
const DEFAULT_OPTIONS = {
  /** Explicit `pwsh`/`powershell` path; auto-detected when empty. */
  powershellPath: '',
  /** Grace window between the close request and forced termination. */
  graceMs: 3000,
  /** Upper bound for one collection run. */
  collectTimeoutMs: 30000,
  /** Upper bound for one termination run. */
  terminateTimeoutMs: 30000,
  /** Short cache so an open panel plus a refresh costs one scan. */
  cacheMs: 1200,
  /** Allow non-loopback browsers (only for deployments that need it). */
  allowNonLoopback: false,
  /** Extra process names to protect, e.g. `['nginx']`. */
  protectedNames: [],
  /**
   * Drop ports whose owning process has already exited. Windows keeps orphaned
   * UDP entries after a process dies without releasing them; they cannot be
   * named or terminated, so they are noise in a port-management view. Set false
   * to list them anyway (`orphaned` in the summary always reports the count).
   */
  hideOrphanedEndpoints: true,
}

/** Largest accepted JSON request body. */
const MAX_BODY_BYTES = 64 * 1024

// --------------------------------------------------------------- requests ---

/** Whether an address literal is in the loopback range (127/8, ::1, IPv4-mapped). */
function isLoopbackAddress(address) {
  if (typeof address !== 'string') return false
  const normalized = address.toLowerCase()
  if (normalized === '::1') return true
  if (normalized.startsWith('::ffff:')) return isLoopbackAddress(normalized.slice(7))
  const parts = normalized.split('.')
  if (parts.length !== 4 || parts[0] !== '127') return false
  return parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

/**
 * Trust fence for a request that operates on local processes. The socket
 * address is authoritative and `X-Forwarded-For` is never trusted; the browser
 * same-origin markers close the cross-site request path from another page.
 * @param request - the incoming request.
 * @param allowNonLoopback - skip the loopback requirement (config opt-in).
 * @returns whether the request may act.
 */
function isTrustedRequest(request, allowNonLoopback) {
  const host = request.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (request.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = request.headers.origin
  if (origin !== undefined) {
    try {
      if (new URL(origin).host !== hostUrl.host) return false
    } catch {
      return false
    }
  }
  if (allowNonLoopback) return true
  if (!isLoopbackAddress(request.socket?.remoteAddress)) return false
  const hostname = hostUrl.hostname
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isLoopbackAddress(hostname)
}

/** Read a bounded JSON object body, or undefined when absent/oversized/invalid. */
async function readJsonBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      request.destroy()
      return undefined
    }
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return undefined
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    return parsed
  } catch {
    return undefined
  }
}

/** Write one JSON response. */
function writeJson(response, status, body) {
  const payload = JSON.stringify(body)
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  response.end(payload)
}

// ------------------------------------------------------- PowerShell runner ---

/** Live child processes, so a plugin teardown never leaves one behind. */
const liveChildren = new Set()

/** Resolved interpreter path, cached once a candidate answers. */
let resolvedShell

/**
 * Run one shell child process and collect its output.
 * @param file - executable path.
 * @param args - argv after the executable.
 * @param timeoutMs - kill the child past this bound.
 * @returns the outcome plus both streams as UTF-8 text.
 */
function runChild(file, args, timeoutMs) {
  return new Promise((resolve) => {
    let child
    try {
      child = execFile(
        file,
        args,
        { windowsHide: true, timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' },
        (error, stdout, stderr) => {
          liveChildren.delete(child)
          resolve({ error, stdout: stdout ?? '', stderr: stderr ?? '' })
        },
      )
    } catch (error) {
      resolve({ error, stdout: '', stderr: '' })
      return
    }
    liveChildren.add(child)
  })
}

/**
 * Run one PowerShell script through the first working interpreter.
 * @param script - script file name under `lib/scripts`.
 * @param args - extra script arguments.
 * @param options - resolved plugin options.
 * @param timeoutMs - per-attempt bound.
 * @returns parsed NDJSON records plus the raw streams.
 */
async function runPowerShellScript(script, args, options, timeoutMs) {
  const candidates = []
  if (typeof options.powershellPath === 'string' && options.powershellPath !== '') {
    candidates.push(options.powershellPath)
  }
  if (resolvedShell !== undefined) candidates.push(resolvedShell)
  candidates.push('pwsh.exe', 'powershell.exe')

  let lastFailure
  for (const candidate of candidates) {
    const result = await runChild(
      candidate,
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(SCRIPT_DIR, script), ...args],
      timeoutMs,
    )
    if (result.error?.code === 'ENOENT') {
      lastFailure = result.error
      continue
    }
    if (resolvedShell === undefined) resolvedShell = candidate
    return result
  }
  return {
    error: lastFailure ?? new Error('no PowerShell interpreter found'),
    stdout: '',
    stderr: '',
  }
}

/**
 * Parse NDJSON records, skipping any non-record noise a profile or a warning
 * may have written to stdout.
 * @param text - raw stdout.
 * @returns the parsed records.
 */
function parseNdjson(text) {
  const records = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    try {
      const value = JSON.parse(trimmed)
      if (typeof value === 'object' && value !== null) records.push(value)
    } catch {
      // A torn or non-JSON line is skipped; the caller reports what parsed.
    }
  }
  return records
}

// ------------------------------------------------------------- collection ---

/** Normalize a process name for the protection lookup. */
function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/\.exe$/, '')
}

/** Build the effective protection predicate for one scan. */
function makeProtection(options, tracked) {
  const critical = new Set([...CRITICAL_NAMES, ...(options.protectedNames ?? [])].map(normalizeName))
  return (pid, name) => {
    if (!Number.isFinite(pid) || pid <= 4) return { protected: true, reason: '内核/系统进程（PID ≤ 4）' }
    if (tracked.chain.has(pid)) return { protected: true, reason: 'DSH 宿主进程或其父进程（终止会中断当前会话）' }
    if (pid === tracked.pid) return { protected: true, reason: 'DSH 宿主进程（终止会中断当前会话）' }
    if (critical.has(normalizeName(name))) return { protected: true, reason: 'Windows 关键系统进程' }
    return { protected: false, reason: null }
  }
}

/** Sort addresses so the wildcard binds read first. */
function addressRank(address) {
  if (address === '0.0.0.0' || address === '::') return 0
  if (address === '127.0.0.1' || address === '::1') return 1
  return 2
}

/** Render one address the way `netstat` does: IPv6 literals in brackets. */
function formatAddress(address, port) {
  return address.includes(':') ? `[${address}]:${port}` : `${address}:${port}`
}

/**
 * Turn raw endpoints plus the process table into port-grouped rows.
 *
 * Grouping key is transport + port, so `0.0.0.0:8080`, `127.0.0.1:8080`, and
 * `[::]:8080` collapse into the one service a user thinks of, and every PID
 * bound to that port is reported under it.
 * @param endpoints - parsed endpoint records.
 * @param processes - parsed process records keyed by PID.
 * @param isProtected - the protection predicate.
 * @returns the sorted rows.
 */
function buildRows(endpoints, processes, isProtected) {
  const groups = new Map()
  for (const endpoint of endpoints) {
    const transport = endpoint.proto.startsWith('tcp') ? 'TCP' : 'UDP'
    const family = endpoint.proto.endsWith('6') ? 'IPv6' : 'IPv4'
    const port = Number(endpoint.port)
    const pid = Number(endpoint.pid)
    if (!Number.isFinite(port) || port < 0) continue
    const key = `${transport}:${port}`
    let group = groups.get(key)
    if (group === undefined) {
      group = { key, transport, port, addresses: new Map(), families: new Set(), pids: new Set() }
      groups.set(key, group)
    }
    if (typeof endpoint.addr === 'string') group.addresses.set(endpoint.addr, family)
    group.families.add(family)
    if (Number.isFinite(pid) && pid > 0) group.pids.add(pid)
  }

  const rows = []
  for (const group of groups.values()) {
    const addresses = [...group.addresses.keys()].sort((a, b) => {
      const rank = addressRank(a) - addressRank(b)
      return rank !== 0 ? rank : a.localeCompare(b)
    })
    const pids = []
    for (const pid of group.pids) {
      const record = processes.get(pid)
      const recordName = record?.name ?? `PID ${pid}`
      const verdict = isProtected(pid, recordName)
      pids.push({
        pid,
        name: record?.name ?? null,
        path: record?.path ?? null,
        cmd: record?.cmd ?? null,
        known: record !== undefined,
        protected: verdict.protected,
        protectedReason: verdict.reason,
      })
    }
    pids.sort((a, b) => a.pid - b.pid)
    rows.push({
      key: group.key,
      transport: group.transport,
      port: group.port,
      families: [...group.families],
      addresses,
      display: addresses.map((address) => formatAddress(address, group.port)).join(', '),
      state: group.transport === 'TCP' ? 'LISTENING' : 'BOUND',
      pids,
      protected: pids.length > 0 && pids.every((entry) => entry.protected),
    })
  }
  rows.sort((a, b) => (a.port - b.port) || a.transport.localeCompare(b.transport))
  return rows
}

/** Resolve plugin options over the defaults, tolerating a partial config. */
function resolveOptions(config) {
  const source = typeof config === 'object' && config !== null ? config : {}
  const options = { ...DEFAULT_OPTIONS }
  for (const key of Object.keys(DEFAULT_OPTIONS)) {
    if (source[key] !== undefined && source[key] !== null) options[key] = source[key]
  }
  if (!Array.isArray(options.protectedNames)) options.protectedNames = []
  if (!Number.isFinite(options.graceMs) || options.graceMs < 0) options.graceMs = DEFAULT_OPTIONS.graceMs
  if (!Number.isFinite(options.cacheMs) || options.cacheMs < 0) options.cacheMs = DEFAULT_OPTIONS.cacheMs
  return options
}

/**
 * Run one full scan.
 * @param options - resolved plugin options.
 * @returns the snapshot served to the panel, or a scan failure.
 */
async function collect(options) {
  const started = Date.now()
  const result = await runPowerShellScript(
    'collect.ps1',
    ['-TrackPid', String(process.pid)],
    options,
    options.collectTimeoutMs,
  )

  if (result.error?.code === 'ENOENT' || /no PowerShell interpreter/.test(String(result.error?.message))) {
    return { ok: false, error: '未找到 PowerShell（pwsh.exe / powershell.exe），无法读取本机端口。' }
  }

  const records = parseNdjson(result.stdout)
  if (records.length === 0) {
    const detail = (result.stderr || result.error?.message || '').trim()
    return {
      ok: false,
      error: detail === ''
        ? '采集脚本没有返回任何数据。'
        : `采集脚本执行失败：${detail.split(/\r?\n/).slice(0, 3).join(' ')}`,
    }
  }

  const meta = records.find((record) => record.t === 'meta') ?? {}
  const scanErrors = records.filter((record) => record.t === 'error').map((record) => ({
    stage: record.stage ?? 'unknown',
    message: record.message ?? '',
  }))
  const endpoints = records.filter((record) => record.t === 'endpoint')

  const processes = new Map()
  const chain = new Set()
  for (const record of records) {
    if (record.t !== 'process') continue
    const pid = Number(record.pid)
    if (!Number.isFinite(pid)) continue
    // A PID can be both an endpoint owner and an ancestor of the host process,
    // and the script emits it once with `chain: true` in that case. Chain
    // membership and process details are two independent facts, so recording
    // the details must not depend on the chain flag — otherwise the host's own
    // process (and the shell that launched it) would render as unknown.
    if (record.chain === true) chain.add(pid)
    processes.set(pid, {
      pid,
      name: typeof record.name === 'string' ? record.name : null,
      path: typeof record.path === 'string' ? record.path : null,
      cmd: typeof record.cmd === 'string' ? record.cmd : null,
      ppid: Number(record.ppid) || 0,
    })
  }

  const isProtected = makeProtection(options, { pid: process.pid, chain })
  const allRows = buildRows(endpoints, processes, isProtected)

  // Endpoints whose owning process no longer exists are not actionable: Windows
  // keeps orphaned UDP entries in the endpoint table after a process dies
  // without releasing them, and there is no process left to name or terminate.
  // They are dropped from the default view — but never when the process table
  // itself came back empty, so a failed collection cannot empty the panel.
  const dropOrphaned = options.hideOrphanedEndpoints !== false && processes.size > 0
  const rows = dropOrphaned
    ? allRows.filter((row) => row.pids.some((entry) => entry.known))
    : allRows

  return {
    ok: true,
    meta: {
      platform: typeof meta.platform === 'string' ? meta.platform : process.platform,
      elevated: meta.elevated === true,
      psVersion: typeof meta.psVersion === 'string' ? meta.psVersion : null,
      collectedAt: typeof meta.collectedAt === 'string' ? meta.collectedAt : new Date().toISOString(),
      host: typeof meta.host === 'string' ? meta.host : null,
      hostPid: process.pid,
      durationMs: Date.now() - started,
      shell: resolvedShell ?? null,
    },
    rows,
    errors: scanErrors,
    summary: {
      endpoints: endpoints.length,
      ports: rows.length,
      processes: processes.size,
      tcp: rows.filter((row) => row.transport === 'TCP').length,
      udp: rows.filter((row) => row.transport === 'UDP').length,
      protectedPids: rows.reduce((total, row) => total + row.pids.filter((entry) => entry.protected).length, 0),
      // Ports dropped from the view because every process behind them had
      // already exited (reported so the panel can disclose the omission).
      orphaned: allRows.length - rows.length,
    },
  }
}

// ------------------------------------------------------------ termination ---

/** Map a script outcome to a user-facing verdict for the panel. */
function describeOutcome(outcome) {
  switch (outcome) {
    case 'already-exited':
      return { level: 'info', text: '进程此前已经退出。' }
    case 'closed':
      return { level: 'success', text: '已接受关闭请求，进程正常退出。' }
    case 'killed':
      return { level: 'success', text: '该进程没有可用的优雅退出通道（无窗口），已直接结束。' }
    case 'killed-after-request':
      return { level: 'success', text: '进程未在宽限期内响应关闭请求，已强制结束。' }
    case 'still-running':
      return { level: 'error', text: '已发出结束指令，但进程仍然存在（可能受系统保护或在等待驱动）。' }
    case 'protected':
      return { level: 'error', text: '该进程属于受保护范围，已拒绝操作。' }
    case 'identity-changed':
      return { level: 'error', text: 'PID 已不再是原来的进程（PID 被系统复用），操作已取消。' }
    case 'denied':
      return { level: 'error', text: '权限不足，Windows 拒绝结束该进程。' }
    default:
      return { level: 'error', text: '结束进程失败。' }
  }
}

/**
 * Terminate one PID after proving it is still the process the panel showed.
 * @param body - the validated request body.
 * @param options - resolved plugin options.
 * @returns the termination report, with a refreshed snapshot.
 */
async function terminate(body, options) {
  const pid = Number(body.pid)
  const port = Number(body.port)
  const transport = typeof body.transport === 'string' ? body.transport.toUpperCase() : null
  const expectName = typeof body.name === 'string' ? body.name : ''

  if (!Number.isInteger(pid) || pid <= 0) {
    return { ok: false, status: 400, error: '缺少有效的 pid。' }
  }
  if (pid <= 4) {
    return { ok: false, status: 403, error: 'PID 4 及以下属于内核/系统进程，已拒绝操作。' }
  }
  if (pid === process.pid) {
    return { ok: false, status: 403, error: '不能结束 DSH 宿主进程本身。' }
  }

  // Re-scan before acting: the panel's rows may be seconds old, and a PID that
  // no longer owns the requested port is either gone or recycled. Either way,
  // killing it would hit the wrong program.
  const fresh = await collect(options)
  if (fresh.ok !== true) {
    return { ok: false, status: 503, error: fresh.error }
  }

  let row
  if (Number.isInteger(port) && port >= 0) {
    row = fresh.rows.find((candidate) => candidate.port === port &&
      (transport === null || candidate.transport === transport))
    if (row === undefined) {
      return {
        ok: false,
        status: 409,
        error: `端口 ${port} 上已经没有任何进程在监听，操作已取消。`,
        snapshot: fresh,
      }
    }
    if (!row.pids.some((entry) => entry.pid === pid)) {
      return {
        ok: false,
        status: 409,
        error: `端口 ${port} 当前不属于 PID ${pid}（可能已退出或 PID 被复用），操作已取消。`,
        snapshot: fresh,
      }
    }
  }

  const target = fresh.rows
    .flatMap((candidate) => candidate.pids)
    .find((entry) => entry.pid === pid)
  if (target !== undefined && target.protected) {
    return {
      ok: false,
      status: 403,
      error: `受保护进程：${target.protectedReason ?? '系统关键进程'}。`,
      snapshot: fresh,
    }
  }

  const liveName = target?.name ?? expectName
  if (expectName !== '' && liveName !== '' &&
    normalizeName(expectName) !== normalizeName(liveName)) {
    return {
      ok: false,
      status: 409,
      error: `PID ${pid} 现在是 "${liveName}"，不是 "${expectName}"，操作已取消。`,
      snapshot: fresh,
    }
  }

  const graceMs = Number.isFinite(Number(body.graceMs))
    ? Math.max(0, Math.min(60000, Number(body.graceMs)))
    : options.graceMs

  const run = await runPowerShellScript(
    'terminate.ps1',
    ['-TargetPid', String(pid), '-GraceMs', String(graceMs), '-ExpectName', liveName ?? ''],
    options,
    options.terminateTimeoutMs,
  )

  const report = parseNdjson(run.stdout).find((record) => record.t === 'result')
  if (report === undefined) {
    const detail = (run.stderr || run.error?.message || '').trim()
    return {
      ok: false,
      status: 500,
      error: detail === '' ? '终止脚本没有返回结果。' : `终止脚本执行失败：${detail.split(/\r?\n/).slice(0, 3).join(' ')}`,
      snapshot: fresh,
    }
  }

  const verdict = describeOutcome(report.outcome)
  const after = await collect(options)

  return {
    ok: report.ok === true,
    status: 200,
    result: {
      pid,
      port: Number.isInteger(port) ? port : null,
      transport,
      name: report.name || liveName,
      outcome: report.outcome,
      graceful: report.graceful === true,
      forced: report.forced === true,
      waitedMs: Number(report.waitedMs) || 0,
      level: verdict.level,
      message: verdict.text,
      detail: typeof report.message === 'string' ? report.message : null,
    },
    snapshot: after.ok === true ? after : fresh,
  }
}

// ---------------------------------------------------------------- plugin ---

/**
 * Mount the process-manager routes.
 * @param ctx - host plugin context carrying `webServer`.
 * @param config - optional plain-object config (see DEFAULT_OPTIONS).
 */
export function apply(ctx, config) {
  const options = resolveOptions(config)

  /** In-flight scan, so two callers share one PowerShell run. */
  let inFlight
  /** Last successful snapshot plus its timestamp, for the short cache. */
  let cached

  /** Serve a snapshot, reusing a very recent one unless `fresh` is requested. */
  const snapshot = async (force) => {
    const now = Date.now()
    if (!force && cached !== undefined && now - cached.at < options.cacheMs) return cached.value
    if (inFlight !== undefined) return inFlight
    inFlight = collect(options)
      .then((value) => {
        if (value.ok === true) cached = { at: Date.now(), value }
        return value
      })
      .finally(() => { inFlight = undefined })
    return inFlight
  }

  const listRoute = {
    kind: 'exact',
    path: API.list,
    handler: async (request, response) => {
      if (!isTrustedRequest(request, options.allowNonLoopback)) {
        writeJson(response, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
      if ((request.method ?? 'GET') !== 'GET') {
        writeJson(response, 405, { ok: false, error: `method not allowed: ${request.method}` })
        return
      }
      let force = false
      try {
        force = new URL(request.url ?? '/', 'http://localhost').searchParams.get('fresh') === '1'
      } catch {
        force = false
      }
      const value = await snapshot(force)
      writeJson(response, value.ok === true ? 200 : 503, value)
    },
  }

  const terminateRoute = {
    kind: 'exact',
    path: API.terminate,
    handler: async (request, response) => {
      if (!isTrustedRequest(request, options.allowNonLoopback)) {
        writeJson(response, 403, { ok: false, error: 'forbidden: loopback-only' })
        return
      }
      if ((request.method ?? 'GET') !== 'POST') {
        writeJson(response, 405, { ok: false, error: `method not allowed: ${request.method}` })
        return
      }
      const body = await readJsonBody(request)
      if (body === undefined) {
        writeJson(response, 400, { ok: false, error: '请求体必须是 JSON 对象。' })
        return
      }
      const outcome = await terminate(body, options)
      // Any action invalidates the cached snapshot: the port may be free now.
      cached = undefined
      writeJson(response, outcome.status ?? 200, outcome)
    },
  }

  ctx.effect(() => {
    const disposers = [ctx.webServer.register(listRoute), ctx.webServer.register(terminateRoute)]
    return () => {
      for (const dispose of disposers) dispose()
    }
  }, 'process-manager: routes')

  // A teardown must not leave a PowerShell scan or termination running.
  ctx.effect(() => () => {
    for (const child of liveChildren) {
      try {
        child.kill()
      } catch {
        // The child already exited.
      }
    }
    liveChildren.clear()
  }, 'process-manager: children')
}
