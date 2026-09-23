// dsh-skills-hub Client half：DSH 设置中的跨平台技能管理面板。
//
// 渲染机制与 @michengai/dsh-skills-manager 一致：
//   window.__ModuleLoader__.load({ id, factory }) 产出 module.exports（含 apply/inject）。
// 通过 fetch 调用 Host half 的 /api/dsh-skills-hub/* 路由；写接口带自定义标记头。
//
// 零构建依赖：直接手写 CJS factory，React 通过 loader 注入的 require 解析。

window.__ModuleLoader__.load({
  id: "dsh-skills-hub",
  factory: (require) => {
    var module = { exports: {} };
    Object.defineProperty(module.exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    var h = react.createElement;

    var API_BASE = "/api/dsh-skills-hub";
    var MUTATION_HEADERS = { "content-type": "application/json", "x-dsh-skills-hub": "1" };

    // 类别显示顺序：Central 最前，其次 Coding、Lobster、自定义。
    var CAT_ORDER = { Central: 0, Coding: 1, Lobster: 2, "自定义": 3 };

    var CSS = [
      ".skhub-section{box-sizing:border-box;display:flex;min-width:0;max-width:860px;width:100%;margin:0 auto;flex-direction:column;gap:16px;padding:0 0 32px;color:var(--dsw-alias-label-primary)}",
      ".skhub-toolbar{display:flex;align-items:flex-start;gap:16px;padding-bottom:4px}",
      ".skhub-title{margin:0;font-size:20px;line-height:28px;font-weight:650;letter-spacing:-.2px}",
      ".skhub-desc{margin:4px 0 0;max-width:50em;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}",
      ".skhub-actions{display:flex;align-items:center;gap:8px;margin-left:auto}",
      ".skhub-btn{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border:1px solid transparent;border-radius:8px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font:inherit;font-size:13px;font-weight:550;cursor:pointer;transition:opacity 180ms ease,background 180ms ease,border-color 180ms ease}",
      ".skhub-btn:hover:not(:disabled){opacity:.9}.skhub-btn:disabled{opacity:.5;cursor:default}",
      ".skhub-btn-secondary{background:transparent;border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}",
      ".skhub-btn-danger{background:transparent;border-color:var(--dsw-alias-state-error-primary);color:var(--dsw-alias-state-error-primary)}",
      ".skhub-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
      ".skhub-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px}",
      ".skhub-msg{padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:13px}",
      ".skhub-cat{margin:12px 0 0;font-size:13px;font-weight:650;color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.4px}",
      ".skhub-group{display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}",
      ".skhub-group-head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".skhub-group-title{margin:0;font-size:14px;font-weight:600}",
      ".skhub-count{color:var(--dsw-alias-label-tertiary);font-size:12px}",
      ".skhub-path{margin-left:auto;max-width:46%;overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}",
      ".skhub-chips{display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px}",
      ".skhub-chip{padding:1px 8px;border:1px solid var(--dsw-alias-border-l3);border-radius:999px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}",
      ".skhub-row{display:flex;align-items:center;gap:12px;padding:11px 16px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".skhub-row:last-child{border-bottom:0}",
      ".skhub-row-main{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}",
      ".skhub-row-name{overflow:hidden;font-size:13px;font-weight:500;line-height:20px;text-overflow:ellipsis;white-space:nowrap}",
      ".skhub-row-target{overflow:hidden;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;text-overflow:ellipsis;white-space:nowrap}",
      ".skhub-tag{flex:none;padding:1px 6px;border:1px solid var(--dsw-alias-border-l3);border-radius:4px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}",
      ".skhub-tag-link{border-color:var(--dsw-alias-state-success-primary);color:var(--dsw-alias-state-success-primary)}",
      ".skhub-tag-local{border-color:var(--dsw-alias-border-l3);color:var(--dsw-alias-label-secondary)}",
      ".skhub-tag-ro{border-color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-secondary));color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-secondary))}",
      ".skhub-empty{padding:20px 16px;color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center}",
      ".skhub-toolbar-row{display:flex;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l1);flex-wrap:wrap}",
      ".skhub-select{box-sizing:border-box;min-height:32px;max-width:280px;flex:1;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}",
      ".skhub-input{box-sizing:border-box;min-height:32px;flex:1;min-width:180px;padding:0 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}",
      "@media (max-width:560px){.skhub-toolbar{flex-wrap:wrap}.skhub-actions{margin-left:0}.skhub-path{display:none}.skhub-row{align-items:flex-start;flex-wrap:wrap}.skhub-row>.skhub-btn{margin-left:auto}}",
    ].join("\n");

    function callApi(path, options) {
      return fetch(API_BASE + path, options).then(function (r) {
        return r.json().catch(function () {
          var e = new Error("HTTP " + r.status + " 返回了非 JSON 响应");
          e.code = "error.proto.nonJson";
          throw e;
        }).then(function (payload) {
          if (!payload.ok) {
            var e = new Error(payload.error || ("HTTP " + r.status));
            if (payload.code) e.code = payload.code;
            throw e;
          }
          return payload.data;
        });
      });
    }

    function SkillsHubSection() {
      var snapshotState = react.useState({ loading: true, error: null, data: null });
      var snapshot = snapshotState[0];
      var setSnapshot = snapshotState[1];
      var busyState = react.useState(false);
      var busy = busyState[0];
      var setBusy = busyState[1];
      var msgState = react.useState("");
      var msg = msgState[0];
      var setMsg = msgState[1];
      var selState = react.useState({});
      var sel = selState[0];
      var setSel = selState[1];
      var newDirState = react.useState("");
      var newDir = newDirState[0];
      var setNewDir = newDirState[1];
      var newNameState = react.useState("");
      var newName = newNameState[0];
      var setNewName = newNameState[1];

      function refresh() {
        setSnapshot({ loading: true, error: null, data: snapshot.data });
        callApi("/state").then(function (data) {
          setSnapshot({ loading: false, error: null, data: data });
        }).catch(function (error) {
          setSnapshot({ loading: false, error: error, data: snapshot.data });
        });
      }

      react.useEffect(function () { refresh(); }, []);

      function action(path, body, doneText) {
        if (busy) return;
        setBusy(true);
        setMsg("");
        callApi(path, { method: "POST", headers: MUTATION_HEADERS, body: JSON.stringify(body || {}) }).then(function () {
          setBusy(false);
          setMsg(doneText);
          refresh();
        }).catch(function (error) {
          setBusy(false);
          setMsg("操作失败：" + String(error && error.message ? error.message : error));
          refresh();
        });
      }

      var nodes = [h("style", { key: "css" }, CSS)];

      // 顶部工具栏
      nodes.push(h("div", { key: "toolbar", className: "skhub-toolbar" },
        h("div", null,
          h("h2", { className: "skhub-title" }, "跨平台 Skills Hub"),
          h("p", { className: "skhub-desc" }, "以 ~/.agents/skills 为中心技能库，通过 Windows 目录联接把同一份技能安装到各 Agent 工具；仅显示本机已安装的平台。卸载链接只删链接、卸载本地技能删除该平台数据源。")),
        h("div", { className: "skhub-actions" },
          h("button", { className: "skhub-btn skhub-btn-secondary", disabled: busy, onClick: refresh }, "刷新"))));

      if (snapshot.error) nodes.push(h("div", { key: "error", className: "skhub-error", role: "alert" }, "加载失败：" + String(snapshot.error && snapshot.error.message ? snapshot.error.message : snapshot.error)));
      if (msg) nodes.push(h("div", { key: "msg", className: "skhub-msg", role: "status" }, msg));

      if (snapshot.data) {
        var central = snapshot.data.central || [];
        var platforms = snapshot.data.platforms || [];

        // 按类别分组（只展示本机存在的平台）
        var groups = {};
        var catNames = [];
        platforms.forEach(function (p) {
          var cat = p.category || "其他";
          if (!groups[cat]) { groups[cat] = []; catNames.push(cat); }
          groups[cat].push(p);
        });
        catNames.sort(function (a, b) {
          var ia = Object.prototype.hasOwnProperty.call(CAT_ORDER, a) ? CAT_ORDER[a] : 99;
          var ib = Object.prototype.hasOwnProperty.call(CAT_ORDER, b) ? CAT_ORDER[b] : 99;
          return ia - ib;
        });

        catNames.forEach(function (cat) {
          nodes.push(h("div", { key: "cat-" + cat, className: "skhub-cat" }, cat));

          groups[cat].forEach(function (p) {
            var skills = p.skills || [];
            var isCentral = p.role === "central";
            var notInstalled = central.filter(function (n) { return !skills.some(function (x) { return x.name === n; }); });
            var selected = sel[p.id] || notInstalled[0] || "";

            var children = [h("div", { className: "skhub-group-head" },
              h("h3", { className: "skhub-group-title" }, p.name),
              p.readonly ? h("span", { className: "skhub-tag skhub-tag-ro" }, "只读") : null,
              p.role === "custom" ? h("span", { className: "skhub-tag" }, "自定义") : null,
              h("span", { className: "skhub-count" }, skills.length + " 个"),
              h("span", { className: "skhub-path", title: p.dir }, p.dir))];

            if (p.readonly) {
              children.push(h("div", { key: "ro-note", className: "skhub-empty" }, "只读平台：仅展示，不提供安装/卸载"));
            }

            // 中心技能库：只展示 chips，不提供安装/卸载
            if (isCentral) {
              children.push(h("div", { key: "chips", className: "skhub-chips" },
                skills.length ? skills.map(function (x) { return h("span", { key: x.name, className: "skhub-chip" }, x.name); }) : h("span", { className: "skhub-empty" }, "暂无技能")));
            }

            // 安装行（非中心、非只读）
            if (!isCentral && !p.readonly) {
              children.push(h("div", { key: "install", className: "skhub-toolbar-row" },
                h("select", { className: "skhub-select", value: selected, onChange: function (e) { var n = {}; n[p.id] = e.target.value; setSel(Object.assign({}, sel, n)); } },
                  (notInstalled.length === 0 ? ["（中心技能已全部安装）"] : notInstalled).map(function (n) { return h("option", { key: n, value: n }, n); })),
                h("button", { className: "skhub-btn", disabled: busy || notInstalled.length === 0, onClick: function () { action("/install", { platform: p.id, skill: selected }, "已安装：" + selected + " → " + p.name); } }, "安装")));
            }

            // 技能列表
            if (skills.length === 0) {
              children.push(h("div", { key: "empty", className: "skhub-empty" }, isCentral ? "" : "（无技能）"));
            } else if (!isCentral) {
              skills.forEach(function (x) {
                var isLink = !!x.linkType;
                var row = h("div", { key: x.name, className: "skhub-row" },
                  h("div", { className: "skhub-row-main" },
                    h("span", { className: "skhub-row-name" }, x.name),
                    x.target ? h("span", { className: "skhub-row-target", title: x.target }, "→ " + x.target) : null),
                  isLink ? h("span", { className: "skhub-tag skhub-tag-link" }, "链接") : h("span", { className: "skhub-tag skhub-tag-local" }, "本地"),
                  isLink
                    ? h("button", { className: "skhub-btn skhub-btn-secondary", disabled: busy, title: "仅删除链接，不影响中心技能库", onClick: function () { action("/uninstall", { platform: p.id, skill: x.name }, "已卸载链接：" + x.name + " ← " + p.name); } }, "卸载")
                    : h("button", { className: "skhub-btn skhub-btn-danger", disabled: busy, title: "删除该平台下的本地技能数据源", onClick: function () { action("/uninstall", { platform: p.id, skill: x.name }, "已删除本地技能：" + x.name + " ← " + p.name); } }, "删除"));
                children.push(row);
              });
            }

            // 自定义平台：移除目录管理
            if (p.role === "custom") {
              children.push(h("div", { key: "remove-dir", className: "skhub-toolbar-row" },
                h("button", { className: "skhub-btn skhub-btn-danger", disabled: busy, onClick: function () { action("/remove-dir", { id: p.id }, "已移除目录管理：" + p.dir); } }, "移除目录")));
            }

            nodes.push(h("div", { key: p.id, className: "skhub-group" }, children));
          });
        });

        // 添加自定义平台
        nodes.push(h("div", { key: "add-dir", className: "skhub-group" },
          h("div", { className: "skhub-group-head" },
            h("h3", { className: "skhub-group-title" }, "添加自定义平台"),
            h("span", { className: "skhub-path", title: "~/.skillsmanage/config.json" }, "配置 → ~/.skillsmanage/config.json")),
          h("div", { className: "skhub-toolbar-row" },
            h("input", { className: "skhub-input", placeholder: "Skills 目录路径，如 D:\\my-skills", value: newDir, onChange: function (e) { setNewDir(e.target.value); } }),
            h("input", { className: "skhub-input", placeholder: "显示名称（可选）", value: newName, onChange: function (e) { setNewName(e.target.value); }, style: { maxWidth: 180 } }),
            h("button", { className: "skhub-btn", disabled: busy, onClick: function () {
              var dir = newDir.trim();
              if (!dir) { setMsg("请输入目录路径"); return; }
              action("/add-dir", { dir: dir, name: newName.trim(), readonly: false }, "已添加平台：" + dir);
              setNewDir(""); setNewName("");
            } }, "添加"))));
      } else if (snapshot.loading) {
        nodes.push(h("div", { key: "loading", className: "skhub-empty" }, "加载中…"));
      }

      return h("section", { className: "skhub-section" }, nodes);
    }

    function apply(ctx) {
      ctx.slots.inject("settings.section", function () {
        return ctx.slots.register(
          { name: "settings.section", id: "skills-hub", order: 18, label: "技能中心" },
          SkillsHubSection
        );
      });
    }
    module.exports.apply = apply;
    module.exports.inject = ["slots"];
    return module.exports;
  }
});
