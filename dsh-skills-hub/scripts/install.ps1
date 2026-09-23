# dsh-skills-hub 一键安装脚本（Windows / PowerShell）
#
# 用法（在仓库根目录）：
#   powershell -ExecutionPolicy Bypass -File scripts/install.ps1
#   或
#   pwsh scripts/install.ps1
#
# 作用：调用 `dsh plugin --profile web add <本目录>` 完成安装。
# dsh plugin add 会 pnpm 安装本包并自动把 dsh-skills-hub 加入
# dsh.profile.bundles（因为包声明了 dsh.bundle.patch），无需手动改配置。
#
# 重新运行本脚本可升级（重新 link 当前源码）。

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "== dsh-skills-hub 一键安装 ==" -ForegroundColor Cyan
Write-Host "  仓库目录: $repoRoot"

# 1. 检查 dsh 命令
if (-not (Get-Command dsh -ErrorAction SilentlyContinue)) {
  Write-Error "未找到 dsh 命令。请先安装 DeepSeek Harness (DSH) 并确保 dsh 在 PATH 中。"
  exit 1
}

# 2. 检查 pnpm（dsh plugin 内部转发给 pnpm）
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Error "未找到 pnpm。dsh plugin 依赖 pnpm 管理 profile 依赖，请先安装 pnpm（npm install -g pnpm）。"
  exit 1
}

# 3. 一键安装到 DSH web profile
Write-Host "正在安装到 DSH web profile ..."
dsh plugin --profile web add $repoRoot
if ($LASTEXITCODE -ne 0) {
  Write-Error "安装失败（exit code $LASTEXITCODE）。"
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "安装完成！" -ForegroundColor Green
Write-Host "请重启 DSH，然后打开 设置 → 技能中心 即可使用。"
