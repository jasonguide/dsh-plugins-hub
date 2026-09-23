/**
 * dsh-process-manager — browser half.
 *
 * Mounts two DOM surfaces into the dsh web GUI, mirroring the way the SSH and
 * task-board panels do it (the shell exposes no slot an external plugin can
 * register into):
 *
 *   1. A sidebar entry row injected after the New Session button and after the
 *      sibling plugin rows, self-healing on React re-renders.
 *   2. A center-column panel: a container appended inside the conversation
 *      column that React never manages, shown by an attribute on <html> while
 *      the conversation subtree stays mounted underneath.
 *
 * The panel itself is plain React (createElement, no JSX) so this file needs no
 * build step.
 *
 * Failure policy: DOM problems are logged, never thrown — the web shell fails
 * the whole boot when a plugin apply throws, and a plugin must not take the
 * GUI down.
 */

window.__ModuleLoader__.load({
  id: 'dsh-process-manager',
  factory: (require) => {
    const React = require('react')
    const { createRoot } = require('react-dom/client')

    var module = { exports: {} }
    var exports = module.exports

    const h = React.createElement

    /** Route paths mirrored from the host half. */
    const API = {
      list: '/api/dsh-process-manager/list',
      terminate: '/api/dsh-process-manager/terminate',
    }

    /** Locale namespace owned by this plugin. */
    const NS = 'dsh-process-manager'

    /** Attribute identifying the injected sidebar row. */
    const ENTRY_ATTRIBUTE = 'data-dsh-procmgr-entry'
    const ENTRY_SELECTOR = `[${ENTRY_ATTRIBUTE}]`
    /** <html> attribute set while the panel owns the center column. */
    const ACTIVE_ATTRIBUTE = 'data-dsh-procmgr-active'
    /** Attributes of the sibling center-column panels this one must evict. */
    const SIBLING_ATTRIBUTES = ['data-dsh-ssh-active', 'data-dsh-taskboard-active']
    /** Cross-plugin activation event; detail is the activating panel name. */
    const ACTIVATE_EVENT = 'dsh-panel-activate'
    const PANEL_NAME = 'procmgr'
    /** Sidebar rows whose click hands the center column back to the conversation. */
    const SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]'
    /** Center column container, across shell versions. */
    const CENTER_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]'
    /** Sibling plugin rows this row orders itself against. */
    const FAMILY_SELECTORS = ['[data-dsh-taskboard-entry]', '[data-dsh-ssh-entry]', '[data-dsh-skill-explorer-entry]']

    /** Inline glyph sized to the shell's sidebar navigation icons. */
    const ICON = '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.75" y="2.25" width="12.5" height="11.5" rx="1.75"/><path d="M4.5 5.9h3.2"/><path d="M4.5 8.6h2"/><circle cx="11" cy="5.9" r="1.05"/><circle cx="11" cy="8.6" r="1.05"/></svg>'

    // ------------------------------------------------------------- copy ----

    const ZH = {
      'entry.label': '进程管理',
      'entry.tooltip': '进程管理：查看本机监听端口并结束占用端口的进程',
      'panel.title': '进程管理',
      'panel.subtitle': '本机监听端口 · 按端口合并',
      'action.refresh': '刷新',
      'action.back': '返回会话',
      'action.terminate': '终止',
      'action.cancel': '取消',
      'action.confirm': '确认终止',
      'action.dismiss': '知道了',
      'search.placeholder': '搜索 程序名 / PID / 端口 / 路径',
      'search.clear': '清空搜索',
      'column.name': '程序名',
      'column.pid': 'PID',
      'column.protocol': '协议',
      'column.address': '本地地址:端口',
      'column.state': '状态',
      'column.action': '操作',
      'state.listening': 'LISTENING',
      'state.bound': 'BOUND',
      'badge.admin': '管理员权限',
      'badge.standard': '普通权限',
      'badge.protected': '受保护',
      'summary': '{ports} 个端口 / {endpoints} 个端点 · {tcp} TCP · {udp} UDP',
      'scanned': '扫描于 {time} · 耗时 {ms} ms',
      'loading': '正在读取本机端口…',
      'empty': '没有匹配的端口。',
      'empty.initial': '暂无数据，点击「刷新」重新扫描。',
      'error.title': '读取失败',
      'error.retry': '重试',
      'multi': '{count} 个进程',
      'expand': '展开进程列表',
      'collapse': '收起进程列表',
      'pid.detail': 'PID {pid}',
      'unknown.name': '（进程信息不可用）',
      'dead.name': '进程已退出（残留端点）',
      'sort.hint': '点击按「{column}」排序（升序 / 降序 / 恢复默认）',
      'orphaned': '已隐藏 {count} 个无主端点',
      'orphaned.hint': '这些端点所属的进程已经退出，Windows 仍保留其 UDP 记录；既无法显示进程名，也无法终止，因此默认不列出。需要查看时把 hideOrphanedEndpoints 设为 false。',
      'protected.hint': '该进程受保护，不可终止',
      'confirm.title': '确认终止进程？',
      'confirm.body': '即将结束以下进程，占用端口将被释放：',
      'confirm.name': '进程',
      'confirm.pid': 'PID',
      'confirm.port': '端口',
      'confirm.path': '路径',
      'confirm.warning': '先尝试优雅关闭（无窗口的进程会直接结束），未在宽限期内退出才强制终止。',
      'busy': '正在处理…',
      'scan.errors': '采集过程中有 {count} 项警告',
      'killed.by': '{name}（PID {pid}）',
    }

    const EN = {
      'entry.label': 'Processes',
      'entry.tooltip': 'Processes: inspect local listening ports and end the process behind one',
      'panel.title': 'Processes',
      'panel.subtitle': 'Local listening ports · grouped by port',
      'action.refresh': 'Refresh',
      'action.back': 'Back',
      'action.terminate': 'End',
      'action.cancel': 'Cancel',
      'action.confirm': 'End process',
      'action.dismiss': 'Dismiss',
      'search.placeholder': 'Search name / PID / port / path',
      'search.clear': 'Clear search',
      'column.name': 'Process',
      'column.pid': 'PID',
      'column.protocol': 'Protocol',
      'column.address': 'Local address:port',
      'column.state': 'State',
      'column.action': 'Action',
      'state.listening': 'LISTENING',
      'state.bound': 'BOUND',
      'badge.admin': 'Administrator',
      'badge.standard': 'Standard user',
      'badge.protected': 'Protected',
      'summary': '{ports} ports / {endpoints} endpoints · {tcp} TCP · {udp} UDP',
      'scanned': 'Scanned {time} · {ms} ms',
      'loading': 'Reading local ports…',
      'empty': 'No matching port.',
      'empty.initial': 'No data yet — press Refresh to scan again.',
      'error.title': 'Scan failed',
      'error.retry': 'Retry',
      'multi': '{count} processes',
      'expand': 'Expand process list',
      'collapse': 'Collapse process list',
      'pid.detail': 'PID {pid}',
      'unknown.name': '(process details unavailable)',
      'dead.name': 'process exited (orphaned endpoint)',
      'sort.hint': 'Sort by {column} (ascending / descending / default order)',
      'orphaned': '{count} orphaned endpoint(s) hidden',
      'orphaned.hint': 'These endpoints outlived their owning process; Windows keeps the UDP records but there is nothing to name or terminate. Set hideOrphanedEndpoints to false to list them.',
      'protected.hint': 'Protected process — cannot be ended',
      'confirm.title': 'End this process?',
      'confirm.body': 'The following process will be ended and its port released:',
      'confirm.name': 'Process',
      'confirm.pid': 'PID',
      'confirm.port': 'Port',
      'confirm.path': 'Path',
      'confirm.warning': 'A graceful close is requested first; a process without a window is ended directly, and one that ignores the request past the grace window is terminated.',
      'busy': 'Working…',
      'scan.errors': '{count} warning(s) during collection',
      'killed.by': '{name} (PID {pid})',
    }

    /** Detected document language, used until the locale service answers. */
    let fallbackLang = (typeof navigator !== 'undefined' && typeof navigator.language === 'string' &&
      navigator.language.toLowerCase().startsWith('zh')) ? 'zh' : 'en'
    /** Locale-service translate seat; absent when that service is not mounted. */
    let translate = null

    function t(key, vars) {
      let text
      if (translate !== null) {
        try {
          const value = translate(key)
          if (typeof value === 'string' && value !== '' && value !== key) text = value
        } catch {
          // Fall through to the built-in dictionary.
        }
      }
      if (text === undefined) {
        const dictionary = fallbackLang === 'zh' ? ZH : EN
        text = dictionary[key] ?? ZH[key] ?? key
      }
      if (vars === undefined) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] === undefined ? match : String(vars[name])))
    }

    // -------------------------------------------------------------- css ----

    const CSS = `
/* --- center-column takeover (attribute-scoped global rules) ---------------- */
[data-pane='conversation'],
[class*='centerCol'] { position: relative; }

[data-dsh-procmgr-view] {
  position: absolute;
  inset: 0;
  display: none;
  z-index: 60;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
}

html[data-dsh-procmgr-active] [data-dsh-procmgr-view] { display: block; }

html[data-dsh-procmgr-active] [data-pane='conversation'] > :not([data-dsh-procmgr-view]),
html[data-dsh-procmgr-active] [class*='centerCol'] > :not([data-dsh-procmgr-view]) { display: none !important; }

/* --- sidebar entry row ----------------------------------------------------- */
.dsh-pm-entry {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  text-align: left;
}
.dsh-pm-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(127, 127, 127, 0.12));
  color: var(--dsw-alias-label-primary);
}
.dsh-pm-entry[data-active] {
  background: var(--dsw-alias-interactive-bg-active, rgba(127, 127, 127, 0.18));
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.dsh-pm-entry-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; flex: none; }
.dsh-pm-entry-icon svg { display: block; width: 18px; height: 18px; }
.dsh-pm-entry-label { overflow: hidden; text-overflow: ellipsis; }

[data-dsh-frame][data-sidebar-collapsed] .dsh-pm-entry,
[data-sidebar-collapsed] .dsh-pm-entry {
  justify-content: center;
  padding: 0;
  width: 36px;
  min-height: 36px;
  margin: 0 auto 12px;
  border-radius: 50%;
}
[data-dsh-frame][data-sidebar-collapsed] .dsh-pm-entry-label,
[data-sidebar-collapsed] .dsh-pm-entry-label { display: none; }

/* --- panel frame ----------------------------------------------------------- */
.dsh-pm-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.dsh-pm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-pm-title { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dsh-pm-title h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsh-pm-title p { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dsh-pm-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
.dsh-pm-header-actions { display: flex; align-items: center; gap: 8px; flex: none; }

.dsh-pm-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dsh-pm-badge[data-tone='brand'] { color: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); }
.dsh-pm-badge[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }

.dsh-pm-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-pm-button:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.dsh-pm-button:disabled { opacity: 0.5; cursor: default; }
.dsh-pm-button[data-variant='primary'] { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; }
.dsh-pm-button[data-variant='danger'] { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dsh-pm-button[data-size='small'] { padding: 2px 10px; font-size: 11px; }

.dsh-pm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 22px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-pm-search { position: relative; flex: 1; max-width: 420px; }
.dsh-pm-search input {
  box-sizing: border-box;
  width: 100%;
  padding: 6px 30px 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  outline: none;
}
.dsh-pm-search input:focus { border-color: var(--dsw-alias-brand-primary); }
.dsh-pm-search button {
  position: absolute;
  top: 50%;
  right: 4px;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 4px 6px;
}
.dsh-pm-toolbar-note { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-left: auto; }

.dsh-pm-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 12px 22px 0;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  font-size: 12px;
}
.dsh-pm-banner[data-level='success'] { border-color: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); }
.dsh-pm-banner[data-level='error'] { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dsh-pm-banner[data-level='info'] { color: var(--dsw-alias-label-secondary); }
.dsh-pm-banner-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.dsh-pm-banner-detail { color: var(--dsw-alias-label-secondary); word-break: break-all; }

.dsh-pm-body { flex: 1; min-height: 0; overflow: auto; padding: 12px 22px 22px; }

.dsh-pm-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dsh-pm-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
  font-weight: 500;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-base);
  padding: 6px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dsh-pm-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  vertical-align: top;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-pm-table tbody tr:hover { background: var(--dsw-alias-bg-layer-1); }
.dsh-pm-table tr[data-protected='true'] td { color: var(--dsw-alias-label-secondary); }
.dsh-pm-table tr[data-child='true'] { background: var(--dsw-alias-bg-layer-1); }
.dsh-pm-mono { font-family: var(--ds-font-family-code, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace); font-size: 12px; }

/* Process name: the table's identity column, so it carries the brightest text
   color at a larger size and stays bright on protected rows too (the rule above
   only mutes the surrounding cells). */
.dsh-pm-name {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--dsw-alias-label-primary);
}
/* Executable path shown beneath the name. */
.dsh-pm-name-path {
  font-size: 13px;
  line-height: 1.4;
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}
/* The port number is what this panel is about. It gets the theme's success
   color (green, the one hue that separates itself from this UI's blue-grey
   palette) at the same size as the process name, so the two things a user
   scans for are the two largest, boldest fields in the row. */
.dsh-pm-port {
  font-weight: 700;
  font-size: 16px;
  color: var(--dsw-alias-state-success-primary);
}
/* The address beside it steps back to the tertiary text color: the highlight
   only reads as a highlight if its neighbour is quieter, and the default
   secondary grey is brighter than the green. */
.dsh-pm-addr {
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
  font-size: 12px;
}
.dsh-pm-path { color: var(--dsw-alias-label-secondary); font-size: 11px; }
.dsh-pm-pids { display: flex; align-items: center; gap: 6px; }
.dsh-pm-expand {
  border: 1px solid var(--dsw-alias-border-l1);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  padding: 2px 5px;
}
.dsh-pm-lock { color: var(--dsw-alias-state-warn-primary); font-size: 11px; }
/* Left-aligned like every other cell, so the header sits directly above the
   controls it labels. */
.dsh-pm-cell-actions { text-align: left; }

/* Sortable column headers: the whole header is the control. */
.dsh-pm-sort {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: -4px -6px;
  padding: 4px 6px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-pm-sort:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-pm-sort[data-active='true'] { color: var(--dsw-alias-label-primary); font-weight: 600; }
.dsh-pm-sort-arrow { font-size: 9px; color: var(--dsw-alias-brand-primary); }

.dsh-pm-empty { padding: 40px 0; text-align: center; color: var(--dsw-alias-label-secondary); }

/* --- confirm dialog -------------------------------------------------------- */
.dsh-pm-overlay {
  position: absolute;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.42);
  padding: 24px;
}
.dsh-pm-dialog {
  width: min(460px, 100%);
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  overflow: hidden;
}
.dsh-pm-dialog header { padding: 14px 18px 10px; font-size: 14px; font-weight: 600; }
.dsh-pm-dialog-body { padding: 0 18px 14px; display: flex; flex-direction: column; gap: 10px; }
.dsh-pm-kv { display: grid; grid-template-columns: 72px 1fr; gap: 4px 10px; font-size: 12px; }
.dsh-pm-kv dt { color: var(--dsw-alias-label-secondary); margin: 0; }
.dsh-pm-kv dd { margin: 0; word-break: break-all; }
.dsh-pm-dialog-note { font-size: 11px; color: var(--dsw-alias-label-secondary); line-height: 1.5; }
.dsh-pm-dialog footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
`

    /** Inject the plugin stylesheet once per client run. */
    function injectStyles() {
      const element = document.createElement('style')
      element.setAttribute('data-dsh-procmgr-style', '')
      element.textContent = CSS
      document.head.append(element)
      return () => { element.remove() }
    }

    // ------------------------------------------------------- panel mount ----

    /**
     * Sidebar entry injection core: the shell exposes no slot for an external
     * plugin row, so the row is plain DOM inserted after the New Session button
     * and the sibling plugin rows. It self-heals through a MutationObserver
     * whenever a React re-render displaces it.
     * @returns disposer removing the row and its observers.
     */
    function mountSidebarEntry() {
      if (document.querySelector(ENTRY_SELECTOR) !== null) return () => {}

      const entry = document.createElement('button')
      entry.type = 'button'
      entry.setAttribute(ENTRY_ATTRIBUTE, '')
      entry.setAttribute('data-dsh-plugin', 'process-manager')
      entry.setAttribute('data-dsh-part', 'sidebar-entry')
      entry.className = 'dsh-pm-entry'
      const icon = document.createElement('span')
      icon.className = 'dsh-pm-entry-icon'
      icon.innerHTML = ICON
      const label = document.createElement('span')
      label.className = 'dsh-pm-entry-label'
      entry.append(icon, label)

      const applyLabel = () => {
        entry.setAttribute('aria-label', t('entry.label'))
        entry.setAttribute('title', t('entry.tooltip'))
        label.textContent = t('entry.label')
      }
      applyLabel()
      entry.addEventListener('click', () => { controller.toggle() })

      const findRoot = () => {
        const column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]')
        if (column === null) return undefined
        const logoOwner = column.querySelector('[class*="logoRow"]')?.parentElement
        return logoOwner ?? column.firstElementChild ?? undefined
      }

      const place = (root) => {
        const nested = root.querySelector('button[class*="newSession"]')
        let base = nested
        if (base === null) {
          base = [...root.children].find((child) => child.tagName === 'BUTTON') ?? null
        }
        if (base === null) return false
        const row = base.closest('[class*="logoRow"]')
        const anchorBase = row !== null && row.parentElement === root ? row : base
        const family = [...root.children].filter(
          (element) => element instanceof HTMLElement && element.matches(FAMILY_SELECTORS.join(', ')),
        )
        // Insert after the sibling plugin block, so the row lands directly
        // below the skill center and cannot reorder when siblings self-heal.
        const anchor = family.length > 0
          ? family[family.length - 1].nextElementSibling
          : anchorBase.nextElementSibling
        root.insertBefore(entry, anchor)
        return true
      }

      let root
      let placed = false
      const tryPlace = () => {
        if (root !== undefined && !root.isConnected) {
          rootObserver.disconnect()
          root = undefined
          placed = false
        }
        if (placed) {
          if (document.body.contains(entry)) return
          rootObserver.disconnect()
          root = undefined
          placed = false
        }
        root ??= findRoot()
        if (root === undefined) return
        placed = place(root)
        if (placed) rootObserver.observe(root, { childList: true, subtree: true })
      }

      const waitObserver = new MutationObserver(() => { tryPlace() })
      waitObserver.observe(document.body, { childList: true, subtree: true })
      const rootObserver = new MutationObserver(() => {
        if (root === undefined || !root.isConnected) {
          placed = false
          tryPlace()
          return
        }
        if (!root.contains(entry)) placed = place(root)
      })

      const syncActive = () => {
        if (controller.isOpen()) entry.dataset.active = 'true'
        else delete entry.dataset.active
      }
      const unsubscribeActive = controller.subscribe(syncActive)
      const unsubscribeLocale = subscribeLocale(() => { applyLabel() })
      syncActive()
      tryPlace()

      return () => {
        waitObserver.disconnect()
        rootObserver.disconnect()
        unsubscribeActive()
        unsubscribeLocale()
        entry.remove()
      }
    }

    /**
     * Center-column takeover: append a container inside the conversation column
     * as an extra trailing child React never manages, and show it through an
     * attribute on <html> so the conversation subtree stays mounted.
     * @returns disposer unmounting the view and restoring the column.
     */
    function mountPanel() {
      let root
      let container

      const ensure = () => {
        if (container !== undefined) {
          if (container.isConnected) return
          root?.unmount()
          root = undefined
          container.remove()
          container = undefined
        }
        const column = document.querySelector(CENTER_SELECTOR)
        if (column === null) return
        container = document.createElement('div')
        container.setAttribute('data-dsh-procmgr-view', '')
        container.setAttribute('data-dsh-plugin', 'process-manager')
        column.append(container)
        root = createRoot(container)
        root.render(h(ProcessPanel, { controller }))
      }

      const waitObserver = new MutationObserver(() => { ensure() })

      const applyActive = () => {
        if (controller.isOpen()) {
          // The center column is single-occupant: opening this panel evicts the
          // sibling panels, or the two visibility rules fight.
          for (const attribute of SIBLING_ATTRIBUTES) document.documentElement.removeAttribute(attribute)
          document.documentElement.setAttribute(ACTIVE_ATTRIBUTE, '')
          document.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: PANEL_NAME }))
        } else {
          document.documentElement.removeAttribute(ACTIVE_ATTRIBUTE)
        }
      }
      const onOtherActivate = (event) => {
        if (event.detail !== PANEL_NAME && controller.isOpen()) controller.close()
      }
      const onClickSidebarRow = (event) => {
        if (!controller.isOpen()) return
        const target = event.target
        if (target === null || typeof target.closest !== 'function') return
        if (target.closest(SIDEBAR_ROW_SELECTOR) !== null) controller.close()
      }

      document.addEventListener(ACTIVATE_EVENT, onOtherActivate)
      document.addEventListener('click', onClickSidebarRow, true)
      const unsubscribe = controller.subscribe(applyActive)
      const unsubscribeLocale = subscribeLocale(() => {
        if (root !== undefined) root.render(h(ProcessPanel, { controller }))
      })
      applyActive()
      waitObserver.observe(document.body, { childList: true, subtree: true })
      ensure()

      return () => {
        document.removeEventListener(ACTIVATE_EVENT, onOtherActivate)
        document.removeEventListener('click', onClickSidebarRow, true)
        waitObserver.disconnect()
        unsubscribe()
        unsubscribeLocale()
        document.documentElement.removeAttribute(ACTIVE_ATTRIBUTE)
        root?.unmount()
        root = undefined
        container?.remove()
        container = undefined
      }
    }

    // ---------------------------------------------------------- controller ---

    function createController() {
      let open = false
      const listeners = new Set()
      const notify = () => {
        for (const listener of [...listeners]) {
          try { listener() } catch (error) { console.warn('[dsh-process-manager] listener failed:', error) }
        }
      }
      return {
        isOpen: () => open,
        subscribe(listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        toggle() { open = !open; notify() },
        close() { if (open) { open = false; notify() } },
      }
    }

    // ----------------------------------------------------------------- ui ----

    /** Format an ISO timestamp the way the panel header shows it. */
    function formatClock(iso) {
      if (typeof iso !== 'string') return '—'
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return '—'
      const pad = (value) => String(value).padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    }

    /** Human label for one process entry. */
    function processLabel(entry) {
      return `${entry.name ?? t('unknown.name')}`
    }

    /** One confirmation dialog for a termination. */
    function ConfirmDialog({ request, onCancel, onConfirm }) {
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onCancel()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [onCancel])

      const { row, entry } = request
      const rows = [
        [t('confirm.name'), processLabel(entry)],
        [t('confirm.pid'), String(entry.pid)],
        [t('confirm.port'), `${row.transport} ${row.port}`],
      ]
      if (entry.path !== null && entry.path !== undefined) rows.push([t('confirm.path'), entry.path])

      return h('div', { className: 'dsh-pm-overlay', onClick: (event) => { if (event.target === event.currentTarget) onCancel() } },
        h('div', { className: 'dsh-pm-dialog', role: 'dialog', 'aria-modal': 'true' },
          h('header', null, t('confirm.title')),
          h('div', { className: 'dsh-pm-dialog-body' },
            h('div', null, t('confirm.body')),
            h('dl', { className: 'dsh-pm-kv' }, ...rows.flatMap(([key, value]) => [
              h('dt', { key: `${key}-k` }, key),
              h('dd', { key: `${key}-v` }, value),
            ])),
            h('div', { className: 'dsh-pm-dialog-note' }, t('confirm.warning')),
          ),
          h('footer', null,
            h('button', { type: 'button', className: 'dsh-pm-button', onClick: onCancel }, t('action.cancel')),
            h('button', { type: 'button', className: 'dsh-pm-button', 'data-variant': 'danger', onClick: onConfirm }, t('action.confirm')),
          ),
        ),
      )
    }

    /** The panel body. */
    function ProcessPanel({ controller }) {
      const [snapshot, setSnapshot] = React.useState(null)
      const [loading, setLoading] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [query, setQuery] = React.useState('')
      // Column sort: null keeps the host's default order (port ascending).
      const [sort, setSort] = React.useState(null)
      const [expanded, setExpanded] = React.useState(() => new Set())
      const [confirming, setConfirming] = React.useState(null)
      const [busyPid, setBusyPid] = React.useState(null)
      const [toast, setToast] = React.useState(null)

      const refresh = React.useCallback(async (force) => {
        setLoading(true)
        try {
          const response = await fetch(API.list + (force === true ? '?fresh=1' : ''), {
            credentials: 'same-origin',
            headers: { accept: 'application/json' },
          })
          const payload = await response.json()
          if (payload.ok === true) {
            setSnapshot(payload)
            setError(null)
          } else {
            setError(payload.error ?? `HTTP ${response.status}`)
          }
        } catch (cause) {
          setError(String(cause?.message ?? cause))
        } finally {
          setLoading(false)
        }
      }, [])

      // Load the first time the panel opens, and again whenever it reopens.
      React.useEffect(() => {
        let wasOpen = controller.isOpen()
        if (wasOpen) void refresh(false)
        const unsubscribe = controller.subscribe(() => {
          const isOpen = controller.isOpen()
          if (isOpen && !wasOpen) void refresh(false)
          wasOpen = isOpen
        })
        return unsubscribe
      }, [controller, refresh])

      // Success notices fade; failures stay until dismissed.
      React.useEffect(() => {
        if (toast === null || toast.level === 'error') return undefined
        const timer = setTimeout(() => setToast(null), 6000)
        return () => clearTimeout(timer)
      }, [toast])

      const terminate = React.useCallback(async (row, entry) => {
        setConfirming(null)
        setBusyPid(entry.pid)
        try {
          const response = await fetch(API.terminate, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pid: entry.pid, port: row.port, transport: row.transport, name: entry.name ?? '' }),
          })
          const payload = await response.json()
          if (payload.snapshot !== undefined && payload.snapshot !== null && payload.snapshot.ok === true) {
            setSnapshot(payload.snapshot)
          }
          if (payload.ok === true && payload.result !== undefined) {
            setToast({
              level: payload.result.level,
              text: `${t('killed.by', { name: processLabel(entry), pid: entry.pid })} — ${payload.result.message}`,
              // The raw script message is only worth showing when it explains a
              // failure (it carries the Windows error verbatim).
              detail: payload.result.level === 'error' ? payload.result.detail : null,
            })
          } else {
            setToast({
              level: 'error',
              text: payload.error ?? 'HTTP ' + String(response.status),
              detail: payload.result?.detail ?? null,
            })
          }
        } catch (cause) {
          setToast({ level: 'error', text: String(cause?.message ?? cause), detail: null })
        } finally {
          setBusyPid(null)
        }
      }, [])

      const rows = snapshot?.rows ?? []
      const filtered = React.useMemo(() => {
        const needle = query.trim().toLowerCase()
        if (needle === '') return rows
        return rows.filter((row) => {
          if (String(row.port).includes(needle)) return true
          if (row.transport.toLowerCase().includes(needle)) return true
          if (typeof row.display === 'string' && row.display.toLowerCase().includes(needle)) return true
          return row.pids.some((entry) =>
            String(entry.pid).includes(needle) ||
            (entry.name ?? '').toLowerCase().includes(needle) ||
            (entry.path ?? '').toLowerCase().includes(needle))
        })
      }, [rows, query])

      // Column sorting. `null` means the host's own order, which is port
      // ascending — the panel's documented default, so a fresh load needs no
      // client-side work and switching back is one extra click.
      const sorted = React.useMemo(() => {
        if (sort === null) return filtered
        const direction = sort.dir === 'desc' ? -1 : 1
        const value = (row) => {
          const primary = row.pids[0]
          switch (sort.key) {
            case 'name': return (primary?.name ?? '').toLowerCase()
            case 'pid': return primary?.pid ?? 0
            case 'protocol': return `${row.transport}${row.families.length > 1 ? '6' : ''}`
            case 'state': return row.state
            case 'address':
            default: return row.port
          }
        }
        return [...filtered].sort((a, b) => {
          const left = value(a)
          const right = value(b)
          // Rows whose process could not be identified hold no comparable
          // value, so they stay at the bottom whichever way the column sorts.
          if (sort.key === 'name' && (left === '' || right === '')) {
            if (left === right) return (a.port - b.port) || a.transport.localeCompare(b.transport)
            return left === '' ? 1 : -1
          }
          const result = typeof left === 'string' || typeof right === 'string'
            ? String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
            : left - right
          if (result !== 0) return direction * result
          // Stable, predictable tie-break so equal keys keep a fixed order.
          return (a.port - b.port) || a.transport.localeCompare(b.transport)
        })
      }, [filtered, sort])

      /** Cycle one column: ascending → descending → back to the default order. */
      const toggleSort = (key) => {
        setSort((current) => {
          if (current === null || current.key !== key) return { key, dir: 'asc' }
          return current.dir === 'asc' ? { key, dir: 'desc' } : null
        })
      }

      const toggleExpanded = (key) => {
        setExpanded((current) => {
          const next = new Set(current)
          if (next.has(key)) next.delete(key)
          else next.add(key)
          return next
        })
      }

      const meta = snapshot?.meta
      const summary = snapshot?.summary

      const actionButton = (row, entry, child) => {
        if (entry.protected) {
          return h('span', { className: 'dsh-pm-lock', title: entry.protectedReason ?? t('protected.hint') }, '🔒 ' + t('badge.protected'))
        }
        const busy = busyPid === entry.pid
        return h('button', {
          type: 'button',
          className: 'dsh-pm-button',
          'data-variant': 'danger',
          'data-size': 'small',
          disabled: busy,
          title: `${processLabel(entry)} · PID ${entry.pid}`,
          onClick: () => setConfirming({ row, entry }),
        }, busy ? t('busy') : t('action.terminate'))
      }

      // Every column except the action cell sorts; the address column sorts by
      // port number, which is the panel's primary key.
      const headerCells = [
        { key: 'name', label: t('column.name'), width: '26%', sortable: true },
        { key: 'pid', label: t('column.pid'), width: '11%', sortable: true },
        { key: 'protocol', label: t('column.protocol'), width: '10%', sortable: true },
        { key: 'address', label: t('column.address'), width: '29%', sortable: true },
        { key: 'state', label: t('column.state'), width: '12%', sortable: true },
        { key: 'action', label: t('column.action'), width: '12%', sortable: false },
      ]

      const bodyRows = []
      for (const row of sorted) {
        const multiple = row.pids.length > 1
        const isExpanded = expanded.has(row.key)
        const primary = row.pids[0]
        bodyRows.push(h('tr', {
          key: row.key,
          'data-protected': String(row.protected),
        },
          h('td', { title: primary?.name ?? '' },
            h('div', { className: 'dsh-pm-name' },
              multiple ? t('multi', { count: row.pids.length }) : processLabel(primary ?? {})),
            multiple
              ? null
              : h('div', { className: 'dsh-pm-name-path', title: primary?.path ?? '' },
                  primary?.path ?? (primary?.known === false ? t('dead.name') : '')),
          ),
          h('td', { className: 'dsh-pm-mono' },
            h('div', { className: 'dsh-pm-pids' },
              multiple
                ? h('button', {
                    type: 'button',
                    className: 'dsh-pm-expand',
                    'aria-expanded': String(isExpanded),
                    title: isExpanded ? t('collapse') : t('expand'),
                    onClick: () => toggleExpanded(row.key),
                  }, (isExpanded ? '▾ ' : '▸ ') + String(row.pids.length))
                : null,
              h('span', null, multiple ? String(row.pids.map((entry) => entry.pid).join(', ')) : String(primary?.pid ?? '')),
            ),
          ),
          h('td', { className: 'dsh-pm-mono' }, row.families.length > 1 ? `${row.transport} (v4/v6)` : row.transport),
          h('td', { className: 'dsh-pm-mono', title: row.display },
            h('span', { className: 'dsh-pm-port' }, `:${row.port}`),
            h('span', { className: 'dsh-pm-addr' }, '  ' + row.display),
          ),
          h('td', { className: 'dsh-pm-mono' }, row.transport === 'TCP' ? t('state.listening') : t('state.bound')),
          h('td', { className: 'dsh-pm-cell-actions' }, multiple ? null : actionButton(row, primary, false)),
        ))

        if (multiple && isExpanded) {
          for (const entry of row.pids) {
            bodyRows.push(h('tr', {
              key: `${row.key}#${entry.pid}`,
              'data-child': 'true',
              'data-protected': String(entry.protected),
            },
              h('td', { title: entry.cmd ?? '' },
                h('div', { className: 'dsh-pm-name' }, processLabel(entry)),
                h('div', { className: 'dsh-pm-name-path', title: entry.path ?? '' },
                  entry.path ?? (entry.known === false ? t('dead.name') : '')),
              ),
              h('td', { className: 'dsh-pm-mono' }, String(entry.pid)),
              h('td', { className: 'dsh-pm-mono' }, row.transport),
              h('td', { className: 'dsh-pm-path', title: entry.cmd ?? '' }, entry.cmd ?? row.display),
              h('td', { className: 'dsh-pm-mono' }, entry.protected ? t('badge.protected') : ''),
              h('td', { className: 'dsh-pm-cell-actions' }, actionButton(row, entry, true)),
            ))
          }
        }
      }

      const scanErrors = snapshot?.errors ?? []

      return h('div', { className: 'dsh-pm-panel' },
        h('div', { className: 'dsh-pm-header' },
          h('div', { className: 'dsh-pm-title' },
            h('h2', null, t('panel.title')),
            h('p', null, t('panel.subtitle')),
            h('div', { className: 'dsh-pm-badges' },
              meta === undefined ? null : h('span', {
                className: 'dsh-pm-badge',
                'data-tone': meta.elevated ? 'brand' : 'warn',
              }, meta.elevated ? t('badge.admin') : t('badge.standard')),
              meta === undefined ? null : h('span', { className: 'dsh-pm-badge' },
                t('summary', {
                  ports: summary?.ports ?? 0,
                  endpoints: summary?.endpoints ?? 0,
                  tcp: summary?.tcp ?? 0,
                  udp: summary?.udp ?? 0,
                })),
              (summary?.orphaned ?? 0) === 0 ? null : h('span', {
                className: 'dsh-pm-badge',
                title: t('orphaned.hint'),
              }, t('orphaned', { count: summary.orphaned })),
              meta === undefined ? null : h('span', { className: 'dsh-pm-badge' },
                t('scanned', { time: formatClock(meta.collectedAt), ms: meta.durationMs ?? 0 })),
            ),
          ),
          h('div', { className: 'dsh-pm-header-actions' },
            h('button', {
              type: 'button',
              className: 'dsh-pm-button',
              disabled: loading,
              onClick: () => { void refresh(true) },
            }, loading ? t('loading') : t('action.refresh')),
            h('button', {
              type: 'button',
              className: 'dsh-pm-button',
              onClick: () => controller.close(),
            }, t('action.back')),
          ),
        ),

        h('div', { className: 'dsh-pm-toolbar' },
          h('div', { className: 'dsh-pm-search' },
            h('input', {
              type: 'search',
              value: query,
              placeholder: t('search.placeholder'),
              'aria-label': t('search.placeholder'),
              onChange: (event) => setQuery(event.target.value),
            }),
            query === '' ? null : h('button', {
              type: 'button',
              title: t('search.clear'),
              'aria-label': t('search.clear'),
              onClick: () => setQuery(''),
            }, '✕'),
          ),
          h('span', { className: 'dsh-pm-toolbar-note' },
            query === '' ? '' : `${filtered.length} / ${rows.length}`),
        ),

        error === null ? null : h('div', { className: 'dsh-pm-banner', 'data-level': 'error' },
          h('div', { className: 'dsh-pm-banner-body' },
            h('strong', null, t('error.title')),
            h('span', { className: 'dsh-pm-banner-detail' }, error),
          ),
          h('button', { type: 'button', className: 'dsh-pm-button', 'data-size': 'small', onClick: () => { void refresh(true) } }, t('error.retry')),
        ),

        toast === null ? null : h('div', { className: 'dsh-pm-banner', 'data-level': toast.level },
          h('div', { className: 'dsh-pm-banner-body' },
            h('span', null, toast.text),
            toast.detail === null || toast.detail === undefined ? null : h('span', { className: 'dsh-pm-banner-detail' }, toast.detail),
          ),
          h('button', { type: 'button', className: 'dsh-pm-button', 'data-size': 'small', onClick: () => setToast(null) }, t('action.dismiss')),
        ),

        scanErrors.length === 0 ? null : h('div', { className: 'dsh-pm-banner', 'data-level': 'info' },
          h('div', { className: 'dsh-pm-banner-body' },
            h('span', null, t('scan.errors', { count: scanErrors.length })),
            h('span', { className: 'dsh-pm-banner-detail' },
              scanErrors.map((entry) => `${entry.stage}: ${entry.message}`).join(' · ')),
          ),
        ),

        h('div', { className: 'dsh-pm-body' },
          rows.length === 0
            ? h('div', { className: 'dsh-pm-empty' }, loading ? t('loading') : (error === null ? t('empty.initial') : ''))
            : h('table', { className: 'dsh-pm-table' },
                h('colgroup', null, ...headerCells.map((cell) => h('col', { key: cell.key, style: { width: cell.width } }))),
                h('thead', null, h('tr', null, ...headerCells.map((cell) => {
                  if (cell.sortable !== true) return h('th', { key: cell.key }, cell.label)
                  const active = sort !== null && sort.key === cell.key
                  return h('th', {
                    key: cell.key,
                    'aria-sort': active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none',
                  }, h('button', {
                    type: 'button',
                    className: 'dsh-pm-sort',
                    'data-active': String(active),
                    title: t('sort.hint', { column: cell.label }),
                    onClick: () => toggleSort(cell.key),
                  },
                    cell.label,
                    active ? h('span', { className: 'dsh-pm-sort-arrow' }, sort.dir === 'asc' ? '▲' : '▼') : null,
                  ))
                }))),
                h('tbody', null, filtered.length === 0
                  ? h('tr', null, h('td', { colSpan: headerCells.length }, h('div', { className: 'dsh-pm-empty' }, t('empty'))))
                  : bodyRows),
              ),
        ),

        confirming === null ? null : h(ConfirmDialog, {
          request: confirming,
          onCancel: () => setConfirming(null),
          onConfirm: () => { void terminate(confirming.row, confirming.entry) },
        }),
      )
    }

    // -------------------------------------------------------------- apply ---

    const controller = createController()

    /** Locale-change subscribers owned by this plugin. */
    const localeListeners = new Set()
    let localeSource = null

    /** Subscribe to locale changes (no-op when the service is absent). */
    function subscribeLocale(listener) {
      if (localeSource === null) return () => {}
      localeListeners.add(listener)
      return () => { localeListeners.delete(listener) }
    }

    /** Required services: none is hard — the panel degrades without locale. */
    const inject = []

    /** Notify every locale-change subscriber owned by this plugin. */
    function notifyLocale() {
      for (const listener of [...localeListeners]) {
        try { listener() } catch (error) { console.warn('[dsh-process-manager] locale listener failed:', error) }
      }
    }

    /**
     * Wire the optional locale service: register the dictionaries, take the
     * translate seat, and follow language switches.
     * @param owner - context whose effects should own these registrations.
     * @param locale - the locale service, or undefined when absent.
     */
    function wireLocale(owner, locale) {
      if (locale === undefined || locale === null) return
      try {
        owner.effect(() => locale.register(NS, { zh: ZH, en: EN }), 'process-manager: dictionaries')
      } catch (error) {
        console.warn('[dsh-process-manager] locale registration failed:', error)
      }
      try {
        if (typeof locale.bind === 'function') translate = locale.bind(NS)
      } catch {
        translate = null
      }
      try {
        if (typeof locale.subscribe === 'function') {
          localeSource = locale
          owner.effect(() => {
            const unsubscribe = locale.subscribe(notifyLocale)
            return () => {
              localeSource = null
              unsubscribe()
            }
          }, 'process-manager: locale')
        }
      } catch (error) {
        console.warn('[dsh-process-manager] locale subscription failed:', error)
      }
    }

    /**
     * Mount the sidebar entry and the panel.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      const disposeStyles = injectStyles()

      // The locale service may mount after this plugin, so wait for it through
      // the context's injection when available; otherwise take what is there.
      let localeWired = false
      let disposeInjected
      if (typeof ctx.inject === 'function') {
        try {
          disposeInjected = ctx.inject(['locale'], (localeCtx) => {
            localeWired = true
            wireLocale(localeCtx, localeCtx.locale)
          })
        } catch (error) {
          console.warn('[dsh-process-manager] locale injection failed:', error)
        }
      }
      if (!localeWired) wireLocale(ctx, ctx.get('locale'))

      const disposers = []
      try {
        disposers.push(mountSidebarEntry())
        disposers.push(mountPanel())
      } catch (error) {
        console.warn('[dsh-process-manager] mount failed:', error)
      }

      ctx.effect(() => () => {
        for (const dispose of disposers.splice(0)) {
          try { dispose() } catch (error) { console.warn('[dsh-process-manager] dispose failed:', error) }
        }
        if (typeof disposeInjected === 'function') {
          try { disposeInjected() } catch { /* already disposed with its fiber */ }
        }
        disposeStyles()
        translate = null
        localeListeners.clear()
      }, 'process-manager: ui mounts')
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
