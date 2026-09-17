# Tasks: 项目骨架 (Foundation)

**Input**: Design documents from `/specs/001-foundation/`
- spec.md (5 user stories: S1-P1, S2-P1, S3-P1, S4-P2, S5-P2)
- plan.md (single Tauri crate + React src/, technical context)
- data-model.md (6 SQLite tables, AppError, ExportPayload, I18nKey)
- contracts/ipc.md (3 IPC commands)
- quickstart.md (8-step local validation)

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: REQUIRED (Constitution Principle VI TDD is NON-NEGOTIABLE). Every
behavioral change has a failing test first.

**Organization**: Tasks grouped by user story (S1-S5), with three
infrastructure scopes (TDD-skip) and two chore scopes (hook + CI).

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. [S1], [S2])
- Include exact file paths in descriptions

## Path Conventions

Single Tauri crate layout (per plan.md):
- Rust: `src-tauri/src/...`
- React: `src/...`
- Hooks: `.githooks/...`
- CI: `.github/workflows/...`

## Open Questions (locked to defaults per plan.md)

- **Q1**: pre-push hook blocks force-push to `main` (non-zero exit)
- **Q2**: DB corrupted → navigation tabs disabled (only CorruptedView + Settings reachable)
- **Q3**: `trigger_test_error` button visible only when `import.meta.env.DEV`

---

## Phase 1: Setup (Project Scaffold)

**Purpose**: Tauri 2 + React 18 + TS5 + Vite scaffold. **TDD-skip** (pure config per Constitution Principle VI exemption list).

- [ ] T001 Initialize Tauri 2.x project at repo root via `npm create tauri-app@latest` (select React + TypeScript + Vite)
- [ ] T002 [P] Add Rust dependencies to `src-tauri/Cargo.toml`: `rusqlite = { version = "0.31", features = ["bundled"] }`, `serde`, `serde_json`, `thiserror`, `dirs`, `tempfile` (dev), `tauri-plugin-dialog`
- [ ] T003 [P] Add frontend dependencies to `package.json`: `@tauri-apps/api ^2`, `tailwindcss ^3`, `vitest ^1`, `@testing-library/react ^14`, `@testing-library/jest-dom ^6`, `@testing-library/user-event ^14`, `jsdom ^24`, `@vitest/coverage-v8`
- [ ] T004 [P] Configure `tsconfig.json` with `strict: true` and `paths` alias `@/*` → `src/*`
- [ ] T005 [P] Configure `vite.config.ts` with React plugin + vitest config (`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`)
- [ ] T006 [P] Configure `tailwind.config.ts` to scan `src/**/*.{ts,tsx}`; add `postcss.config.cjs`
- [ ] T007 [P] Create directory skeleton: `src-tauri/src/{db,commands}/`, `src/{views,components,i18n,api,styles,test,__tests__}/`, `.githooks/`, `.github/workflows/`
- [ ] T008 [P] Update `.gitignore`: ensure `node_modules/`, `src-tauri/target/`, `dist/`, `data/`, `.DS_Store` are ignored (already present); add `.githooks/.installed`

**Checkpoint**: `npm install` + `cd src-tauri && cargo fetch` complete; `npm run tauri dev` launches an empty Tauri window (default template content, not our UI yet).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Rust error type + DB infrastructure + i18n lookup. **All subsequent phases depend on this.**

**⚠️ CRITICAL**: No user story work can begin until T009-T018 are complete.

- [ ] T009 [P] [Red] Write failing test `src-tauri/src/error.rs::tests::test_app_error_serializes_to_snake_case` asserting `AppError::DbLocked` serializes to `"db_locked"`, `TaskNotFound(7)` to `"task_not_found"`, etc. Run `cargo test` → confirm RED.
- [ ] T010 [Green] Implement `AppError` enum in `src-tauri/src/error.rs` with `#[derive(Debug, thiserror::Error, serde::Serialize)]`, `#[serde(rename_all = "snake_case", tag = "variant", content = "message")]`, all 6 variants per data-model.md. Run `cargo test` → confirm GREEN.
- [ ] T011 [P] [Red] Write failing test `src-tauri/src/paths.rs::tests::test_resolve_db_path_uses_dirs_crate` asserting the path includes `com.huyikai.solo-task` and `tasks.db` (use `tempfile` + env override for `XDG_DATA_HOME`/`HOME` to make it deterministic).
- [ ] T012 [Green] Implement `pub fn db_path() -> PathBuf` in `src-tauri/src/paths.rs` using `dirs::data_dir()` + format string. Run `cargo test` → confirm GREEN.
- [ ] T013 [P] [Red] Write failing integration test `src-tauri/src/db/tests.rs::test_migration_creates_empty_tables` asserting that calling `db::connect_and_init(tempfile)` creates the 6 tables per data-model.md and inserts the v1 migration row.
- [ ] T014 [Green] Implement `pub fn connect_and_init(path: &Path) -> Result<Connection, AppError>` in `src-tauri/src/db/mod.rs`: open conn, run `PRAGMA journal_mode=WAL`, run migrations (idempotent), wrap everything in transaction (Principle VII.4 panic-safe).
- [ ] T015 [P] [Red] Write failing integration test `src-tauri/src/db/tests.rs::test_integrity_check_detects_corruption` asserting that after writing non-SQLite bytes to a temp file, `db::integrity_check(&conn)` returns `Err(AppError::DbCorrupted)`.
- [ ] T016 [Green] Implement `pub fn integrity_check(conn: &Connection) -> Result<(), AppError>` in `src-tauri/src/db/mod.rs` running `PRAGMA integrity_check` and mapping any non-`ok` result to `DbCorrupted`.
- [ ] T017 [P] [Red] Write failing test `src/i18n/t.test.ts` asserting: (a) `t('app.title')` returns `'Solo Task'`; (b) `t('missing.key')` returns `'<missing:missing.key>'` and `console.warn` was called in dev mode.
- [ ] T018 [Green] Implement `src/i18n/t.ts` (lookup function + missing-key fallback + `import.meta.env.DEV` warning) and `src/i18n/zh-CN.ts` (dictionary with 24 keys per data-model.md). Run `npm test` → confirm GREEN.

**Checkpoint**: `cargo test` and `npm test` both green for error/paths/db/i18n scopes. UI can now safely import i18n keys and call IPC commands.

---

## Phase 3: User Story 1 — 启动应用并看到主窗口骨架 (Priority: P1) 🎯 MVP

**Goal**: First launch → main window with three view tabs (list/board/gantt), placeholder content, view switching works.

**Independent Test**: Delete local DB file (or never had one), launch app. Verify: (a) window appears in <2s; (b) three tabs visible; (c) clicking each tab switches the active view; (d) closing app leaves a DB file with empty schema.

### Tests for User Story 1 (TDD — write FIRST, ensure RED)

- [ ] T019 [P] [Red] Write failing test `src/__tests__/App.test.tsx`: render `<App />` after mocked `healthCheck()` resolves `{ok:true}` → assert three `ViewTabs` buttons render with labels from `t('views.list')`, `t('views.board')`, `t('views.gantt')`; clicking board sets active view (assert by data-testid or aria-current).
- [ ] T020 [P] [Red] Write failing test `src/__tests__/ViewTabs.test.tsx`: render three tabs, assert only one has `aria-current="page"` initially; clicking the second updates aria-current.
- [ ] T021 [P] [Red] Write failing integration test `src/__tests__/startup.test.tsx` (or via `npm run tauri dev` smoke in quickstart): assert `healthCheck()` is called once on App mount, and that the initial render shows the placeholder.

### Implementation for User Story 1

- [ ] T022 [P] [Green] Implement `src/components/Button.tsx` — design-token Button (variants: primary/secondary/ghost; sizes: sm/md). Run `npm test` → existing tests still pass; manual visual check after T026.
- [ ] T023 [P] [Green] Implement `src/components/Card.tsx` — design-token Card wrapper. Run `npm test` → still green.
- [ ] T024 [P] [Green] Implement `src/components/Layout.tsx` — App shell (top bar placeholder + main content slot). Run `npm test` → still green.
- [ ] T025 [P] [Green] Implement `src/components/ViewTabs.tsx` — three buttons with `aria-current`, dispatches `onChange(view)` prop. Run `npm test ViewTabs` → confirm GREEN for T020.
- [ ] T026 [Green] Implement `src/views/ListView.tsx`, `src/views/BoardView.tsx`, `src/views/GanttView.tsx` — each renders `<Card><p>{t('views.placeholder')}</p></Card>`. Run `npm test` → App.test now green for T019. **🔔 DESIGN REVIEW REQUIRED**: invoke `/design-taste-frontend` skill on the rendered Layout + tabs + views; append review summary to commit body.
- [ ] T027 [Green] Implement `src/App.tsx` — state machine `{health: 'loading' | 'ok' | 'corrupted' | 'locked', activeView: 'list'|'board'|'gantt'}`; on mount calls `healthCheck()`; on `ok` renders `<Layout><ViewTabs/>{activeView content}</Layout>`. Run `npm test` → all S1 tests GREEN.

**🔔 DESIGN REVIEW COMMIT GATE**: T026 commit body MUST include:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

**Checkpoint**: `npm run tauri dev` shows three view tabs; clicking switches; closing leaves valid DB file. S1 acceptance scenarios 1-4 verifiable.

---

## Phase 4: User Story 2 — 打开设置页面 (Priority: P1)

**Goal**: Settings page reachable with two stub buttons + typed-name confirm dialog.

**Independent Test**: Open Settings → see two buttons → click "清除所有数据" → confirm dialog requires typing specific text → wrong text disables confirm, right text enables it → confirming shows completion toast (stub).

### Tests for User Story 2 (TDD — write FIRST)

- [ ] T028 [P] [Red] Write failing test `src/__tests__/Settings.test.tsx`: render `<Settings />`, assert two buttons present with labels from `t('settings.check_for_update')` and `t('settings.clear_data')`.
- [ ] T029 [P] [Red] Write failing test for `ConfirmDialog`: render with `expectedText="DELETE"` and `value=""`, assert confirm button disabled; `userEvent.type('delete')` does NOT enable; `userEvent.type('DELETE')` enables.
- [ ] T030 [P] [Red] Write failing test for "Check for Update" stub: clicking the button shows a loading state then `t('settings.no_update')` within 1 second (use `vi.useFakeTimers()`).

### Implementation for User Story 2

- [ ] T031 [P] [Green] Implement `src/components/ConfirmDialog.tsx` — typed-name confirmation (props: `open`, `expectedText`, `onConfirm`, `onCancel`). Run `npm test` → T029 GREEN.
- [ ] T032 [Green] Implement `src/views/Settings.tsx` — two stub buttons + confirm dialog wired to `t('settings.*')` keys; "Check for Update" stub uses `setTimeout` to flip loading→no_update. Run `npm test` → T028 + T030 GREEN. **🔔 DESIGN REVIEW REQUIRED**: invoke `/design-taste-frontend` skill on Settings page; append review summary to commit body.
- [ ] T033 [Green] Wire Settings entry into `src/App.tsx`: add a Settings icon/button to Layout header; clicking sets `activeView` (or new `route` state) → render `<Settings />`. Run `npm test` → all S1+S2 tests green; manual smoke: `npm run tauri dev` shows entry.

**🔔 DESIGN REVIEW COMMIT GATE**: T032 commit body MUST include design review summary (format from Phase 3).

**Checkpoint**: Open Settings from main window; both buttons visible; clear-data confirm dialog enforces typed text. S2 acceptance scenarios 1-4 verifiable.

---

## Phase 5: User Story 3 — 损坏数据库时安全降级 (Priority: P1)

**Goal**: Corrupted DB → app shows notice + export button, does NOT silently wipe data.

**Independent Test**: Corrupt DB file (write non-SQLite bytes) → launch app → main window replaced by CorruptedView with export button → click export → native save dialog → confirm → JSON file written with `warnings: ["database_corrupted"]`.

### Tests for User Story 3 (TDD — write FIRST)

- [ ] T034 [P] [Red] Write failing Rust test `src-tauri/src/commands/export_json.rs::tests::test_export_json_from_corrupted_db` (or extend db/tests): create corrupted temp file, call `export_json(&temp_path, &output_path)`, assert JSON written contains `"warnings": ["database_corrupted"]` and empty arrays.
- [ ] T035 [P] [Red] Write failing test `src/__tests__/App.test.tsx`: with mocked `healthCheck()` resolving `{ok:false, error:{variant:'db_corrupted',...}}`, render `<App />` → assert `<CorruptedView>` is rendered, NOT `<Layout>` with view tabs (per Q2 default: tabs disabled).
- [ ] T036 [P] [Red] Write failing test `src/__tests__/CorruptedView.test.tsx`: render `<CorruptedView />`, assert it shows `t('corrupted.title')`, `t('corrupted.message')`, and a button with label `t('corrupted.export')`; clicking button calls `exportJson(path)` and shows success state.

### Implementation for User Story 3

- [ ] T037 [Green] Implement `pub fn export_json(conn_path: &Path, output: &Path) -> Result<ExportSummary, AppError>` in `src-tauri/src/commands/export_json.rs`: open conn in read-only mode (best-effort even if corrupted), serialize `ExportPayload` per data-model.md, write JSON to output path. Run `cargo test` → T034 GREEN.
- [ ] T038 [Green] Register IPC commands in `src-tauri/src/main.rs` (and `lib.rs` per Tauri 2 convention): `health_check`, `export_json`, `trigger_test_error`. Run `npm run tauri build` once to confirm commands are wired (no behavior test yet — comes in S4).
- [ ] T039 [Green] Implement `src/views/CorruptedView.tsx` — renders title + message + export button; on click invokes `tauri-plugin-dialog` save dialog then `exportJson(path)` from `src/api/ipc.ts`. Run `npm test` → T035 + T036 GREEN. **🔔 DESIGN REVIEW REQUIRED**.
- [ ] T040 [Green] Update `src/App.tsx`: handle `health: 'corrupted'` state → render `<CorruptedView />` (and disable tabs per Q2). Run `npm test` → all S1+S2+S3 tests green.

**🔔 DESIGN REVIEW COMMIT GATE**: T039 commit body MUST include design review summary.

**Checkpoint**: With corrupted DB, app shows CorruptedView; export writes JSON with `warnings: ["database_corrupted"]`. S3 acceptance scenarios 1-4 verifiable.

---

## Phase 6: User Story 4 — IPC 错误结构化呈现 (Priority: P2)

**Goal**: Every `AppError` variant renders via i18n key; no internal stack leaked.

**Independent Test**: Settings page (dev mode) exposes a "Test Error" picker; selecting each variant produces the expected i18n text without Rust stacks.

### Tests for User Story 4 (TDD — write FIRST)

- [ ] T041 [P] [Red] Write failing test `src/__tests__/ipc-bridge.test.ts`: assert `i18nKeyFor({variant:'db_locked', ...})` returns `'error.db_locked'`; same for `db_corrupted`, `permission_denied`, `unknown`, `task_not_found`, `io_error` — all six.
- [ ] T042 [P] [Red] Write failing test `src/__tests__/IpcErrorRender.test.tsx`: render a `<ErrorToast error={AppErrorSerialized} />` for each variant, assert rendered text comes from `t(key)`, never from `error.message`.
- [ ] T043 [P] [Red] Write failing Rust test `src-tauri/src/commands/trigger_test_error.rs::tests::test_trigger_returns_named_variant`: for each of the 4 supported variants in plan.md, call `trigger_test_error(variant)` and assert the returned `AppError` matches.

### Implementation for User Story 4

- [ ] T044 [Green] Implement `src/api/ipc.ts` — typed wrappers per contracts/ipc.md; `IpcResult<T>` discriminated union; `i18nKeyFor(error)` mapping per data-model.md table. Run `npm test` → T041 GREEN.
- [ ] T045 [Green] Implement `src/components/ErrorToast.tsx` — renders `t(i18nKeyFor(error))`, never `error.message`. Run `npm test` → T042 GREEN. **🔔 DESIGN REVIEW REQUIRED**.
- [ ] T046 [Green] Implement `src-tauri/src/commands/trigger_test_error.rs` — switch on variant, return the matching `AppError`. Run `cargo test` → T043 GREEN.
- [ ] T047 [Green] Update `src/views/Settings.tsx` (from Phase 4): add dev-only "Test Error" picker (gated by `import.meta.env.DEV` per Q3), dispatches `triggerTestError` then renders `ErrorToast` with the returned error. Run `npm test` → all S1-S4 tests green. **🔔 DESIGN REVIEW REQUIRED** (modifies Settings).

**🔔 DESIGN REVIEW COMMIT GATES**: T045 and T047 commit bodies MUST include design review summaries.

**Checkpoint**: In dev mode, Settings shows Test Error picker; each variant renders the correct i18n text; no internal stacks visible. S4 acceptance scenarios 1-4 verifiable.

---

## Phase 7: User Story 5 — 全局 i18n 入口可见 (Priority: P2)

**Goal**: Every user-visible string comes from `t(key)`; zero hardcoded Chinese in components.

**Independent Test**: Grep `src/` for hardcoded Chinese (CJK Unified Ideographs) — count must be 0 outside `src/i18n/zh-CN.ts`. Missing-key fallback works in dev mode.

### Tests for User Story 5 (TDD — write FIRST, extends Phase 2 work)

- [ ] T048 [P] [Red] Write failing grep-style test `scripts/check-i18n.mjs`: walks `src/**/*.{ts,tsx}` excluding `src/i18n/`, fails if any CJK Unified Ideograph (一-鿿) appears. Wire into `npm test` via `vitest` config or as pre-test script.
- [ ] T049 [P] [Red] Write failing test `src/__tests__/i18n.test.ts` (extends T017): verify all 24 I18nKey values from data-model.md exist in `zh-CN.ts`; assert `t()` returns the same string for variable interpolation cases (e.g. `t('corrupted.exporting', { path })`).

### Implementation for User Story 5

- [ ] T050 [Green] Implement `scripts/check-i18n.mjs` — regex CJK scan; integrates with `vitest globalSetup` or runs as `npm run check:i18n`. Run → T048 GREEN.
- [ ] T051 [Green] Audit every component written in Phases 3-6 for hardcoded strings; replace with `t(...)` calls; add missing keys to `zh-CN.ts`. Run `npm run check:i18n` → must report 0 hardcoded strings. Run `npm test` → all tests green.

**Checkpoint**: `npm run check:i18n` passes; no hardcoded Chinese outside dictionary. S5 acceptance scenarios 1-3 verifiable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: TDD enforcement hook, CI workflow, full validation, cleanup.

- [ ] T052 [P] Implement `.githooks/pre-push` bash script: walks commits about to be pushed; for any commit modifying production code (non-test path), requires an earlier commit in same push with same scope that modified a test path; rejects force-push to `main` (Q1).
- [ ] T053 [P] Add `.githooks/README.md` with install instructions: `git config core.hooksPath .githooks` + chmod +x.
- [ ] T054 [P] Implement `scripts/test-prepush.sh`: positive + negative test cases for the hook (run hook against synthetic git refs, assert exit codes).
- [ ] T055 [P] Implement `.github/workflows/ci.yml`: trigger on push to main + PR; matrix `os: [macos-latest, windows-latest]`; steps: checkout, setup-node, setup-rust, `cargo check`, `cargo test`, `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run check:i18n`. Both runners required.
- [ ] T056 [P] Add `package.json` script `check:i18n`: `node scripts/check-i18n.mjs`.
- [ ] T057 [P] Add `package.json` scripts `test:rust` and aggregate `test:all` running both `cargo test` and `npm test`.
- [ ] T058 Run full quickstart.md validation locally (steps 2-8); fix any failures.
- [ ] T059 Push a scratch PR to verify CI is green on macOS + Windows runners; close + delete branch after.
- [ ] T060 Final cleanup: remove any debug logs, dead code, console.log calls; verify `cargo clippy -- -D warnings` clean and `tsc --noEmit` clean.

**Checkpoint**: Foundation slice ready for follow-up specs (CRUD / reminders / gantt).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3-7)**: Depend on Foundational; can proceed in priority order
- **Polish (Phase 8)**: Depends on S1-S5 complete

### Story Dependency Graph

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational: error + paths + db + i18n)
    │
    ├──► Phase 3 [S1] (Layout/Views/App shell)  ←──┐
    │                                              │
    ├──► Phase 4 [S2] (Settings + ConfirmDialog)  ├──► Phase 6 [S4] (ipc-bridge)
    │                                              │
    ├──► Phase 5 [S3] (CorruptedView + export)  ──┤
    │                                              │
    └──────────────────────────────────────────────┴──► Phase 7 [S5] (i18n audit)
                                                       │
                                                       ▼
                                                  Phase 8 (Polish: hook + CI)
```

S1 → S2 → S3 must precede S4 (because S4 needs the Settings page from S2
and App state machine from S1 + S3). S5 (i18n audit) must come after S1-S4
since it audits strings added in those phases.

### Within Each Scope

For TDD scopes (everything except Phase 1 + Phase 8 hooks/CI):
1. **Red commit** — write failing test only
2. **Green commit** — minimum production code
3. **Refactor commit** — cleanup (optional; skip if trivial)

UI scopes (Phase 3 T022-T026, Phase 4 T031-T033, Phase 5 T039-T040,
Phase 6 T045/T047) additionally require:
- `/design-taste-frontend` skill invocation
- Review summary in commit body

### Parallel Opportunities (within phase)

- Phase 2: T009, T011, T013, T015, T017 can be drafted in parallel
  (different test files in different modules)
- Phase 3: T022-T025 (four components) can be drafted in parallel
- Phase 4: T031 + T032 components in parallel with T033 wiring
- Phase 8: T052-T057 are all [P] — different files

---

## Commit Count Estimate

| Phase | Scopes | Commits (Red + Green + Refactor + UI-review) |
|---|---|---|
| 1 Setup | chore(repo) | 1 (config-only bundle) |
| 2 Foundational | feat(error), feat(paths), feat(db), feat(i18n) | 4 × 2 = 8 (Red+Green each) |
| 3 S1 | feat(layout), feat(views) | 2 × 2 = 4 + 1 design-review tag |
| 4 S2 | feat(settings) | 1 × 2 = 2 + 1 design-review tag |
| 5 S3 | feat(commands), feat(corrupted) | 2 × 2 = 4 + 1 design-review tag |
| 6 S4 | feat(ipc-bridge), feat(commands) (trigger_test_error) | 2 × 2 = 4 + 2 design-review tags |
| 7 S5 | (audit, no new scope) | 1 |
| 8 Polish | chore(hook), chore(ci) | 2-3 |
| **Total** | | **~26-28 commits** |

Pre-push hook should accept any grouping as long as same-scope test
precedes production within the same push.

---

## Risks & Warnings

- **R1 (HIGH)**: First `cargo build` after scaffold will be slow (5-10 min)
  — Tauri pulls many crates. Plan for one long build, then incremental.
- **R2 (MEDIUM)**: GitHub Actions Windows runners are slower than macOS
  for Rust builds. First CI run may take 10-15 min. Subsequent cached.
- **R3 (MEDIUM)**: `design-taste-frontend` skill output is text-based;
  must manually distill into commit body summary format. Don't skip this.
- **R4 (LOW)**: If `tauri-plugin-dialog` v2 has API churn, T039 may need
  signature tweaks. Verify version compatibility at T002.
- **R5 (LOW)**: `dirs` crate behavior on Windows differs from `dirs-next`;
  T012's test must use temp-env override to be deterministic.

---

## Implementation Strategy

### MVP First (S1 only)

If time-constrained, complete Phases 1 + 2 + 3 (S1) and stop. The result
is a working three-view shell, even without Settings/CorruptedView/IPC
error handling. This satisfies Constitution Principle III (no creep)
while delivering tangible progress.

### Incremental Delivery

Recommended: complete Setup + Foundational + S1 + S2 + S3 first (all P1
stories). S4 (P2) and S5 (P2) can be added without disturbing P1
behavior. Polish (Phase 8) lands last so the hook doesn't reject the
TDD-ordering work-in-progress.

### Solo Developer Note

Constitution Principle V says "single developer can hold it in their
head." Tasks are sized for sequential single-agent execution. If using
multi-agent / parallel sessions, respect [P] markers and story
independence — do NOT have two agents edit the same file concurrently.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (RED step is non-negotiable)
- Pre-push hook (Phase 8 T052) MUST be installed and working before any
  push to `main` (otherwise Phase 2-7 commits could land without TDD
  enforcement)
- CI workflow (Phase 8 T055) MUST be the last infrastructure commit —
  otherwise earlier commits may fail CI for legitimate TDD-red reasons
