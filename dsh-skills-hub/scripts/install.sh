#!/usr/bin/env bash
# dsh-skills-hub 一键安装脚本（macOS / Linux）
#
# 用法（在仓库根目录）：
#   bash scripts/install.sh
#
# 作用：调用 `dsh plugin --profile web add <本目录>` 完成安装。
# dsh plugin add 会 pnpm 安装本包并自动把 dsh-skills-hub 加入
# dsh.profile.bundles（因为包声明了 dsh.bundle.patch），无需手动改配置。
#
# 重新运行本脚本可升级（重新 link 当前源码）。

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== dsh-skills-hub 一键安装 =="
echo "  仓库目录: ${REPO_ROOT}"

# 1. 检查 dsh 命令
if ! command -v dsh >/dev/null 2>&1; then
  echo "错误：未找到 dsh 命令。请先安装 DeepSeek Harness (DSH) 并确保 dsh 在 PATH 中。" >&2
  exit 1
fi

# 2. 检查 pnpm（dsh plugin 内部转发给 pnpm）
if ! command -v pnpm >/dev/null 2>&1; then
  echo "错误：未找到 pnpm。dsh plugin 依赖 pnpm 管理 profile 依赖，请先安装 pnpm（npm install -g pnpm）。" >&2
  exit 1
fi

# 3. 一键安装到 DSH web profile
echo "正在安装到 DSH web profile ..."
dsh plugin --profile web add "${REPO_ROOT}"

echo ""
echo "安装完成！"
echo "请重启 DSH，然后打开 设置 → 技能中心 即可使用。"
