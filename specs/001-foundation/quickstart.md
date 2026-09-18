# Quickstart: Foundation Validation

**Feature**: 001-foundation
**Date**: 2026-09-17
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

This guide validates that the foundation slice is correctly in place. Six
local steps + one CI step cover every Acceptance Scenario in the spec.

---

## Prerequisites

- macOS 11+ (Apple Silicon or Intel) — primary
- Node.js 20+ (LTS)
- Rust 1.78+ (`rustup install stable`)
- Tauri CLI: `cargo install tauri-cli --version "^2.0" --locked`

> On Windows, substitute the equivalent PowerShell commands. CI uses
> GitHub Actions runners (see `.github/workflows/ci.yml`); local Windows
> validation is out of scope for this spec.

---

## 1. Install dependencies

```bash
pnpm install
cd src-tauri && cargo fetch && cd ..
```

Expected: no errors. `node_modules/` populated, `Cargo.lock` populated.

---

## 2. Run the test suite (TDD gate)

```bash
# Rust tests
cd src-tauri && cargo test && cd ..

# Frontend tests
pnpm test
```

Expected:
- Rust: all tests pass. Specifically these foundation tests exist and
  pass:
  - `db::tests::test_migration_creates_empty_tables`
  - `db::tests::test_integrity_check_detects_corruption`
  - `db::tests::test_export_json_from_corrupted_db`
  - `error::tests::test_app_error_serializes_to_snake_case`
- Frontend: all vitest tests pass. Specifically:
  - `App.test.tsx` — view switching
  - `CorruptedView.test.tsx` — shows export button
  - `Settings.test.tsx` — confirm dialog requires typed name
  - `IpcErrorRender.test.tsx` — AppError variant → correct i18n key
  - `i18n.test.ts` — missing-key fallback + dev warning

If any test fails, the foundation is not ready for app-level validation —
fix it before continuing.

---

## 3. Launch the app and verify S1 (启动并看到主窗口骨架)

Manual verification:

```bash
pnpm tauri dev
```

Expected:
- Window appears within 2 seconds
- Top bar shows three view tabs: `列表` / `看板` / `甘特图` (from i18n)
- Active view shows placeholder text via `t('views.placeholder')`
- Switch tabs: state changes, only one is active at a time

Verify acceptance scenarios 1-4 of S1.

**Automated smoke** (CI-friendly; covers FR-001's "DB file is created
on first launch" — jsdom tests cannot observe filesystem side effects):

```bash
pnpm dev:smoke
# or: bash scripts/dev-smoke.sh
# pass --keep to leave the dev server running after a green run
```

The script wipes any existing DB, boots `pnpm tauri dev`, waits for
`http://localhost:1420` to come up, polls for
`~/Library/Application Support/com.huyikai.solo-task/tasks.db` (or
the platform equivalent), then verifies the schema contains the seven
expected tables (`tasks`, `subtasks`, `tags`, `task_tags`,
`reminders`, `migrations`, `user_preferences`). Exit 0 means FR-001
fires on first launch.

---

## 4. Verify S2 (Settings 入口)

In the running app:

1. Open Settings (entry point per design — header menu item, hamburger icon,
   or keyboard shortcut, depending on `Layout.tsx` design)
2. Page renders two buttons: `检查更新` and `清除所有数据`
3. Click `清除所有数据` → confirm dialog opens, placeholder shows the
   expected confirmation text (from `settings.confirm_clear_placeholder`)
4. Type the wrong text → confirm button disabled or shows error
5. Type the correct text → confirm button enabled; clicking shows a stub
   completion toast (no actual DB wipe at foundation stage)

Verify acceptance scenarios 1-4 of S2.

---

## 5. Verify S4 (IPC 错误结构化)

In dev mode, the Settings page exposes a "developer mode" section with a
"Test Error" picker (gated by `import.meta.env.DEV`).

1. Pick `db_locked` → expect toast/banner with `error.db_locked` text
2. Pick `db_corrupted` → expect app to switch to CorruptedView
3. Pick `permission_denied` → expect `error.permission_denied` text
4. Pick `unknown` → expect generic `error.unknown` text

In every case: **no internal Rust stack trace** should be visible to the
user. Check browser/webview devtools console — the raw error IS logged
there for debugging, but the UI surface is the i18n key only.

Verify acceptance scenarios 1-4 of S4.

---

## 6. Verify S3 (DB 损坏降级)

This is destructive: you'll corrupt a local DB file. Do NOT run this on a
DB that contains real data. Foundation DB is empty, so this is safe.

```bash
# Stop the app first
# Then overwrite the DB with junk bytes
echo "this is not a sqlite file" > \
  "$HOME/Library/Application Support/com.huyikai.solo-task/tasks.db"

# Re-launch
pnpm tauri dev
```

Expected:
- Window appears within 3 seconds
- Main view is replaced by `CorruptedView` showing:
  - Title: `corrupted.title`
  - Message: `corrupted.message`
  - Button: `corrupted.export` (导出为 JSON)
- View tabs are disabled (see plan.md Open Question Q2)
- Clicking the export button opens native save dialog, writes JSON to
  chosen path
- The exported JSON contains `"warnings": ["database_corrupted"]` and
  empty arrays for tasks/subtasks/tags/reminders

Verify acceptance scenarios 1-4 of S3.

After verification, restore the DB by deleting the corrupted file (next
launch will recreate it):

```bash
rm "$HOME/Library/Application Support/com.huyikai.solo-task/tasks.db"
```

---

## 7. Verify CI gate

```bash
git checkout -b scratch/verify-ci
echo "// touch" >> src/App.tsx
git add src/App.tsx
git commit -m "ci(verify): temporary touch to trigger CI"
git push origin scratch/verify-ci
gh pr create --fill --base main --head scratch/verify-ci
```

Expected: GitHub Actions shows two jobs, both green:
- `ci / test (macos-latest)`
- `ci / test (windows-latest)`

Each runs:
- `cargo check`
- `cargo test`
- `pnpm install --frozen-lockfile && pnpm exec tsc --noEmit`
- `pnpm test`

After verification, close the PR and delete the branch:

```bash
gh pr close --delete-branch
git checkout main && git pull
git branch -D scratch/verify-ci
```

---

## 8. Verify pre-push TDD hook

```bash
# Make a fake "production-only" change
echo "// bad" >> src/App.tsx
git add src/App.tsx
git commit -m "feat(app): missing test"
git push    # SHOULD BE BLOCKED by pre-push hook
```

Expected: hook exits with non-zero and prints a message naming the
scope (`feat(app):`) and the missing test commit.

Then verify the happy path:

```bash
git reset --hard HEAD~1
# Make a test commit first
cat > src/__tests__/AppExtra.test.tsx <<'EOF'
test('placeholder', () => { expect(1+1).toBe(2); });
EOF
git add src/__tests__/AppExtra.test.tsx
git commit -m "feat(app): add placeholder test"
# Then the production commit
echo "// good" >> src/App.tsx
git add src/App.tsx
git commit -m "feat(app): trivial change"
git push    # SHOULD PASS
```

Clean up after:

```bash
git reset --hard origin/main
```

---

## Validation Summary

| User Story | Step | Status |
|---|---|---|
| S1 启动并看到主窗口骨架 | 3 | ⬜ |
| S2 Settings 入口 | 4 | ⬜ |
| S3 DB 损坏降级 | 6 | ⬜ |
| S4 IPC 错误结构化 | 5 | ⬜ |
| S5 全局 i18n 入口 | 2 (tests cover), 3-6 (visual check) | ⬜ |
| CI gate | 7 | ⬜ |
| Pre-push hook | 8 | ⬜ |
| Performance budgets | manual: time cold start with `time pnpm tauri dev` | ⬜ |

When every box is checked, the foundation is ready for the next spec.
