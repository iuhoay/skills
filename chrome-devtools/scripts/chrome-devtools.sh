#!/usr/bin/env bash
set -euo pipefail

# PATH may have chrome-devtools 1.1.0 (Homebrew). That daemon cannot
# autoConnect to Chrome 153. Prefer 1.9+; otherwise bun's cached 1.9.x.

version_ok() {
  local raw last
  raw="$("$1" --version 2>/dev/null || true)"
  last="$(printf '%s\n' "$raw" | tail -1 | tr -d '[:space:]')"
  case "$last" in
    1.9.*|1.[1-9][0-9].*|[2-9].*) return 0 ;;
    *) return 1 ;;
  esac
}

resolve_cli() {
  local p js
  p="$(command -v chrome-devtools 2>/dev/null || true)"
  if [[ -n "$p" ]] && version_ok "$p"; then
    printf '%s\n' "$p"
    return 0
  fi
  js="$(ls -1d "$HOME"/.bun/install/cache/chrome-devtools-mcp@1.9.*/build/src/bin/chrome-devtools.js 2>/dev/null | tail -1 || true)"
  if [[ -n "$js" && -f "$js" ]]; then
    printf 'node:%s\n' "$js"
    return 0
  fi
  echo "chrome-devtools 1.9+ not found. Install chrome-devtools-mcp@1.9.0 or restore the bun cache copy." >&2
  exit 127
}

run_cli() {
  local cli="$1"
  shift
  if [[ "$cli" == node:* ]]; then
    exec node "${cli#node:}" "$@"
  fi
  exec "$cli" "$@"
}

CLI="$(resolve_cli)"

if [[ "${1:-}" == "start" ]]; then
  shift
  args=("$@")
  has_auto=0
  has_url=0
  has_ws=0
  for a in "${args[@]+"${args[@]}"}"; do
    case "$a" in
      --autoConnect|--auto-connect) has_auto=1 ;;
      --browserUrl|--browser-url|-u) has_url=1 ;;
      --wsEndpoint|--ws-endpoint|-w) has_ws=1 ;;
    esac
  done
  extra=()
  if [[ $has_auto -eq 0 && $has_url -eq 0 && $has_ws -eq 0 ]]; then
    extra+=(--autoConnect --no-headless)
  fi
  extra+=(--no-usage-statistics --no-performance-crux)
  run_cli "$CLI" start "${extra[@]}" "${args[@]+"${args[@]}"}"
fi

run_cli "$CLI" "$@"
