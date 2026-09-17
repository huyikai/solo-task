# Implementation Plan: 项目骨架 (Foundation)

**Branch**: `001-foundation` | **Date**: 2026-09-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-foundation/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

---

## Summary

把 Constitution v1.3.0 中"应用启动 / 项目启动时"必须存在的基础设施一次性落地。交付一个
可启动的 Tauri 2.x + React 18 + TypeScript 5 + SQLite 应用骨架,涵盖:启动时 DB 自动建表
与 integrity_check、损坏降级 UI、IPC 结构化错误(AppError)、i18n 入口、Settings stub、
GitHub Actions 双 runner CI、TDD pre-push hook、通过 design-taste-frontend 评审的组件基础。

---

## Technical Context

- **Language/Version**: Rust 1.78+ (Tauri 2.x baseline); TypeScript 5.x (strict mode)
- **Primary Dependencies**:
  - Rust: `tauri = "2"`, `rusqlite = { version = "0.31", features = ["bundled"] }`,
    `serde = { version = "1", features = ["derive"] }`, `serde_json = "1"`,
    `thiserror = "1"`, `dirs = "5"`, `tauri-plugin-dialog = "2"` (save dialog)
  - Frontend: `react = "18"`, `react-dom = "18"`, `@tauri-apps/api = "^2"`,
    `vite = "^5"`, `typescript = "^5"`, `vitest = "^1"`,
    `@testing-library/react = "^14"`, `@testing-library/jest-dom = "^6"`,
    `@testing-library/user-event = "^14"`, `jsdom = "^24"`, `tailwindcss = "^3"`
- **Storage**: SQLite 3 via `rusqlite` (bundled, no system dep); file at
  `~/Library/Application Support/com.huyikai.solo-task/tasks.db` (macOS) /
  `%APPDATA%\com.huyikai.solo-task\tasks.db` (Windows), via `dirs` crate
- **Testing**:
  - Rust: `cargo test` (unit + integration); `rusqlite` integration tests use
    `tempfile` crate for real DB files
  - Frontend: `vitest` + `@testing-library/react` (jsdom env); component tests
    colocated as `*.test.tsx` next to source
- **Target Platform**: macOS 11+ (primary, Apple Silicon dev box), Windows 10+
  (secondary, via CI runner)
- **Project Type**: desktop-app (Tauri shell + WebView + React UI + Rust backend)
- **Performance Goals**: cold start < 2 s, installer < 50 MB, view-tab switch
  < 100 ms, 1,000-task scroll @ 60 fps (last three are placeholder for
  follow-up specs)
- **Constraints**: < 50 MB installer; zero network calls except explicit manual
  check-for-update; panic-safe writes via SQLite transaction; TDD red→green
  enforced by hook + CI
- **Scale/Scope**: foundation slice only — no real CRUD, no reminders, no
  gantt logic. Roughly: ~10 Rust files, ~15 TS/TSX files, 1 CI workflow,
  1 pre-push hook script.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Local-First Privacy | ✅ PASS | Only outbound call is the explicit manual check-for-update (S2 stub; real logic in follow-up spec). No telemetry. |
| II. Offline by Default | ✅ PASS | No auth, no sync. `check-for-update` button is stub. |
| III. No Feature Creep | ✅ PASS | Spec explicitly excludes CRUD, reminders, gantt logic. Foundation only. |
| IV. Tauri + React + SQLite — Locked Stack | ✅ PASS | Stack chosen here matches constitution verbatim. `rusqlite` + bundled feature (no system SQLite dep). |
| V. Rust Owns the System, React Owns the UI | ✅ PASS | All SQLite, file path, integrity check, JSON export, IPC commands live in Rust. React only renders + dispatches typed commands. |
| VI. Test-First Development (TDD) | ✅ PASS | Implementation order in tasks.md (next phase) will be: failing test commit → production commit per feature scope. Pre-push hook enforces this. CI enforces it authoritatively. |
| VII. Failure & Recovery | ✅ PASS | (1) DB integrity_check on startup, corrupted → CorruptedView + export button; (2) notification permission is out of scope here (no reminders yet); (3) typed `AppError` enum serialized across IPC, frontend renders by variant; (4) initial migration wrapped in transaction (future writes will follow same pattern). |
| VIII. Data Escape Hatch — JSON Export | ✅ PASS (stub) | `export_json` IPC command writes placeholder `ExportPayload` JSON with `warnings: ["database_corrupted"]`. Real data shape in follow-up spec. |
| IX. Design Quality | ✅ PASS | Button / Card / Layout components go through `design-taste-frontend` skill before commit. Review summary required in commit body. |
| Quality Gates (pre-push) | ✅ PASS | Hook script provided; CI workflow runs `cargo check`, `cargo test`, `tsc --noEmit`, `npm test` on macOS + Windows. |

No violations. Proceeding to Phase 0 research is unnecessary — all technical
choices above come from Constitution v1.3.0 or are unambiguous defaults.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file
├── data-model.md        # Phase 1 output — DB schema, AppError, ExportPayload, I18nKey
├── contracts/
│   └── ipc.md           # Phase 1 output — IPC command signatures
├── quickstart.md        # Phase 1 output — validation scenarios
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Single-crate layout (Constitution Principle IV forbids multi-crate monorepos
for this project; Tauri is the desktop shell, Rust crate is the backend,
React is the frontend under `src/`):

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml                       # macOS + Windows runner CI
├── .githooks/
│   └── pre-push                         # TDD scope/commit-order enforcement
│       └── README.md                    # how to enable (`git config core.hooksPath`)
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs                      # Tauri entry, register commands, startup integrity check
│       ├── lib.rs                       # re-export of run() for mobile compat (Tauri 2 convention)
│       ├── db/
│       │   ├── mod.rs                   # connect(), integrity_check(), migrations runner
│       │   ├── migrations.rs            # initial migration (5 empty tables + migrations meta)
│       │   └── tests.rs                 # integration tests against temp-file SQLite
│       ├── error.rs                     # AppError enum + serde + thiserror + Result<T> alias
│       ├── commands/
│       │   ├── mod.rs                   # command registry
│       │   ├── health_check.rs          # S1 startup hook → returns Corrupted | Ok
│       │   ├── export_json.rs           # S3 corruption recovery export (stub payload)
│       │   └── trigger_test_error.rs    # S4 verification helper
│       └── paths.rs                     # resolve db path via `dirs` crate, platform-correct
├── src/                                 # React frontend (Vite root)
│   ├── App.tsx                          # top-level + view-switch state machine
│   ├── main.tsx                         # Vite entry
│   ├── views/
│   │   ├── ListView.tsx                 # placeholder
│   │   ├── BoardView.tsx                # placeholder
│   │   ├── GanttView.tsx                # placeholder
│   │   ├── CorruptedView.tsx            # S3 — corruption notice + export button
│   │   └── Settings.tsx                 # S2 — two stub buttons + confirm dialog
│   ├── components/
│   │   ├── Button.tsx                   # design-token Button
│   │   ├── Card.tsx                     # design-token Card
│   │   ├── Layout.tsx                   # App shell (top bar + active view)
│   │   ├── ConfirmDialog.tsx            # S2 — typed-name confirmation
│   │   └── ViewTabs.tsx                 # S1 — list/board/gantt switcher
│   ├── i18n/
│   │   ├── t.ts                         # lookup function + missing-key fallback + dev warning
│   │   └── zh-CN.ts                     # dictionary (keys consumed by all visible strings)
│   ├── api/
│   │   └── ipc.ts                       # typed Tauri command wrappers + AppError → i18n-key mapping
│   ├── styles/
│   │   └── tokens.css                   # design tokens (color, spacing, type) from design review
│   ├── __tests__/
│   │   ├── App.test.tsx                 # S1 — view switching
│   │   ├── CorruptedView.test.tsx       # S3 — shows export button
│   │   ├── Settings.test.tsx            # S2 — confirm dialog requires typed name
│   │   ├── IpcErrorRender.test.tsx      # S4 — AppError variant → correct i18n key
│   │   └── i18n.test.ts                 # S5 — missing-key behavior + warning
│   └── test/
│       └── setup.ts                     # vitest setup (jsdom, @testing-library/jest-dom)
├── index.html                           # Vite entry HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.cjs
└── .gitignore
```

**Structure Decision**: Single Tauri crate + colocated React source under `src/`.
Rejected monorepo (`apps/web` + `apps/api`) because the project has exactly
one Rust backend and one web frontend that always deploy together (Principle
IV + V). Rejected `src-tauri/src/frontend/`-style nested layout because
Tauri 2.x convention puts frontend at repo root and Rust under `src-tauri/`.

---

## Data Model

详见 [`data-model.md`](data-model.md)。摘要：

- **AppDatabase** — SQLite file, initial migration creates 6 tables
  (`tasks`, `subtasks`, `tags`, `task_tags`, `reminders`, `migrations`),
  all empty at foundation stage
- **AppError** — `enum { DbLocked, DbCorrupted, TaskNotFound,
  PermissionDenied, IoError, Unknown }` with `thiserror` impl + serde
  rename-all = "snake_case" for IPC
- **ExportPayload** — JSON shape: `{ schema_version: 1, exported_at:
  ISO8601, tasks: [], subtasks: [], tags: [], reminders: [], warnings: [] }`
- **I18nKey** — string union covering foundation keys:
  `app.title`, `views.list/board/gantt`, `settings.title`,
  `settings.check_for_update`, `settings.clear_data`,
  `settings.confirm_clear_placeholder`, `corrupted.title`,
  `corrupted.message`, `corrupted.export`, `error.db_locked`,
  `error.db_corrupted`, `error.permission_denied`, `error.unknown`

---

## IPC Contracts

详见 [`contracts/ipc.md`](contracts/ipc.md)。命令清单：

| Command | Args | Returns | Used by |
|---|---|---|---|
| `health_check` | — | `Result<HealthStatus, AppError>` where `HealthStatus = { ok: true }` | `App.tsx` startup |
| `export_json` | `path: String` | `Result<ExportSummary, AppError>` | `CorruptedView.tsx` S3 |
| `trigger_test_error` | `variant: String` | `Result<(), AppError>` | `Settings.tsx` S4 debug button |

All commands return `Result<T, AppError>` serialized as
`{ Ok: <T> } | { Err: <AppError variant string> }` per Tauri's IPC convention.
Frontend wrapper at `src/api/ipc.ts` parses this and surfaces a typed error
to React.

---

## Quickstart (Validation)

详见 [`quickstart.md`](quickstart.md)。本地验证骨架的 6 步：

1. `npm install` + `cd src-tauri && cargo fetch`
2. `npm run tauri dev` → 应用启动,主窗口显示三视图骨架
3. 切视图 tab → 状态正确切换
4. 打开 Settings → 看到两个 stub 按钮 + 二次确认
5. 触发"测试错误"按钮 → UI 显示对应 i18n 错误提示
6. 手动破坏 DB（写入非 SQLite 字节）→ 重启 → CorruptedView + 导出按钮

CI 验证：在 PR 中推送任意 commit → GitHub Actions mac+win runner 全绿。

---

## Implementation Strategy

TDD ordering (each scope = one Conventional Commits scope tag, e.g.
`feat(db):`, `feat(error):`, `feat(commands):`, `feat(settings):`,
`feat(corrupted):`, `feat(i18n):`, `feat(ci):`, `feat(hook):`,
`feat(styles):`):

For each scope:
1. **Red commit** — failing test only, no production code
2. **Green commit** — minimum production code that passes
3. **Refactor commit** — clean up (optional, may skip for trivial code)

UI scopes additionally require:
4. Run `design-taste-frontend` skill against the rendered component
5. Include review summary in commit body

Pre-push hook verifies: any commit whose scope matches a `feat.*` or
`fix.*` pattern and which modifies non-test source MUST have an earlier
commit in the same push (same scope) that modified a test file.

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. Table intentionally empty.

---

## Open Questions Deferred to `/speckit-tasks`

These will be resolved when tasks.md is generated (next phase); not blocking
the plan:

- **Q1**: Should `pre-push` hook also block force-pushes to `main` (currently
  allowed by `trunk-based` workflow)? — Default: allow force-push if the
  branch is `main` and CI is required (no force-push even by self).
- **Q2**: When `health_check` returns `DbCorrupted`, does React also disable
  the navigation tabs (forcing user to either export or clear)? — Default:
  yes, all tabs disabled, only CorruptedView + Settings reachable.
- **Q3**: For `trigger_test_error`, should the Settings page have a
  "developer mode" toggle to hide this button in release builds? — Default:
  yes, gate behind `import.meta.env.DEV` (Vite's dev-mode flag).

---

## Next Steps

1. **Phase 2**: Run `/speckit-tasks` to generate `tasks.md` with ordered,
   dependency-aware task list (TDD ordering baked in).
2. **Phase 3**: Run `/speckit-implement` to execute task-by-task, with the
   pre-push hook and CI gating each push.
