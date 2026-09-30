# dsh-notifier

**English** · [简体中文](./README.zh.md)

> Native desktop notifications for the [DSH](https://www.npmjs.com/package/@deepseek-ai/dsh) Web GUI: the moment DSH needs you — a question, an approval, a finished task, a failure — you get a real OS notification, so you can tell at a glance whether it's time to switch back.

DSH runs long tasks. You start one, then switch to another browser tab or another application and get on with your day. The problem is you have no idea when it's done — or worse, when it has been sitting there waiting for an answer. This plugin closes that loop: it turns "DSH needs your attention" into something your operating system tells you, on whatever screen you are already looking at.

```
  You:  "DSH, refactor the auth module"  ──►  switch to another window
                                                      │
  DSH:  running… ──► needs a decision ──► ╔═══════════════════════════╗
                                          ║  DSH — Approval required  ║
                                          ║  Tool: shell command      ║
                                          ║  Reason: needs elevation  ║
                                          ╚═══════════════════════════╝
                                                      │
  You:  notice it, switch back, answer
```

## Features

| Event | Default | What you get |
| --- | --- | --- |
| **Asking you a question** | on | Task title plus the question text, so you can judge whether it needs you now |
| **Approval request** | on | Task title, localized tool name, the stated reason, and what to do about it |
| **Task finished** | on | Task title and elapsed time |
| **Task failed** | on | Turn/step position and the error message; repeats of the same error collapse within 60s |
| **Subagent finished** | off | Separate switch, so delegated work never masquerades as your main task finishing |
| **Turn finished** | off | Fires on `agent/turn-stopping`, for people who want finer-grained pings |

Beyond the event table:

- **Two delivery channels, independently switchable.** System notifications are native OS toasts — Windows PowerShell WinRT, macOS `osascript`, Linux `notify-send` — none of which need anything installed. Browser notifications ride an SSE stream into the Notification API.
- **Three switches per channel** — *enabled* (does it send at all), *popup* (does a notification appear), *sound* (does it make noise, and which tone). Disabling a channel stops delivery entirely; popup and sound are then independent of each other.
- **Four built-in tones** — `ding`, `bell`, `chime`, `pop` — each previewable, plus "follow the system default" and silence.
- **Quiet hours** — up to five windows, midnight-crossing supported, with per-event exemptions for the things you always want through.
- **Push channels** — Bark for iOS, and a templated Webhook channel for ntfy / Gotify / your own gateway on Android.
- **Approval re-reminder** — if an approval sits unanswered past a configurable delay, it nudges you again.
- **Finish-storm collapse** — several tasks wrapping up together become one line instead of ten.
- **Graceful degradation** — on a non-secure origin the browser refuses system-level popups, so the plugin falls back to an in-page banner plus tone and title flashing.
- **Notification history** — the last 200 records, each with a per-channel delivery breakdown.
- **Capability self-check** — the settings card tells you whether popup and sound actually work on this host, and what to do when they do not.
- **Redaction** — notification text passes through a rule table before it leaves the process, shrinking the blast radius of paths and credentials embedded in error messages.

## Requirements

- DSH **0.2.x**, running as the `web` profile
- Node.js ≥ 20
- Windows, macOS, or Linux. On Windows the system-toast path uses Windows PowerShell 5.1's WinRT bindings; nothing extra to install.

## Installation

### Option A — install from a Git repository

```sh
dsh plugin --profile web add github:<owner>/<repo>#path:dsh-notifier
```

### Option B — link a local checkout (for development)

```sh
# 1. Put the plugin anywhere, e.g. E:\plugins\dsh-notifier
# 2. Link it into the web profile
dsh plugin --profile web add link:E:/plugins/dsh-notifier
```

### Activating

Restart `dsh web`. Plugin bundles are composed once at startup, so a running instance will not pick up the new plugin.

```sh
dsh web
```

Then confirm it mounted:

```sh
curl http://127.0.0.1:3080/api/dsh-notifier/health
```

A healthy answer looks like this:

```json
{
  "ok": true,
  "plugin": "dsh-notifier",
  "platform": "win32",
  "capabilities": {
    "host": {
      "verdict": "ok",
      "unknownDimensions": [],
      "popup": { "state": "ok" },
      "sound": { "state": "ok" }
    }
  }
}
```

## Usage

Open **Settings → Plugins → dsh-notifier**. Everything lives on that one card: the event switches, the two built-in channel rows, the push-channel list, quiet hours, and the notification history. There is a **Send a test notification** button at the top — press it first, before you trust the plugin with anything that matters.

### Which machine makes the noise

Worth being precise about, because the two channels land in different places:

- **System notifications** appear on the desktop of the machine *running* `dsh web`. If DSH runs on a headless Linux box, the toast appears on that box, not on your laptop. The settings card and `/health` report whether this channel is usable where the host actually is.
- **Browser notifications** appear in whichever browser you are using, wherever that browser is. As long as the browser grants permission, you get the notification on your own machine even when the host is somewhere else.

On Windows the first channel is the one you want, and it is what the capability report above is checking.

## Configuration

Settings live in a file the plugin owns:

```
$DSH_HOME/dsh-notifier/config.json        # default: ~/.dsh/dsh-notifier/config.json
```

Alongside it in the same directory: `history.jsonl` (notification history), `status.json` (per-channel delivery state), `seq.json` (SSE sequence counter), and `version` (the migration chain's watermark).

The settings card is the recommended way to edit this. If you edit the file by hand, the plugin tolerates unknown keys — they are preserved on write rather than dropped — but invalid values for known keys are discarded back to their defaults on read.

Credential fields (Bark `deviceKey`, webhook `token` / `password` / `headerValue`) are always masked in API responses. Submitting the mask back means "leave it unchanged", matched by channel id, so reordering channels cannot cross-wire credentials.

## API

Every route is loopback-fenced: it only accepts calls from `127.0.0.1` / `::1` with a matching origin.

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/dsh-notifier/config` | GET / PUT | Read or patch configuration |
| `/api/dsh-notifier/events` | GET | SSE notification stream; `?since=<seq>` backfills after a reconnect |
| `/api/dsh-notifier/test` | POST | Send a test notification; an optional `draft` body exercises unsaved channel edits without persisting anything |
| `/api/dsh-notifier/history` | GET / DELETE | Notification history |
| `/api/dsh-notifier/status` | GET | Per-channel delivery state and consecutive-failure counts |
| `/api/dsh-notifier/kinds` | GET / POST | Dynamic event kinds and their confirmation state |
| `/api/dsh-notifier/health` | GET | Health and a compact capability summary |
| `/api/dsh-notifier/diagnostics` | GET | Full host capability probe, with per-dimension detail and remediation hints |

> **Accessing over a LAN.** Connecting a browser straight to `http://<host-ip>:3080` makes every route above return **403**. That is the loopback fence doing its job, not a fault. Use `http://127.0.0.1:3080`, an SSH tunnel, or a TLS reverse proxy instead. Browser notifications additionally require a secure context, so a plain-HTTP LAN origin falls back to the banner path regardless.

## How it works

**Host half.** The plugin registers against DSH's host services and listens to the events that mean "a human is needed": `user-questions/request`, `approval/request`, `agent/error`, `agent/status`, `agent/turn-stopping`, and `session/event`. A small pipeline translates those host events into the plugin's own vocabulary, judges them (quiet hours, event switches, routing), and hands the result to however many delivery channels are enabled.

Task completion is decided from two sources rather than one: the live `session/event` stream is the primary evidence, and a snapshot read back from the session is the fallback for the window where the plugin mounted late or reloaded. A turn that ended because it was aborted, interrupted, or errored deliberately stays silent — the error path already reports it, and saying both "finished" and "failed" about the same turn is worse than saying one true thing.

**Browser half.** The host pushes notification frames over SSE; the browser half subscribes with `EventSource`, deduplicates by sequence number, and reconnects with `?since=` so nothing is lost across a reload. Only one browser tab actually raises notifications — tabs coordinate through a lease, so opening a second tab does not double every alert.

**Delivery and failure.** A notification that fails to deliver is logged, never thrown. A missing native binary is caught and reported; it cannot bubble up and take the host process down.

## Development

```sh
pnpm install
pnpm run build      # clean-lib → tsc → esbuild bundle
pnpm run typecheck
pnpm test
```

`pnpm run build` produces:

| Artifact | Contents |
| --- | --- |
| `lib/index.js` | Host half, self-contained: its only imports are `node:*` builtins, no runtime npm dependencies |
| `lib/client.js` | Browser half, wrapped in the `__ModuleLoader__.load` contract shell; React is injected by the host |
| `lib/server/channels/impl/system/toast.ps1` | The Windows toast script, shipped with the package and given a UTF-8 BOM at build time |
| `lib/**/*.d.ts` | Type declarations |

The browser half is built by esbuild into a single contract shell; React and the DSH client packages are left external and resolved by the loader's injected `require`. The build fails loudly if the emitted load id does not equal the package name, so a mis-wired bundle can never reach a release.

### Layout

```
src/
  index.ts                 host entry: composition root
  server/
    api/                   loopback-fenced HTTP routes
    channels/              delivery channels: system, browser, bark, webhook, dry-run
    config/                configuration model, validation, redaction
    events/                host-event adapters and translation
    pipeline/              judging and routing
    stores/                history and status persistence
    upgrade/               storage migration chain
    sdk/                   the service face other plugins may consume
  client/                  settings card, notification logic, audio, locales
  vendor/                  shared primitives (paths, atomic IO, SSE hub, upgrade chain)
test/
  unit/ integration/ client-unit/ client-dom/ bundle/ e2e/
```

### Test layers

| Layer | Directory | Environment |
| --- | --- | --- |
| unit | `test/unit/**` | node |
| integration | `test/integration/**` | node |
| client-unit | `test/client-unit/**` | node |
| client-dom | `test/client-dom/**` | happy-dom |
| bundle | `test/bundle/**` | node |
| e2e | `test/e2e/**` | node |

A handful of cases are only meaningful on POSIX — they inject failures through `chmod` permission bits, run `#!/bin/sh` stub scripts, or drive the D-Bus command-line tools. On Windows those skip explicitly rather than reporting a false failure.

## Known limitations

- **Loopback only.** The API refuses non-loopback callers by design. Remote use needs a tunnel or a TLS reverse proxy.
- **Browser notifications need a secure context.** `http://127.0.0.1` counts; a plain-HTTP LAN origin does not, and falls back to the banner path.
- **iOS Safari.** Web Notifications are unavailable in an ordinary tab; add the page to the Home Screen for PWA-grade notifications. The banner-plus-tone path still works meanwhile.
- **Browser sound needs one interaction.** Autoplay policy means a page that has never been interacted with may stay silent. Notifications still appear.
- **The first capability probe can take up to 8 seconds.** Results are cached afterwards.