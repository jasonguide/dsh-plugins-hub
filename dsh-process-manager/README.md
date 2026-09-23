# dsh-process-manager

**English** · [简体中文](./README.zh.md)

> A **Windows process & listening-port panel** for the [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh) Web GUI: one sidebar entry that lists every local listening port — process name, PID, protocol, address, executable path — and lets you end the process behind one.

Think of it as the Resource Monitor's *Network* tab made actionable: the same port-centric view, plus a terminate button you can actually press.

```
Sidebar                                  Main panel
┌────────────────────────┐   ┌──────────────────────────────────────────────┐
│  ↑ New session          │   │ Processes              [Administrator] [↻]   │
│  ▣ Task board           │   │ Local listening ports  [107 ports / 192      │
│  ▣ SSH                  │   │                         endpoints · 61 TCP]   │
│  ▣ Skill center         │   ├──────────────────────────────────────────────┤
│  ▣ Processes  ← plugin  │   │ 🔍 Search name / PID / port / path           │
│  ─────────────────────  │   ├──────────────────────────────────────────────┤
│  Workspaces             │   │ Process ▲   PID   Proto  Address:port  Action│
│  ...                    │   │ node.exe    26864 TCP    :47894       [End]  │
│                         │   │ D:\...\nodejs\node.exe                       │
└────────────────────────┘   └──────────────────────────────────────────────┘
```

## Features

| Capability | Description |
| --- | --- |
| Listening-port overview | TCP `LISTENING` plus every bound UDP endpoint — the equivalent of `netstat -ano`'s listening view |
| Merged by port | `0.0.0.0:8080`, `127.0.0.1:8080` and `[::]:8080` collapse into one row; a port held by several processes expands into a per-process picker |
| Column sorting | Click any column header to sort: ascending → descending → back to the default order (port ascending) |
| Search filter | Instant filtering by process name, PID, port, or executable path |
| End process | Requests a graceful close first and only forces termination past the grace window; the outcome is reported in place (success / denied / already exited / protected …) |
| Safety rails | Critical system processes and DSH's own process tree are protected; ownership is re-verified before terminating, so a recycled PID can never be hit by a stale row |
| Privilege badge | A header badge shows whether the DSH host is running elevated |

Columns are **Process** (with the executable path on a second line), **PID**, **Proto**, **Address:port**, **State** and **Action**. Headers align exactly with their data; the two fields you scan for are deliberately the loudest things in the row — the **process name** in the theme's brightest color at 16px bold, and the **port number** in the theme's success green at 16px bold, with the address text beside it stepped back so it cannot steal attention.

The panel takes over the center column the same way DSH's own **SSH** panel does, and follows the active skin and light/dark theme.

## Requirements

- **Windows only** — depends on `Get-NetTCPConnection` / `Get-NetUDPEndpoint` / `Get-CimInstance Win32_Process`.
- DSH `>= 0.1.2-rc.1`, web profile. Verified against DSH `0.1.6-alpha.2` on Node 24.
- No runtime dependencies and no build step: the shipped JavaScript *is* the source.
- Verified under both Windows PowerShell 5.1 and PowerShell 7 (`pwsh.exe` is preferred, `powershell.exe` is the fallback).

> **Privileges.** Which processes are visible, and whether a process owned by another user or a higher privilege level can be ended, depends on the privileges of the DSH host process itself. Running `dsh web` as Administrator gives the fullest capability; without elevation, protected or cross-privilege processes return an explicit failure reason rather than failing silently.

## Installation

### Option A — install straight from GitHub

```powershell
dsh plugin --profile web add github:<your-github-user>/dsh-process-manager
```

The package declares `dsh.bundle.patch` and has no build step, so pnpm can install it directly — nothing to allow-build and nothing to compile.

### Option B — link a local checkout (for development)

```powershell
# 1. Put the plugin anywhere, e.g. E:\plugins\dsh-process-manager
# 2. Add it to the web profile (link dependency + bundle row)
dsh plugin --profile web add link:E:/plugins/dsh-process-manager
```

`dsh plugin add` records the package in `~/.dsh/profiles/web/package.json` and, because the manifest declares `dsh.bundle.patch`, adds that layer to `dsh.profile.bundles` automatically.

### Option C — mount it by hand

Edit `~/.dsh/profiles/web/package.json`:

```jsonc
{
  "dependencies": {
    "dsh-process-manager": "link:E:/plugins/dsh-process-manager"
  },
  "dsh": {
    "profile": {
      "bundles": [
        // ...existing layers...
        "dsh-process-manager"
      ]
    }
  }
}
```

Then run `pnpm install` inside `~/.dsh/profiles/web`.

### Activating

```powershell
dsh web
```

After the restart a **Processes** entry appears in the sidebar, directly below *Skill center*.

> This is a host-process-level plugin: **editing the code requires a `dsh web` restart** to reload the host half and the browser bundle.

## Usage

1. Click **Processes** in the sidebar.
2. The panel scans once automatically; the **Refresh** button rescans (`Refresh` bypasses the 1.2 s cache and forces a fresh scan).
3. Use the search box to locate a port — type `8080` or `node`.
4. Click **End** on the row → check the process / PID / port / path in the confirmation dialog → **End process**.
5. A banner reports the result and the list refreshes itself (the port should be gone).

When one port is held by several processes, the PID column shows a `▸ 3` expander; expanding it lists each process on its own row, each with its own End button.

### Sorting

Click any column header to sort by it. Repeated clicks cycle **ascending → descending → back to the default**, where the default is the port-ascending order the panel loads with. The active column is shown in bold with a `▲` / `▼` marker, and `aria-sort` is kept in sync for assistive technology. The Action column does not sort.

## About "orphaned endpoints"

The panel does **not** list endpoints whose owning process has already exited, and says so honestly in a header badge: *"N orphaned endpoint(s) hidden"*.

This is Windows behavior, not a collection failure. When a process dies abnormally the kernel sometimes fails to reclaim its UDP endpoint records; those entries linger in the endpoint table for days (you can observe creation times well in the past) while the process itself is long gone — there is no name to look up and nothing left to terminate. They typically sit in the ephemeral range (49xxx–65xxx) and correspond to no usable service.

Set `hideOrphanedEndpoints` to `false` to list them anyway; the process column then reads *"process exited (orphaned endpoint)"*.

## Termination semantics

Termination has two tiers and targets exactly one PID — it **never kills a process tree**:

1. **Graceful close** — a `WM_CLOSE` is posted to processes that own a top-level window (the same request the window's ✕ makes), giving them `graceMs` (3000 ms by default) to save and exit.
2. **Forced termination** — a process that ignores the request past the grace window, or that owns no window / message loop at all (console programs, services, `node.exe` …), is ended with `Stop-Process -Force`.

Possible outcomes:

| Outcome | Meaning |
| --- | --- |
| `closed` | Accepted the close request and exited normally |
| `killed` | No graceful channel existed; ended directly |
| `killed-after-request` | Ignored the close request; forced after the grace window |
| `already-exited` | The target had already exited (treated as success) |
| `still-running` | The request was issued but the process is still alive (protected by the system, or waiting on a driver) |
| `denied` | Windows refused the termination — insufficient privileges |
| `protected` | Matched the protection list; nothing was attempted |
| `identity-changed` | The PID had been recycled by another process; the operation was cancelled |

## Security design

Terminating processes is a high-risk local operation, so every guard lives on the **host side** rather than trusting the UI:

1. **Loopback + same-origin fence** — both routes require a request from a loopback address with a loopback `Host` (the browser path additionally checks the same-origin markers). Expose `dsh web` to a LAN and these endpoints stop being served.
2. **Protection list** — anything with `PID ≤ 4`, plus these 19 process names (case-insensitive, `.exe` ignored): `system`, `idle`, `registry`, `memory compression`, `secure system`, `smss`, `csrss`, `wininit`, `winlogon`, `services`, `lsass`, `lsaiso`, `fontdrvhost`, `dwm`, `audiodg`, `svchost`, `sihost`, `wudfhost`, `explorer`. These hold Windows together — `lsass`, `wininit`, `services` and `csrss` are unrecoverable when killed, `svchost` hosts service groups (stop the service instead), and `audiodg`/`sihost`/`wudfhost` would take audio, the shell or the device host down with them. All are always refused; the full list lives in `CRITICAL_NAMES` in `lib/index.js`.
3. **DSH's own lineage** — the DSH host process (`process.pid`) and every one of its ancestors are marked protected; ending one means cutting the session you are working in.
4. **PID-recycling guard** — before terminating, the host rescans and requires that the PID *still owns the port you clicked* and that its name is unchanged; otherwise the operation is cancelled.
5. **Graceful before forced** — see the previous section.
6. **Tightenable** — `protectedNames` appends to the protection list (e.g. `["nginx","java"]`), and `allowNonLoopback` explicitly lifts the loopback restriction (off by default; not recommended).

## Configuration

`cordis.patch.yml` (or the `config` of that row inside the profile) accepts:

```yaml
- insert:
    - id: process-manager
      name: 'dsh-process-manager'
      config:
        graceMs: 3000               # graceful-close window in milliseconds
        cacheMs: 1200               # snapshot cache, avoids repeated scans
        collectTimeoutMs: 30000     # per-scan timeout
        terminateTimeoutMs: 30000
        powershellPath: ''          # empty = auto-detect pwsh.exe -> powershell.exe
        protectedNames: []          # extra protected names, e.g. ['nginx', 'java']
        allowNonLoopback: false     # keep false in production
        hideOrphanedEndpoints: true # hide endpoints whose process has exited
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/dsh-process-manager/list` | The snapshot merged by port (`?fresh=1` bypasses the cache) |
| `POST` | `/api/dsh-process-manager/terminate` | Body: `{ pid, port, transport, name, graceMs? }` |

Both require a loopback origin and return `403` otherwise. In the snapshot's `summary`, `ports` is the number of listed ports, `orphaned` the number of hidden orphaned endpoints, and `protectedPids` the number of protected processes.

## How it works

```
Browser                          DSH host process
┌──────────────────────┐        ┌────────────────────────────────────────┐
│ lib/client.js        │  HTTP  │ lib/index.js                           │
│  · sidebar entry     │ ─────► │  · /api/dsh-process-manager/*  routes   │
│  · center panel      │        │  · fence / protection / PID checks      │
└──────────────────────┘        │  · snapshot cache                      │
                                └───────────────┬────────────────────────┘
                                                │ -File invocation, NDJSON back
                                ┌───────────────▼────────────────────────┐
                                │ lib/scripts/collect.ps1                │
                                │ lib/scripts/terminate.ps1              │
                                └────────────────────────────────────────┘
```

- **Host half** (`lib/index.js`) — registers the two routes and owns the trust fence, the protection verdict, port merging, the PID-recycling check, the snapshot cache, and parsing of the PowerShell NDJSON output into the rows the panel renders.
- **PowerShell scripts** (`lib/scripts/*.ps1`) — the only code that reads system state or terminates anything. JSON is encoded by hand so the output is byte-identical under Windows PowerShell 5.1 and PowerShell 7.
- **Browser half** (`lib/client.js`) — DSH exposes no slot an external plugin can register into for the sidebar or the center column, so the panel uses the same DOM-injection approach as the community plugins: the entry row is inserted after the New Session button and after the sibling plugin rows (task board / SSH / skill center) and self-heals through a `MutationObserver` when React re-renders; the panel container is appended to the center column as an extra child and toggled by `data-dsh-procmgr-active` on `<html>`, mutually exclusive with the SSH and task-board panels.

## Development

```powershell
node test/host.test.mjs      # or: npm test
```

The tests drive the **real** route handlers and PowerShell scripts through a fake cordis context, covering: listing and grouping, live processes never being misreported, hiding vs. exposing orphaned endpoints, PID 4 / DSH self protection, non-loopback and cross-site rejection, method validation, stale-port rejection, and one genuine end-to-end path (start a listener → discover it in the list → terminate it → confirm the port is released).

Styling follows the theme: the panel uses only `--dsw-alias-*` design variables (`bg-base` / `label-primary` / `label-tertiary` / `border-l1` / `state-*`) and hard-codes no colors, so dark, light and skinned themes all render correctly.

## Known limitations

- Windows only. Linux / macOS would need a different collector (`ss -tulpn` / `lsof -i`).
- Lists **listening** endpoints only — no `ESTABLISHED` connections, which matches the "who took my port" goal.
- No traffic statistics; a snapshot is the state at the moment of the refresh.
- The collector runs in full on every scan (~2–3 s for 150+ endpoints on the author's machine), hence the 1.2 s cache and on-demand refresh strategy; there is no background polling.
- Orphaned endpoints (owning process gone) are hidden by default — see above. This is the Windows endpoint-table behavior, not a collection failure.
- Processes protected by the system, or owned at a different privilege level, show as non-terminable or return `denied`. That is a Windows restriction, not a defect in the plugin.

## License

[MIT](./LICENSE)