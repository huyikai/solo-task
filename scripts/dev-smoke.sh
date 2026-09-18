#!/usr/bin/env bash
# dev-smoke.sh — automatic validation of quickstart.md step 3 + FR-001.
#
# Boots `pnpm tauri dev`, waits for the devUrl to be reachable, lets the
# Rust side complete its db::connect_and_init + initial migration, then
# verifies the SQLite file landed on disk with the expected schema. This
# is the only signal that FR-001 ("app MUST auto-create the local SQLite
# database file on first launch") actually fires — jsdom tests cannot
# observe filesystem side effects.
#
# Usage:
#   scripts/dev-smoke.sh
#   scripts/dev-smoke.sh --keep    # leave the dev server running after pass
#
# Exit code:
#   0   all checks passed
#   1   devUrl never came up
#   2   DB file missing or empty
#   3   DB schema missing expected tables
#   4   cleanup / startup failure

set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root"

# Ensure cargo / rustc are on PATH for `pnpm tauri dev`'s child processes.
# rustup's default install location isn't always on a fresh shell's PATH.
for candidate in "$HOME/.cargo/bin" "/usr/local/cargo/bin" "/opt/homebrew/bin"; do
  if [ -x "$candidate/cargo" ] && [[ ":$PATH:" != *":$candidate:"* ]]; then
    export PATH="$candidate:$PATH"
  fi
done

dev_url="http://localhost:1420"
# paths.rs: macOS ~/Library/Application Support/com.huyikai.solo-task/tasks.db
case "$(uname -s)" in
  Darwin) db_dir="$HOME/Library/Application Support/com.huyikai.solo-task";;
  Linux)  db_dir="${XDG_DATA_HOME:-$HOME/.local/share}/com.huyikai.solo-task";;
  *)      echo "unsupported OS: $(uname -s)" >&2; exit 4;;
esac
db_file="$db_dir/tasks.db"

# 1. Wipe the DB so we are exercising first-launch behaviour, not cached state.
if [ -f "$db_file" ]; then
  echo "→ removing existing DB at $db_file"
  rm -f "$db_file" "$db_file-wal" "$db_file-shm"
fi

keep=0
for arg in "$@"; do
  [ "$arg" = "--keep" ] && keep=1
done

# 2. Start Tauri dev in the background.
echo "→ starting pnpm tauri dev (this compiles Rust + boots Vite)…"
log="$(mktemp -t dev-smoke.XXXXXX.log)"
pnpm tauri dev >"$log" 2>&1 &
tauri_pid=$!
trap '[ -n "${tauri_pid:-}" ] && kill "$tauri_pid" 2>/dev/null || true; rm -f "$log"' EXIT

# 3. Wait for Vite (devUrl) — Vite starts before Rust, so seeing 1420 up
#    means the webview will load real assets. 60s is generous for cold compile.
echo "→ waiting for $dev_url (up to 90s)…"
ready=0
for _ in $(seq 1 90); do
  if curl -fsS -o /dev/null "$dev_url" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" = "0" ]; then
  echo "✗ devUrl never came up; last log lines:" >&2
  tail -30 "$log" >&2
  exit 1
fi
echo "✓ devUrl reachable"

# 4. Wait for the Rust side to run db::connect_and_init + migration. The
#    webview can render the loading screen before this completes, so we
#    poll the DB file. 30s is plenty for first-launch on Apple Silicon.
echo "→ waiting for DB file at $db_file (up to 30s)…"
db_ready=0
for _ in $(seq 1 30); do
  if [ -s "$db_file" ]; then
    db_ready=1
    break
  fi
  sleep 1
done
if [ "$db_ready" = "0" ]; then
  echo "✗ DB file did not appear or is empty" >&2
  tail -30 "$log" >&2
  exit 2
fi
echo "✓ DB file present ($(wc -c < "$db_file") bytes)"

# 5. Schema check — the initial migration creates 7 tables per data-model.md
#    + FR-017's user_preferences. Use sqlite3 if present, otherwise fall
#    back to a 16-byte header sniff.
if command -v sqlite3 >/dev/null 2>&1; then
  expected=(tasks subtasks tags task_tags reminders migrations user_preferences)
  missing=()
  for tbl in "${expected[@]}"; do
    if ! sqlite3 "$db_file" ".tables" | tr -s ' ' '\n' | grep -qx "$tbl"; then
      missing+=("$tbl")
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "✗ DB schema missing tables: ${missing[*]}" >&2
    sqlite3 "$db_file" ".tables" >&2
    exit 3
  fi
  echo "✓ DB schema contains: ${expected[*]}"
else
  # No sqlite3 CLI: do a header sniff (SQLite files start with "SQLite format 3\0").
  header="$(head -c 16 "$db_file" | od -c | head -1)"
  if [[ "$header" != *"S Q L i t e"* ]]; then
    echo "✗ file is not a SQLite database (header: $header)" >&2
    exit 3
  fi
  echo "✓ file header looks like SQLite (sqlite3 CLI unavailable for full schema check)"
fi

# 6. Pass. Either leave the dev server running (--keep) or shut down.
if [ "$keep" = "1" ]; then
  echo "✓ all checks passed; dev server still running (pid $tauri_pid)"
  echo "  tail the log: tail -f $log"
  # detach from trap so the server survives script exit
  trap - EXIT
  exit 0
else
  echo "✓ all checks passed; shutting down tauri dev"
  exit 0
fi
