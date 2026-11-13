#!/usr/bin/env bash
# ci-parity.sh — 发布推送前在「无宿主布局」克隆里跑全量 npm test（CI 形态核证）。
# 背景：环境依赖守卫（依赖仓库外路径/宿主目录）本地全绿、CI 红灯——2026-11-14 v0.3.3 发布失败实录
# （RUN 43477989591：agents-paths 守卫在 runner 上 ../01_docs 不存在）。
# 用法：scripts/ci-parity.sh [基线ref]（默认 HEAD）。克隆到 .dsh-research/ci-parity-clone，用完保留供复查。
set -eu
BASE="${1:-HEAD}"
SCRATCH="${CI_PARITY_DIR:-/home/ubuntu/workspace/.dsh-research/ci-parity-clone}"
REPO="$(git rev-parse --show-toplevel)"
rm -rf "$SCRATCH"
git clone -q "$REPO" "$SCRATCH"
git -C "$SCRATCH" checkout -q "$BASE"
export npm_config_cache="/home/ubuntu/workspace/.dsh-research/npm-cache-dsh-stock-kanban"
cd "$SCRATCH"
npm ci --no-audit --no-fund
npm test
echo "ci-parity: OK @ $(git rev-parse HEAD)"
