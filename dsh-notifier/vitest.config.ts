import { defineConfig } from "vitest/config";

/**
 * 本包测试配置（独立版）。
 *
 * 分层即目录，按「断言对象是什么」切：
 *   - unit / integration：直连 src 源码；
 *   - client-unit：客户端纯逻辑，node 环境；
 *   - client-dom：需要 DOM 的客户端用例，happy-dom 环境；
 *   - e2e：真实端口 / 文件系统 / 子进程，超时放宽；
 *   - bundle：断言 lib/ 产物形态，不直连 src。
 *
 * 层清单与超时内联在此处，作为本包测试分层的单一事实源。
 */

const LAYER_RUNTIME = {
  unit: { environment: "node", testTimeout: 60_000, hookTimeout: 60_000 },
  integration: { environment: "node", testTimeout: 60_000, hookTimeout: 60_000 },
  e2e: { environment: "node", testTimeout: 600_000, hookTimeout: 600_000 },
  "client-unit": { environment: "node", testTimeout: 60_000, hookTimeout: 60_000 },
  "client-dom": { environment: "happy-dom", testTimeout: 30_000, hookTimeout: 30_000 },
  bundle: { environment: "node", testTimeout: 60_000, hookTimeout: 60_000 },
};

const LAYERS = Object.keys(LAYER_RUNTIME);

export default defineConfig({
  test: {
    projects: LAYERS.map((layer) => ({
      test: {
        name: layer,
        include: [`test/${layer}/**/*.test.ts`],
        ...LAYER_RUNTIME[layer],
      },
    })),
  },
});