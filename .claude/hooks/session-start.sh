#!/usr/bin/env bash
# Prepares a Claude Code cloud session for this repository.
#
# The cloud image ships Node 20-22, but the repository pins a newer major
# (.nvmrc, falling back to engines.node). This installs that major with the
# image's nvm, enables pnpm through Corepack, installs dependencies, and
# persists PATH for the rest of the session through CLAUDE_ENV_FILE.
#
# Local sessions use the host toolchain or Docker, so the script exits at once.
# Not -u: nvm.sh reads unset variables and fails under it.
set -eo pipefail

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}"

if [ -f .nvmrc ]; then
  want="$(tr -d '[:space:]' < .nvmrc)"
else
  want="$(node -p "(require('./package.json').engines?.node ?? '').split('.')[0]")"
fi
have="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)"

if [ -n "$want" ] && [ "$have" != "$want" ]; then
  export NVM_DIR="${NVM_DIR:-/opt/nvm}"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install "$want" > /dev/null 2>&1
  node_bin="$(dirname "$(nvm which "$want")")"
  export PATH="$node_bin:$PATH"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export PATH=\"$node_bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable > /dev/null
install_log="$(mktemp)"
trap 'rm -f "$install_log"' EXIT
pnpm install --frozen-lockfile > "$install_log" 2>&1 \
  || { tail -20 "$install_log"; exit 1; }

echo "Session ready: Node $(node --version), pnpm $(pnpm --version), dependencies installed."
