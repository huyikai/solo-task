# Tasks: 项目骨架 (Foundation)

**Input**: Design documents from `/specs/001-foundation/`
- spec.md (5 user stories: S1-P1, S2-P1, S3-P1, S4-P2, S5-P2 + S6-P0 visual)
- plan.md (single Tauri crate + React src/, technical context, UI Design Phasing)
- data-model.md (6 SQLite tables, AppError, ExportPayload, I18nKey)
- contracts/ipc.md (3 IPC commands)
- quickstart.md (8-step local validation)

**Global design reference**: `.specify/memory/design.md` (Constitution
Principle X, v1.5.0). All UI tasks inherit tokens (Section 1), component
visual skeletons (Section 6 — Button/Card/Layout/ViewTabs/CorruptedView/
Settings), anti-patterns (Section 2, 33 items), and pre-flight standard
(Section 3). Foundation-local files do not redefine any of these.

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: REQUIRED (Constitution Principle VI TDD is NON-NEGOTIABLE). Every
behavioral change has a failing test first.

**Organization**: Tasks grouped by user story (S1-S5), preceded by Setup
(TDD-skip) and a new **Design Foundation** phase (Phase 1.5) that
front-loads visual design before behavior tests. Two chore scopes
(hook + CI) at the end.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. [S1], [S2])
- **[Visual]** vs **[Behavior]**: tags inside UI scopes distinguish visual
  skeleton (front-loaded, pre-review) from behavior TDD (post-review)
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

## Design Reference (constitution Principles IX + X)

UI design is **decided in spec/plan phase** (project-level file:
`.specify/memory/design.md`, locked by Constitution Principle X),
**implemented in this phase**, and **validated at 4 pre-flight
checkpoints** (D1-D4). Per-component post-hoc review is wasteful; the
global design file is the single source of truth for tokens, component
visual skeletons (Section 6), and the 33-item anti-pattern checklist
(Section 2).

| Review ID | Scope | When in tasks.md |
|---|---|---|
| **D1** | tokens (colors, spacing, type, shadow, radius) | End of Phase 1.5 |
| **D2** | Layout shell + three view-tab placeholders | End of Phase 3 Visual |
| **D3** | CorruptedView + its integration in App state machine | End of Phase 5 Visual |
| **D4** | Settings page + ConfirmDialog + Test Error picker (dev only) | End of Phase 6 Visual |

Each review invokes `/design-taste-frontend` skill against the running
UI, runs the 33-item anti-pattern checklist from `.specify/memory/design.md` Section 2,
and produces a summary in the commit body:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

`Pre-flight check: fail` blocks the commit until fixed.

---

## Phase 1: Setup (Project Scaffold)

**Purpose**: Tauri 2 + React 18 + TS5 + Vite scaffold + pnpm lockfile. **TDD-skip** (pure config per Constitution Principle VI exemption list).

- [ ] T001 Initialize Tauri 2.x project at repo root via `pnpm create tauri-app@latest` (select React + TypeScript + Vite)
- [ ] T002 [P] Add Rust dependencies to `src-tauri/Cargo.toml`: `rusqlite = { version = "0.31", features = ["bundled"] }`, `serde`, `serde_json`, `thiserror`, `dirs`, `tempfile` (dev), `tauri-plugin-dialog`
- [ ] T003 [P] Add frontend dependencies to `package.json`: `@tauri-apps/api ^2`, `tailwindcss ^3`, `vitest ^1`, `@testing-library/react ^14`, `@testing-library/jest-dom ^6`, `@testing-library/user-event ^14`, `jsdom ^24`, `@vitest/coverage-v8`
- [ ] T004 [P] Configure `tsconfig.json` with `strict: true` and `paths` alias `@/*` → `src/*`
- [ ] T005 [P] Configure `vite.config.ts` with React plugin + vitest config (`environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`)
- [ ] T006 [P] Configure `tailwind.config.ts` to scan `src/**/*.{ts,tsx}`; add `postcss.config.cjs`
- [ ] T007 [P] Create directory skeleton: `src-tauri/src/{db,commands}/`, `src/{views,components,i18n,api,styles,test,__tests__}/`, `.githooks/`, `.github/workflows/`
- [ ] T008 [P] Update `.gitignore`: ensure `node_modules/`, `src-tauri/target/`, `dist/`, `data/`, `.DS_Store` are ignored (already present); add `.githooks/.installed`

**Checkpoint**: `pnpm install` + `cd src-tauri && cargo fetch` complete; `pnpm tauri dev` launches an empty Tauri window (default template content, not our UI yet).

---

## Phase 1.5: Design Implementation (按 design.md 落地)

**Purpose**: 把 `.specify/memory/design.md` 中已定的设计语言落地到代码（tokens + 组件视觉骨架），跑 D1 评审。**TDD-skip** for visual choices (tokens 没有行为；组件骨架只是 props + JSX 形状，行为测试在 Phase 3 之上叠加)。

**Why this phase exists**: 设计决策已在 `.specify/memory/design.md` 完成，本阶段是机械落地，避免在 implement 时再决定视觉。这样后续每个 UI scope 只需照搬 tokens，不必每次重新讨论视觉。

- [ ] T008a [P] Author `src/styles/tokens.css` **严格按照 `.specify/memory/design.md` Section 1 的值**：色板 (light + dark) / spacing scale / typography scale / radius / shadow / font family / z-index。Wire into Tailwind via `theme.extend` in `tailwind.config.ts` (per `.specify/memory/design.md` Section 1.8 mapping)。
- [ ] T008b [P] Author `src/components/Button.tsx` **严格按照 `.specify/memory/design.md` Section 6.1**：4 variants × 2 sizes 矩阵，radius `md`，focus 2px outline。
- [ ] T008c [P] Author `src/components/Card.tsx` **严格按照 `.specify/memory/design.md` Section 6.2**：surface + border + padding + shadow-sm。
- [ ] T008d Author `src/components/Layout.tsx` **严格按照 `.specify/memory/design.md` Section 6.3**：h-14 顶栏 + 主内容区，Settings 入口在右上角。
- [ ] T008e Author `src/components/ViewTabs.tsx` **严格按照 `.specify/memory/design.md` Section 6.4**：role="tablist"，选中状态 2px accent 下边线。
- [ ] T008f Author `src/pages/DesignPreview.tsx` (dev-only, gated by `import.meta.env.DEV`) — 把上面 5 个组件并排展示。**这是 D1 评审的可视化对象**（替代 AI 生图——生图模型对密集中文 + hex 码渲染不可靠，HTML 预览让你看实际像素）。Phase 8 T057 删除。
- [ ] T008g **🔔 Invoke `/design-taste-frontend` skill** on tokens + Button + Card + Layout + ViewTabs via DesignPreview。Skill runs the 33-item anti-pattern checklist from `.specify/memory/design.md` Section 2. Capture review summary.
- [ ] T008h Refactor if pre-flight fails (rename tokens / swap colors / adjust spacing). Loop until pre-flight passes.
- [ ] T008i Single commit: `feat(design): implement `.specify/memory/design.md` tokens + Section 6 components (D1)`. Commit body MUST include review summary + reference to the global design file.

**Checkpoint**: `pnpm tauri dev` shows DesignPreview page (dev-only) with all 5 components visible. Visual quality passes D1 pre-flight (33-item checklist 0 ❌). Foundation visual style is **locked** to `.specify/memory/design.md` for all subsequent UI work.

**Transition to Phase 2**: this phase produces visual artifacts; components are "skeleton only" (no behavior). Phase 3+ will add behavior tests on top — components from this phase are reused, not rewritten.

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
- [ ] T016a [P] [Red] Write failing integration test `src-tauri/src/db/tests.rs::test_user_preferences_table_seeded` asserting that `connect_and_init` creates `user_preferences` table with one row (`theme.mode` = `"system"`).
- [ ] T016b [Green] Extend migration v1 in `src-tauri/src/db/migrations.rs` to include `CREATE TABLE user_preferences` + seed row (per data-model.md). Re-run T016a → GREEN; verify T013/T015 still pass (no schema drift).
- [ ] T017 [P] [Red] Write failing test `src/i18n/t.test.ts` asserting: (a) `t('app.title')` returns `'Solo Task'`; (b) `t('missing.key')` returns `'<missing:missing.key>'` and `console.warn` was called in dev mode.
- [ ] T018 [Green] Implement `src/i18n/t.ts` (lookup function + missing-key fallback + `import.meta.env.DEV` warning) and `src/i18n/zh-CN.ts` (dictionary with 24 keys per data-model.md). Run `pnpm test` → confirm GREEN.

**Checkpoint**: `cargo test` and `pnpm test` both green for error/paths/db/i18n scopes. UI can now safely import i18n keys and call IPC commands.

---

## Phase 3: User Story 1 — 启动应用并看到主窗口骨架 (Priority: P1) 🎯 MVP

**Goal**: First launch → main window with three view tabs (list/board/gantt), placeholder content, view switching works.

**Independent Test**: Delete local DB file (or never had one), launch app. Verify: (a) window appears in <2s; (b) three tabs visible; (c) clicking each tab switches the active view; (d) closing app leaves a DB file with empty schema.

**Visual baseline**: Phase 1.5 already produced tokens + Button/Card/Layout/ViewTabs skeletons. This phase **adds behavior** (Red → Green) on top, and adds the three view placeholders (ListView/BoardView/GanttView) which were intentionally NOT in Phase 1.5.

### Tests for User Story 1 (Behavior TDD — Red first)

- [ ] T019 [P] [Red] Write failing test `src/__tests__/App.test.tsx`: render `<App />` after mocked `healthCheck()` resolves `{ok:true}` → assert three `ViewTabs` buttons render with labels from `t('views.list')`, `t('views.board')`, `t('views.gantt')`; clicking board sets active view (assert by data-testid or aria-current).
- [ ] T020 [P] [Red] Write failing test `src/__tests__/ViewTabs.test.tsx`: render three tabs, assert only one has `aria-current="page"` initially; clicking the second updates aria-current.
- [ ] T021 [P] [Red] Write failing integration test `src/__tests__/startup.test.tsx` (or via `pnpm tauri dev` smoke in quickstart): assert `healthCheck()` is called once on App mount, and that the initial render shows the placeholder.

### Implementation for User Story 1 (Green — visual skeletons from Phase 1.5 are reused, not rewritten)

- [ ] T022 [Green] Implement `src/views/ListView.tsx`, `src/views/BoardView.tsx`, `src/views/GanttView.tsx` — each renders `<Card><p>{t('views.placeholder')}</p></Card>`. Run `pnpm test` → App.test now green for T019.
- [ ] T023 [Green] Implement `src/App.tsx` — state machine `{health: 'loading' | 'ok' | 'corrupted' | 'locked', activeView: 'list'|'board'|'gantt'}`; on mount calls `healthCheck()`; on `ok` renders `<Layout><ViewTabs/>{activeView content}</Layout>`. Run `pnpm test` → all S1 tests GREEN.
- [ ] T024 [Visual] Confirm Phase 1.5 design review (D2) still applies now that three views are wired. **🔔 DESIGN REVIEW D2** (if needed): invoke `/design-taste-frontend` skill on the running app; commit body includes review summary only if findings changed.

**Checkpoint**: `pnpm tauri dev` shows three view tabs; clicking switches; closing leaves valid DB file. S1 acceptance scenarios 1-4 verifiable.

---

## Phase 4: User Story 2 — 打开设置页面 (Priority: P1)

**Goal**: Settings page reachable with two stub buttons + typed-name confirm dialog.

**Independent Test**: Open Settings → see two buttons → click "清除所有数据" → confirm dialog requires typing specific text → wrong text disables confirm, right text enables it → confirming shows completion toast (stub).

**Visual split**: Settings is a dense interaction page; deserves its own design review (D4 candidate, combined with Test Error picker in Phase 6).

### Tests for User Story 2 (Behavior TDD — Red first)

- [ ] T025 [P] [Red] Write failing test `src/__tests__/Settings.test.tsx`: render `<Settings />`, assert two buttons present with labels from `t('settings.check_for_update')` and `t('settings.clear_data')`.
- [ ] T026 [P] [Red] Write failing test for `ConfirmDialog`: render with `expectedText="DELETE"` and `value=""`, assert confirm button disabled; `userEvent.type('delete')` does NOT enable; `userEvent.type('DELETE')` enables.
- [ ] T027 [P] [Red] Write failing test for "Check for Update" stub: clicking the button shows a loading state then `t('settings.no_update')` within 1 second (use `vi.useFakeTimers()`).

### Implementation for User Story 2

- [ ] T028 [P] [Green] Implement `src/components/ConfirmDialog.tsx` — typed-name confirmation (props: `open`, `expectedText`, `onConfirm`, `onCancel`). Run `pnpm test` → T026 GREEN.
- [ ] T029 [Green] Implement `src/views/Settings.tsx` — two stub buttons + confirm dialog wired to `t('settings.*')` keys; "Check for Update" stub uses `setTimeout` to flip loading→no_update. Run `pnpm test` → T025 + T027 GREEN.
- [ ] T030 [Green] Wire Settings entry into `src/App.tsx`: add a Settings icon/button to Layout header; clicking sets `activeView` (or new `route` state) → render `<Settings />`. Run `pnpm test` → all S1+S2 tests green; manual smoke: `pnpm tauri dev` shows entry.

**Checkpoint**: Open Settings from main window; both buttons visible; clear-data confirm dialog enforces typed text. S2 acceptance scenarios 1-4 verifiable. (Design review D4 deferred to Phase 6 when Test Error picker is added.)

---

## Phase 5: User Story 3 — 损坏数据库时安全降级 (Priority: P1)

**Goal**: Corrupted DB → app shows notice + export button, does NOT silently wipe data.

**Independent Test**: Corrupt DB file (write non-SQLite bytes) → launch app → main window replaced by CorruptedView with export button → click export → native save dialog → confirm → JSON file written with `warnings: ["database_corrupted"]`.

**Visual split**: CorruptedView is a critical emergency state — it deserves its own design review (D3) because the visual hierarchy of "this is broken, here's your escape" is a UX moment that easy to get wrong.

### Tests for User Story 3 (Behavior TDD — Red first)

- [ ] T031 [P] [Red] Write failing Rust test `src-tauri/src/commands/export_json.rs::tests::test_export_json_from_corrupted_db` (or extend db/tests): create corrupted temp file, call `export_json(&temp_path, &output_path)`, assert JSON written contains `"warnings": ["database_corrupted"]` and empty arrays.
- [ ] T032 [P] [Red] Write failing test `src/__tests__/App.test.tsx`: with mocked `healthCheck()` resolving `{ok:false, error:{variant:'db_corrupted',...}}`, render `<App />` → assert `<CorruptedView>` is rendered, NOT `<Layout>` with view tabs (per Q2 default: tabs disabled).
- [ ] T033 [P] [Red] Write failing test `src/__tests__/CorruptedView.test.tsx`: render `<CorruptedView />`, assert it shows `t('corrupted.title')`, `t('corrupted.message')`, and a button with label `t('corrupted.export')`; clicking button calls `exportJson(path)` and shows success state.

### Implementation for User Story 3

- [ ] T034 [Green] Implement `pub fn export_json(conn_path: &Path, output: &Path) -> Result<ExportSummary, AppError>` in `src-tauri/src/commands/export_json.rs`: open conn in read-only mode (best-effort even if corrupted), serialize `ExportPayload` per data-model.md, write JSON to output path. Run `cargo test` → T031 GREEN.
- [ ] T035 [Green] Register IPC commands in `src-tauri/src/main.rs` (and `lib.rs` per Tauri 2 convention): `health_check`, `export_json`, `trigger_test_error`. Run `pnpm tauri build` once to confirm commands are wired (no behavior test yet — comes in S4).
- [ ] T036 [Green] Implement `src/views/CorruptedView.tsx` — renders title + message + export button; on click invokes `tauri-plugin-dialog` save dialog then `exportJson(path)` from `src/api/ipc.ts`. Run `pnpm test` → T032 + T033 GREEN.
- [ ] T037 [Green] Update `src/App.tsx`: handle `health: 'corrupted'` state → render `<CorruptedView />` (and disable tabs per Q2). Run `pnpm test` → all S1+S2+S3 tests green.
- [ ] T038 [Visual] **🔔 DESIGN REVIEW D3**: invoke `/design-taste-frontend` skill on the running app with corrupted DB; verify the "broken state" UX reads correctly (calm, clear escape, no alarm theater). Single commit if changes; commit body includes review summary.

**Checkpoint**: With corrupted DB, app shows CorruptedView; export writes JSON with `warnings: ["database_corrupted"]`. S3 acceptance scenarios 1-4 verifiable.

---

## Phase 6: User Story 4 — IPC 错误结构化呈现 (Priority: P2)

**Goal**: Every `AppError` variant renders via i18n key; no internal stack leaked.

**Independent Test**: Settings page (dev mode) exposes a "Test Error" picker; selecting each variant produces the expected i18n text without Rust stacks.

### Tests for User Story 4 (Behavior TDD — Red first)

- [ ] T039 [P] [Red] Write failing test `src/__tests__/ipc-bridge.test.ts`: assert `i18nKeyFor({variant:'db_locked', ...})` returns `'error.db_locked'`; same for `db_corrupted`, `permission_denied`, `unknown`, `task_not_found`, `io_error` — all six.
- [ ] T040 [P] [Red] Write failing test `src/__tests__/IpcErrorRender.test.tsx`: render a `<ErrorToast error={AppErrorSerialized} />` for each variant, assert rendered text comes from `t(key)`, never from `error.message`.
- [ ] T041 [P] [Red] Write failing Rust test `src-tauri/src/commands/trigger_test_error.rs::tests::test_trigger_returns_named_variant`: for each of the 4 supported variants in plan.md, call `trigger_test_error(variant)` and assert the returned `AppError` matches.

### Implementation for User Story 4

- [ ] T042 [Green] Implement `src/api/ipc.ts` — typed wrappers per contracts/ipc.md; `IpcResult<T>` discriminated union; `i18nKeyFor(error)` mapping per data-model.md table. Run `pnpm test` → T039 GREEN.
- [ ] T043 [Green] Implement `src/components/ErrorToast.tsx` — renders `t(i18nKeyFor(error))`, never `error.message`. Run `pnpm test` → T040 GREEN.
- [ ] T044 [Green] Implement `src-tauri/src/commands/trigger_test_error.rs` — switch on variant, return the matching `AppError`. Run `cargo test` → T041 GREEN.
- [ ] T045 [Green] Update `src/views/Settings.tsx` (from Phase 4): add dev-only "Test Error" picker (gated by `import.meta.env.DEV` per Q3), dispatches `triggerTestError` then renders `ErrorToast` with the returned error. Run `pnpm test` → all S1-S4 tests green.
- [ ] T046 [Visual] **🔔 DESIGN REVIEW D4**: invoke `/design-taste-frontend` skill on Settings page + ConfirmDialog + Test Error picker + ErrorToast. Single commit if changes; commit body includes review summary.
- [ ] T046a [P] [Red] Write failing Rust test `src-tauri/src/commands/get_preference.rs::tests::test_get_returns_seeded_theme_default` asserting `get_preference("theme.mode")` after a fresh DB returns `value: "\"system\""`.
- [ ] T046b [P] [Red] Write failing Rust test `src-tauri/src/commands/get_preference.rs::tests::test_get_missing_key_returns_unknown` asserting `get_preference("nonexistent.key")` returns `Err(AppError::Unknown("preference_not_found: ..."))`.
- [ ] T046c [P] [Red] Write failing Rust test `src-tauri/src/commands/set_preference.rs::tests::test_set_then_get_round_trip` asserting `set_preference("theme.mode", "\"dark\"")` followed by `get_preference` returns the dark value, with `updated_at` advancing.
- [ ] T046d [Green] Implement `src-tauri/src/commands/get_preference.rs` and `set_preference.rs` per contracts/ipc.md. Run `cargo test` → T046a/b/c GREEN. Register both commands in `src-tauri/src/main.rs`.
- [ ] T046e [P] [Red] Write failing test `src/__tests__/ThemeSwitcher.test.tsx`: render `<ThemeSwitcher value="system" onChange={vi.fn()} />`, assert 3 radio buttons with labels from `t('settings.theme.system/light/dark')` and `system` checked; clicking `dark` calls `onChange("dark")`.
- [ ] T046f [P] [Green] Implement `src/components/ThemeSwitcher.tsx` per `.specify/memory/design.md` Section 6.6 — segmented control with ARIA `role="radiogroup"`, radius-md 8px, accent border on selected. Run `pnpm test` → T046e GREEN.
- [ ] T046g [P] [Green] Implement `src/api/preferences.ts` — typed wrapper for `getPreference`/`setPreference` with theme validation (`'system' | 'light' | 'dark'`). Run `pnpm test` → typed wrapper covered.
- [ ] T046h [Green] Update `src/views/Settings.tsx`: on mount call `getPreference('theme.mode')` (default `'system'` if missing); render `<ThemeSwitcher>` in Appearance group; on change call `setPreference` and apply immediately via `document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')` based on `resolvedTheme` computed from user choice + `prefers-color-scheme`. Run `pnpm test` → all S1-S4 + S6 tests green.
- [ ] T046i Add 6 new i18n keys to `src/i18n/zh-CN.ts`: `settings.appearance`, `settings.theme`, `settings.theme.system`, `settings.theme.light`, `settings.theme.dark`, `settings.theme.currentHint`. Run `pnpm check:i18n` → 0 hardcoded strings.
- [ ] T046j [Visual] **🔔 DESIGN REVIEW D4 (extended)**: ThemeSwitcher is now part of Settings. Run `/design-taste-frontend` skill against Settings page + ConfirmDialog + Test Error picker + ThemeSwitcher + ErrorToast. Single commit if changes; commit body includes review summary.

**Checkpoint**: In dev mode, Settings shows Test Error picker; each variant renders the correct i18n text; no internal stacks visible. S4 acceptance scenarios 1-4 verifiable.

---

## Phase 7: User Story 5 — 全局 i18n 入口可见 (Priority: P2)

**Goal**: Every user-visible string comes from `t(key)`; zero hardcoded Chinese in components.

**Independent Test**: Grep `src/` for hardcoded Chinese (CJK Unified Ideographs) — count must be 0 outside `src/i18n/zh-CN.ts`. Missing-key fallback works in dev mode.

### Tests for User Story 5 (Behavior TDD — Red first, extends Phase 2 work)

- [ ] T047 [P] [Red] Write failing grep-style test `scripts/check-i18n.mjs`: walks `src/**/*.{ts,tsx}` excluding `src/i18n/`, fails if any CJK Unified Ideograph (一-鿿) appears. Wire into `pnpm test` via `vitest` config or as pre-test script.
- [ ] T048 [P] [Red] Write failing test `src/__tests__/i18n.test.ts` (extends T017): verify all 24 I18nKey values from data-model.md exist in `zh-CN.ts`; assert `t()` returns the same string for variable interpolation cases (e.g. `t('corrupted.exporting', { path })`).

### Implementation for User Story 5

- [ ] T049 [Green] Implement `scripts/check-i18n.mjs` — regex CJK scan; integrates with `vitest globalSetup` or runs as `pnpm check:i18n`. Run → T047 GREEN.
- [ ] T050 [Green] Audit every component written in Phases 1.5, 3-6 for hardcoded strings; replace with `t(...)` calls; add missing keys to `zh-CN.ts`. Run `pnpm check:i18n` → must report 0 hardcoded strings. Run `pnpm test` → all tests green.

**Checkpoint**: `pnpm check:i18n` passes; no hardcoded Chinese outside dictionary. S5 acceptance scenarios 1-3 verifiable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: TDD enforcement hook, CI workflow, full validation, cleanup.

- [ ] T051 [P] Implement `.githooks/pre-push` bash script: walks commits about to be pushed; for any commit modifying production code (non-test path), requires an earlier commit in same push with same scope that modified a test path; rejects force-push to `main` (Q1).
- [ ] T052 [P] Add `.githooks/README.md` with install instructions: `git config core.hooksPath .githooks` + chmod +x.
- [ ] T053 [P] Implement `scripts/test-prepush.sh`: positive + negative test cases for the hook (run hook against synthetic git refs, assert exit codes).
- [ ] T054 [P] Implement `.github/workflows/ci.yml`: trigger on push to main + PR; matrix `os: [macos-latest, windows-latest]`; steps: checkout, setup-node (with pnpm via `pnpm/action-setup`), setup-rust, `cargo check`, `cargo test`, `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm check:i18n`. Both runners required.
- [ ] T055 [P] Add `package.json` script `check:i18n`: `node scripts/check-i18n.mjs`.
- [ ] T056 [P] Add `package.json` scripts `test:rust` and aggregate `test:all` running both `cargo test` and `pnpm test`.
- [ ] T057 Remove `src/pages/DesignPreview.tsx` (Phase 1.5 helper) — its job is done.
- [ ] T058 Run full quickstart.md validation locally (steps 2-8); fix any failures.
- [ ] T059 Push a scratch PR to verify CI is green on macOS + Windows runners; close + delete branch after.
- [ ] T060 Final cleanup: remove any debug logs, dead code, console.log calls; verify `cargo clippy -- -D warnings` clean and `pnpm exec tsc --noEmit` clean.

**Checkpoint**: Foundation slice ready for follow-up specs (CRUD / reminders / gantt).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Design Foundation (Phase 1.5)**: Depends on Setup (need scaffold + Tailwind config); **BLOCKS all UI work**
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3-7)**: Depend on Phase 1.5 + Phase 2; can proceed in priority order
- **Polish (Phase 8)**: Depends on S1-S5 complete

### Story Dependency Graph

```
Phase 1 (Setup)
    │
    ├──► Phase 1.5 (Design Foundation: tokens + visual skeletons + D1 review)
    │
    └──► Phase 2 (Foundational: error + paths + db + i18n)
              │
              ├──► Phase 3 [S1] (Views + App shell, D2 review)  ←──┐
              │                                                  │
              ├──► Phase 4 [S2] (Settings + ConfirmDialog)  ─────┤
              │                                                  │
              ├──► Phase 5 [S3] (CorruptedView + export, D3)  ───┤
              │                                                  │
              ├──► Phase 6 [S4] (ipc-bridge + Test Error, D4) ──┤
              │                                                  │
              └──────────────────────────────────────────────────┴──► Phase 7 [S5] (i18n audit)
                                                                       │
                                                                       ▼
                                                                  Phase 8 (Polish: hook + CI)
```

### Within Each Phase

- **Phase 1.5** is sequential: tokens → component skeletons → design review → refactor → commit. NOT TDD.
- **Phase 2+** follows strict TDD: failing test first (Red), minimum production code (Green), optional cleanup (Refactor).
- **UI scopes** (Phase 3-6) follow Visual-first-then-Behavior: visual skeleton from Phase 1.5 + new view content → behavior tests → behavior implementation → design review only if D2/D3/D4 needs re-running.

### Parallel Opportunities (within phase)

- Phase 1.5: T008a, T008b, T008c are [P] (different files); T008d depends on T008a (uses tokens); T008e depends on T008a
- Phase 2: T009, T011, T013, T015, T017 can be drafted in parallel (different test files)
- Phase 3: T022 (views) parallel with T019/T020/T021 (tests)
- Phase 4: T028 (ConfirmDialog) parallel with T029 (Settings)
- Phase 8: T051-T056 all [P]

---

## Commit Count Estimate

| Phase | Scopes | Commits (Visual + Red + Green + Refactor + Review) |
|---|---|---|
| 1 Setup | chore(repo) | 1 |
| 1.5 Design | feat(design) | 1 (+ 0-2 refactor commits if review findings) |
| 2 Foundational | feat(error), feat(paths), feat(db), feat(i18n) | 4 × 2 = 8 |
| 3 S1 | feat(views), feat(app) | 2 + 1 (D2 review only if changes) |
| 4 S2 | feat(settings) | 3 |
| 5 S3 | feat(commands), feat(corrupted) | 4 + 1 (D3 review commit) |
| 6 S4 | feat(ipc-bridge), feat(commands) | 4 + 1 (D4 review commit) |
| 7 S5 | chore(i18n-audit) | 2 |
| 8 Polish | chore(hook), chore(ci), chore(cleanup) | 3-4 |
| **Total** | | **~28-32 commits** |

---

## Risks & Warnings

- **R1 (HIGH)**: First `cargo build` after scaffold will be slow (5-10 min) — Tauri pulls many crates.
- **R2 (MEDIUM)**: GitHub Actions Windows runners are slower than macOS for Rust builds. First CI run may take 10-15 min.
- **R3 (MEDIUM)**: `design-taste-frontend` skill output is text-based; must manually distill into commit body summary format. If findings are many, plan for 1-2 refactor iterations before pre-flight passes.
- **R4 (LOW)**: If `tauri-plugin-dialog` v2 has API churn, T036 may need signature tweaks.
- **R5 (LOW)**: `dirs` crate behavior on Windows differs from `dirs-next`; T012's test must use temp-env override to be deterministic.
- **R6 (NEW)**: Phase 1.5 introduces `src/pages/DesignPreview.tsx` for review purposes — must be removed in T057 or it will ship in production. Add `import.meta.env.DEV` gate if keeping.

---

## Implementation Strategy

### MVP First (Phase 1 + 1.5 + 2 + 3 only)

If time-constrained, complete Phases 1 + 1.5 + 2 + 3 and stop. Result:
working three-view shell with design-approved visual style, even without
Settings/CorruptedView/IPC error handling. This satisfies Constitution
Principle III (no creep) and Principle IX (design quality).

### Incremental Delivery

Recommended: complete Setup → Design Foundation → Foundational → S1 → S2 → S3
first (all P1 stories). S4 (P2) and S5 (P2) can be added without disturbing
P1 behavior. Polish (Phase 8) lands last so the hook doesn't reject the
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
- Pre-push hook (Phase 8 T051) MUST be installed and working before any
  push to `main` (otherwise Phase 1.5-7 commits could land without TDD
  enforcement)
- CI workflow (Phase 8 T054) MUST be the last infrastructure commit —
  otherwise earlier commits may fail CI for legitimate TDD-red reasons
- **Design reviews are checkpoints, not gates per commit**. Only 4 reviews
  total (D1-D4). Do not invoke the skill more than that.
- **Phase 1.5 visual skeletons are reused in Phase 3+**. They are NOT
  rewritten when behavior tests are added — tests attach to existing
  component shape.
