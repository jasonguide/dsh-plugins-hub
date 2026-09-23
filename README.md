# dsh-plugins-hub

**English** · [简体中文](./README.zh.md)

A DeepSeek Harness (DSH) Plugin Center, featuring implementations of practical ideas for daily use。一个 DeepSeek Harness (DSH) 插件中心，包含一些日常使用中的想法实现。

Every plugin lives in its own top-level directory and is independently installable — this repository is a home for them, not a package itself.

## Plugins

| Plugin | Description | License |
| --- | --- | --- |
| [`dsh-process-manager`](./dsh-process-manager) | Windows process & listening-port panel for the DSH Web GUI: one sidebar entry listing every local listening port (process, PID, protocol, address, path) with the ability to end the process behind one — gracefully first. | MIT |
| [`dsh-skills-hub`](./dsh-skills-hub) | Cross-platform AI Skills manager: keeps `~/.agents/skills` as the central library and symlinks the same skill into Claude Code, Cursor, Codex, Gemini CLI, Trae, Windsurf and others — install, uninstall and inspect from one place. | MIT |

Each directory is a complete, standalone plugin package with its own `package.json`, `README.md`, `LICENSE` and tests.

## Installing a plugin

Each plugin installs on its own, straight from this repository, using pnpm's git subdirectory form (`#path:<dir>`):

```powershell
dsh plugin --profile web add github:jasonguide/dsh-plugins-hub#path:dsh-process-manager
```

Swap `#path:` for another plugin's directory name to install that one.

Or clone and link the subdirectory locally (handy while developing):

```powershell
git clone https://github.com/jasonguide/dsh-plugins-hub
dsh plugin --profile web add link:E:/path/to/dsh-plugins-hub/dsh-process-manager
```

Restart `dsh web` afterwards — DSH plugins are host-process level, so the host half and the browser bundle are both composed at startup.

Refer to each plugin's own README for requirements, configuration and usage.

## Repository layout

```
dsh-plugins-hub/
├── dsh-process-manager/     # standalone plugin package
│   ├── lib/                 # host half, browser half, PowerShell scripts
│   ├── test/                # host-side tests
│   ├── cordis.patch.yml     # bundle patch that inserts the plugin row
│   └── package.json         # declares dsh.bundle.patch + dsh.client
├── dsh-skills-hub/          # standalone plugin package
└── README.md
```

Each plugin follows the same shape: the package declares `dsh.bundle.patch` (how its row joins the DSH profile) and `dsh.client` (that it has a browser half). Nothing is centralised — adding a plugin means adding a directory.

## Conventions for a plugin in this repository

- **Self-contained.** All of a plugin's source, tests, documentation and license live inside its own directory. No cross-plugin imports.
- **Zero build step preferred.** Shipped JavaScript is the source, so `dsh plugin add` never needs a compile step or a pnpm build-script approval.
- **Own README and LICENSE.** Each directory documents and licenses itself; this root README only indexes them.
- **Tests run from the plugin directory** with a plain `node test/...` — no monorepo-wide tooling, so any single plugin can be cloned out on its own.

## Not in this repository

Two plugins are deliberately kept out of version control, and the root `.gitignore` enforces it:

- `dsh-mcp` — [ArvinQi/dsh-mcp](https://github.com/ArvinQi/dsh-mcp), another author's project.
- `dsh-pocket-pro` — a fork of [shaobeichen/dsh-pocket](https://github.com/shaobeichen/dsh-pocket), licensed GPL-2.0.

They can sit in the working tree for local development, but they are not this repository's code, and keeping a GPL-2.0 codebase out of an MIT-licensed repository avoids a license conflict.

## License

Each plugin is licensed individually under the terms in its own directory. All plugins currently in this repository are MIT.
