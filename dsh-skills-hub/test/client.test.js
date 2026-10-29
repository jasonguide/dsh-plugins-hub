// Client 半渲染冒烟测试：不依赖真实浏览器与 React，
// 用最小 hooks 桩把 factory 里的 SkillsHubSection 渲染成元素树，
// 断言「打开」入口确实存在且带正确点击行为。
//
// 运行：node --test test/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const clientSource = readFileSync(join(here, "..", "lib", "client.js"), "utf8");

/** 极简 React 桩：useState 返回初值 + setter，useEffect 立即执行一次。 */
function makeFakeReact() {
  const store = [];
  let cursor = 0;
  return {
    reset() {
      cursor = 0;
    },
    createElement(type, props, ...children) {
      const flat = [];
      for (const c of children) {
        if (Array.isArray(c)) flat.push(...c);
        else if (c !== null && c !== undefined && c !== false) flat.push(c);
      }
      return { type, props: Object.assign({}, props, flat.length ? { children: flat } : {}) };
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in store)) store[i] = initial;
      return [store[i], (v) => { store[i] = v; }];
    },
    useEffect(fn) {
      fn();
    },
  };
}

/** 把 client.js 里的 factory 抽出来执行，返回 module.exports。 */
function loadClient(fakeReact, fetchImpl) {
  let captured = null;
  const win = {
    __ModuleLoader__: {
      load({ id, factory }) {
        captured = { id, exports: factory((m) => (m === "react" ? fakeReact : undefined)) };
      },
    },
  };
  const fn = new Function("window", "fetch", clientSource);
  fn(win, fetchImpl);
  assert.ok(captured, "client.js 应调用 __ModuleLoader__.load");
  return captured;
}

/** 收集元素树里所有 {type:'button', 文本} 的条目。 */
function collectButtons(node, out = []) {
  if (!node || typeof node !== "object") return out;
  const { type, props } = node;
  if (type === "button" && props) {
    const kids = props.children || [];
    const label = kids.filter((c) => typeof c === "string").join("");
    out.push({ label, title: props.title || "", onClick: props.onClick });
  }
  const kids = (props && props.children) || [];
  for (const c of kids) collectButtons(c, out);
  return out;
}

/** 从渲染结果里取出 SkillsHubSection 组件：apply() 时会交给 slots.register。 */
function renderSection(fakeReact, fetchImpl, statePayload) {
  const fakeFetch = (url) => {
    if (String(url).endsWith("/state")) {
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ ok: true, data: statePayload }),
      });
    }
    return fetchImpl(url);
  };
  const loaded = loadClient(fakeReact, fakeFetch);
  let section = null;
  const ctx = {
    slots: {
      inject(name, fn) { fn(); },
      register(_meta, Component) { section = Component; },
    },
  };
  loaded.exports.apply(ctx);
  assert.ok(section, "apply 应注册 settings.section 组件");
  fakeReact.reset();
  // 组件内部 refresh() 通过 then 异步落地 snapshot，这里用同一份 payload 做首帧断言
  const tree = section();
  return { tree, loaded };
}

const STATE = {
  central: ["code-review", "tdd"],
  platforms: [
    { id: "agents", name: "中心技能库", dir: "~/.agents/skills", role: "central", category: "Central", readonly: false, exists: true, skills: [{ name: "code-review", linkType: "", target: "" }, { name: "tdd", linkType: "", target: "" }] },
    { id: "codex", name: "Codex CLI", dir: "~/.codex/skills", role: "agent", category: "Coding", readonly: false, exists: true, skills: [{ name: "code-review", linkType: "Junction", target: "C:\\u\\.agents\\skills\\code-review" }, { name: "local-only", linkType: "", target: "" }] },
    { id: "claude", name: "Claude Code", dir: "~/.claude/skills", role: "agent", category: "Coding", readonly: true, exists: true, skills: [{ name: "tdd", linkType: "Junction", target: "C:\\u\\.agents\\skills\\tdd" }] },
  ],
};

test("client.js 能通过 __ModuleLoader__ 载入并注册 settings.section", () => {
  const { loaded } = renderSection(makeFakeReact(), () => Promise.resolve({}), STATE);
  assert.equal(loaded.id, "dsh-skills-hub");
  assert.deepEqual(loaded.exports.inject, ["slots"]);
});

test("首帧（数据未到）只渲染工具栏，不渲染打开按钮", () => {
  // 组件首帧还没有 data（refresh 是异步的），因此直接构造带数据的 snapshot 不可行；
  // 这里改为：把 payload 塞进 fetch 后等待微任务，再渲染一次。
  const fakeReact = makeFakeReact();
  const calls = [];
  const fakeFetch = (url, opts) => {
    calls.push({ url, opts });
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve({ ok: true, data: STATE }),
    });
  };
  const loaded = loadClient(fakeReact, fakeFetch);
  let section = null;
  loaded.exports.apply({
    slots: {
      inject(_n, fn) { fn(); },
      register(_m, Component) { section = Component; },
    },
  });
  fakeReact.reset();
  let tree = section();
  // refresh() 的 promise 尚未落地 → 只断言工具栏存在，说明渲染链路可用
  const firstButtons = collectButtons(tree);
  assert.ok(firstButtons.some((b) => b.label === "刷新"), "工具栏刷新按钮应渲染");
  assert.ok(!firstButtons.some((b) => b.label === "打开"), "首帧无数据时不应有打开按钮");
});

test("SkillsHubSection 渲染出中心 chip 按钮与平台行「打开」按钮", async () => {
  const fakeReact = makeFakeReact();
  const sent = [];
  const fakeFetch = (url, opts) => {
    if (String(url).endsWith("/open")) {
      sent.push(JSON.parse(opts.body));
      return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true, data: { ok: true, path: "x" } }) });
    }
    return Promise.resolve({ status: 200, json: () => Promise.resolve({ ok: true, data: STATE }) });
  };
  const loaded = loadClient(fakeReact, fakeFetch);
  let section = null;
  loaded.exports.apply({
    slots: {
      inject(_n, fn) { fn(); },
      register(_m, Component) { section = Component; },
    },
  });
  fakeReact.reset();
  let tree = section();
  // refresh() 在 useEffect 里被调用，promise 落地后 setState 写入桩 store；
  // 再渲染一次即可拿到带数据的树。
  await new Promise((r) => setTimeout(r, 0));
  fakeReact.reset();
  tree = section();

  const buttons = collectButtons(tree);

  // 中心技能库两个技能名 → chip 按钮
  const chips = buttons.filter((b) => b.label === "code-review" || b.label === "tdd");
  assert.ok(chips.length >= 2, "中心技能的 chip 应为按钮，实际：" + chips.map((c) => c.label).join(","));

  // 平台技能行「打开」按钮：codex 两条 + claude 一条 = 3
  const opens = buttons.filter((b) => b.label === "打开");
  assert.equal(opens.length, 3, "每个平台技能行都应有「打开」按钮，实际 " + opens.length);
  assert.ok(opens.every((b) => typeof b.onClick === "function"), "打开按钮必须绑定 onClick");
  assert.ok(opens.some((b) => /真实目录/.test(b.title)), "链接条目的打开按钮应提示打开真实目录");
  assert.ok(opens.some((b) => /该技能目录/.test(b.title)), "本地条目的打开按钮应提示打开该技能目录");

  // 只读平台不提供卸载/删除，但保留「打开」：
  // codex 两条（1 链接→卸载 / 1 本地→删除），claude 只读一条（无写操作按钮）。
  assert.equal(buttons.filter((b) => b.label === "卸载").length, 1, "只有 codex 的链接条目有卸载按钮");
  assert.equal(buttons.filter((b) => b.label === "删除").length, 1, "只有 codex 的本地条目有删除按钮");

  // 点击第一个 chip → 应 POST /open {platform:'agents', skill:'code-review'}
  chips[0].onClick();
  assert.deepEqual(sent[0], { platform: "agents", skill: "code-review" }, "chip 点击应打开对应平台技能目录");

  // 点击某平台行的打开 → platform=codex
  const codexOpen = opens.find((b) => /C:\\\\u\\\\.agents/.test(b.title)) || opens[0];
  codexOpen.onClick();
  assert.equal(sent[sent.length - 1].platform, "codex", "平台行打开应带该平台 id");
  assert.ok(sent[sent.length - 1].skill, "平台行打开应带技能名");
});
