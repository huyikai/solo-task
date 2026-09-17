<!-- Sync Impact Report
Version: 1.2.0 → 1.3.0
Bump rationale: MINOR — added Core Principle IX (Design Quality). No principle
removed or redefined. Existing principles unaffected.
Modified principles: none renamed.
Added sections:
- Core Principle IX. Design Quality (NON-NEGOTIABLE) — mandates use of the
  /design-taste-frontend skill for any UI work and requires an inline review
  summary on push.
Removed sections: none
Follow-up TODOs:
- The exact review-summary format and the skill-invocation pattern will be
  refined in the project-skeleton spec; this amendment locks the policy,
  not the tooling.
-->

# Solo Task Constitution

## Core Principles

### I. Local-First Privacy
All user data lives on the user's machine. The app MUST NOT initiate network
requests for user data. No telemetry, no analytics, no crash reporting, no
auto-update pings, no remote config.

The only outbound network call permitted is an explicit, user-initiated
**manual check-for-update**: when the user clicks the "Check for Update" button
in Settings, the app fetches a single `manifest.json` from the project's
website, compares the version field against the running build, and displays
the result. It MUST NOT download binaries, auto-install, or phone home in the
background. Link clicks that open in the user's default browser are out of
scope — those are OS-level, not app-level fetches.

SQLite database files live under the OS-standard per-user app data directory
and never leave it. Rationale: this is a personal tool; trust is the product.

### II. Offline by Default
The application MUST be fully functional with no network connectivity at any
time after install. No login, no account, no OAuth, no cloud sync, no "sign in
with...". Any feature that would require network access MUST be rejected at
design time. Rationale: the user's task list should not disappear when WiFi
drops, and zero-account means zero lock-in.

### III. No Feature Creep — MVP Discipline
Scope is the deliverable. The MVP feature set is: basic CRUD on tasks
(title, description, created, due, priority, status: todo/doing/done),
subtasks (parent/child), tags with filter, reminders (due + recurring),
three views (list / board / gantt), local stats (burndown), and **JSON
export** (see Principle VIII). Anything beyond this scope is OUT until the
MVP ships end-to-end. "Just one more thing" requests during MVP MUST be
deferred to a post-MVP backlog. Rationale: shipping beats polishing; a
small finished product is worth more than a large half-finished one.

**MVP Done Checklist** — v1.0 can only be tagged once ALL of the following
hold simultaneously:

| Group      | Item                                                                          |
|------------|-------------------------------------------------------------------------------|
| Function   | All 6 functional areas (CRUD, subtasks, tags, reminders, views, stats) pass    |
|            | TDD red→green→refactor with integration tests on each main path.              |
|            | JSON export works for the full dataset (tasks + subtasks + tags).             |
| Platform   | macOS end-to-end smoke passes: install, boot, create, remind, view-switch,    |
|            | export.                                                                       |
|            | Windows end-to-end smoke passes the same flow (via CI, see §Automation).      |
| Performance| Installer < 50 MB, cold start < 2 s, 1,000-task scroll @ 60 fps, main DB      |
|            | queries < 50 ms (measured per the relevant spec's Acceptance Criteria).       |
| Robustness | DB-corruption detection + JSON-export-from-damaged-DB tested.                 |
|            | Notification-permission-denied path tested.                                   |
|            | IPC error-mapping unit tests cover every command.                             |
| Docs       | README + download-page description present and accurate.                      |

### IV. Tauri + React + SQLite — Locked Stack
The desktop shell is Tauri (Rust core + system WebView). The UI is React +
TypeScript. The data store is SQLite accessed through Rust (via `rusqlite`
or `sqlx`). The frontend MUST NOT bundle Node/Electron/Chromium — Tauri
uses the OS WebView, which keeps the installer under ~50 MB. Switching to
Electron, adding a backend server, or replacing SQLite with a network
database are all forbidden without a constitution amendment. Rationale:
the stack is chosen for small binary, fast cold start, and a single
developer can hold it in their head.

### V. Architecture — Rust Owns the System, React Owns the UI
System capabilities (filesystem, SQLite, OS notifications, clipboard,
autostart, window management, native dialogs) live in the Rust backend.
The React layer is presentation-only: it renders state and dispatches typed
commands to Rust via Tauri IPC. There MUST be no business logic, persistence
call, or platform API call inside React components or hooks. Cross-cutting
state management MUST happen on the Rust side where it can be persisted and
tested headlessly. Rationale: keeps the UI thin, the data model testable,
and lets us swap or rewrite the UI without touching persistence.

### VI. Test-First Development — TDD (NON-NEGOTIABLE)
Every behavioral change MUST follow the red-green-refactor cycle:

1. **Red** — write a failing test (Rust unit/integration test, React
   component test, or end-to-end smoke) that names the new behavior or the
   bug being fixed. The test MUST fail for the right reason before any
   production code is touched.
2. **Green** — write the minimum production code that makes the failing
   test pass. No speculative features, no "while I'm here" refactors.
3. **Refactor** — with tests green, clean up duplication and naming, keeping
   the suite green at every step.

Scope rules:

- **Pure logic** (recurrence math, date arithmetic, status transitions,
  validation rules) — Rust unit tests, written first.
- **Persistence** (SQL queries, migrations, repository functions) — Rust
  integration tests against a real (in-memory or temp-file) SQLite database,
  written first.
- **UI behavior** (component state, user interactions, view rendering) —
  React Testing Library tests, written first. Snapshot tests alone are NOT
  acceptable for behavior.
- **Cross-cutting flows** (create-task-with-reminder, board-drag-status-
  change) — at least one end-to-end test per release; the spec MUST call
  out which flows need it.

Commit grouping:

- A single feature MAY span multiple commits, but they MUST share one
  Conventional-Commits scope (e.g. `feat(tasks):`, `fix(reminders):`).
- Within that scope, every commit that adds or modifies production code
  MUST be preceded (within the same push) by at least one commit in the
  same scope that adds or modifies tests and was, at the time of its
  creation, failing for the right reason.
- The implementer is responsible for confirming this locally (e.g. by
  checking out the test commit and running the suite red before writing
  the green commit).

Enforcement:

- **Local fast feedback**: a `pre-push` git hook inspects commits about to
  be pushed and rejects the push if any production-only scope is missing
  its test predecessor.
- **Authoritative gate**: GitHub Actions (see §Automation) runs the full
  test suite on both macOS and Windows runners for every push to `main`.
  A red suite blocks merge.

Required test outcomes for a `main` push:

- The test added in step 1 of TDD MUST appear in the same scope (and the
  same push) as the production code that makes it pass.
- A push that adds production code without a corresponding failing-then-
  passing test MUST be rejected, by hook or by CI, with the missing test
  requested as a precondition to merge.
- Mutation-style spot checks on critical paths (see §Mutation Testing) are
  encouraged at release boundaries but are not a per-push gate.

Documentation tests (doc-comments, README examples) and config-only
changes (see §TDD-Skipped Changes) are exempt from TDD, provided the diff
contains no behavioral code.

Rationale: this project has exactly one maintainer; without a discipline
that catches regressions before they leave the editor, every "small
change" carries the risk of silently breaking the user's data or
reminders. TDD is the cheap insurance.

### VII. Failure & Recovery (NON-NEGOTIABLE)
The app handles failure modes explicitly. The following are non-negotiable:

1. **DB corruption is detected, not silently recreated.** On startup, the
   app runs an integrity check (`PRAGMA integrity_check`) on the SQLite
   file. If it fails, the app MUST surface a visible error and offer a
   "Export recoverable data to JSON" action before any destructive repair.
   It MUST NOT auto-delete the broken file.
2. **Notification permission denial is visible, not silent.** When the
   OS denies notification permission, the app MUST show a non-dismissible
   banner on the relevant view (Reminders / Settings) explaining that
   reminders will not fire and how to re-enable them.
3. **IPC errors are structured, not stringified.** Every Rust command
   returns a typed `Result<T, AppError>` where `AppError` is an enum with
   stable variant names (e.g. `TaskNotFound`, `DbLocked`,
   `PermissionDenied`). The React side renders based on the variant; raw
   error strings are NEVER shown to the user.
4. **Writes are panic-safe.** All multi-step data writes (insert task +
   subtasks + reminders + tags) MUST run inside a SQLite transaction. On
   panic or error, the transaction rolls back; the DB MUST never be left
   in a half-written state.

Rationale: this app holds the user's only task list. Silent failure is
unacceptable; loud, recoverable failure is the baseline.

### VIII. Data Escape Hatch — JSON Export (MVP P0)
The app MUST provide a user-triggered JSON export of the entire dataset
(tasks, subtasks, tags, reminders). Export is local-only, writes to a
user-chosen path via a native save dialog, and is available at any time
from Settings. Import is intentionally deferred to post-MVP. Rationale:
the user must always be able to leave with their data, even if the app
breaks or they switch machines.

### IX. Design Quality (NON-NEGOTIABLE)
Any change that touches user-visible UI (new screen, new component,
visual restyle, layout rework, copy/typography change) MUST be reviewed
through the `design-taste-frontend` skill before the change lands on
`main`. The implementer invokes the skill, applies its feedback, and
records a short review summary in the push (commit body or PR
description) of the form:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

Skipping the skill, or landing UI work without the review summary, is
treated as a Quality Gate failure on par with a missing TDD test.
Pure logic, DB, IPC, build, or CI changes that have no user-visible
surface are exempt — but the moment a refactor touches a rendered
component, the rule re-engages.

Rationale: this is a personal tool the maintainer will look at every
day; "AI-default" or "templated" UI is exactly the kind of friction that
makes a daily-use tool feel disposable. A disciplined design pass keeps
the product feeling intentional.

## Technology Stack

- **Desktop shell**: Tauri 2.x (Rust 1.78+)
- **UI**: React 18 + TypeScript 5.x
- **Build tool**: Vite (default Tauri template)
- **State / data fetching**: React Query or equivalent for IPC cache;
  Zustand or Context for UI-local state — pick the lighter option per case
- **Styling**: Tailwind CSS or CSS modules — pick one and stay consistent
- **Data store**: SQLite 3, schema migrations managed by `rusqlite`
  migrations crate
- **DB file location**:
  - macOS: `~/Library/Application Support/com.huyikai.solo-task/tasks.db`
  - Windows: `%APPDATA%\com.huyikai.solo-task\tasks.db`
- **Packaging**: Tauri bundler → `.dmg` (macOS), `.msi` and `.exe`
  (Windows x64 + arm64)
- **Distribution**: project website only; no App Store, no Microsoft Store
- **Code signing**: NOT required at MVP. SmartScreen warnings on Windows
  and "cannot verify developer" on macOS are accepted as the cost of
  staying free. Signing is explicitly deferred to v2.0 and will require a
  new constitution amendment when re-evaluated.
- **Internationalization**: UI strings are written in Chinese (zh-CN) only
  for MVP, but every user-visible string MUST be wrapped in a `t('key')`
  call backed by a single hand-rolled lookup function. No i18n library is
  introduced. Adding English later is a dictionary-file change, not a
  refactor.

## Development Workflow

- **Repository**: `github.com/huyikai/solo-task`, default branch `main`
- **Branching**: trunk-based. Single developer, so feature branches only
  when a change is large enough to need >1 day of isolated work; small
  changes land directly on `main`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`,
  `refactor:`, etc.). The scope tag (e.g. `feat(tasks):`) is what the
  TDD-enforcement hook matches on. No force-pushes to `main`.
- **Spec-driven development**: every non-trivial feature follows the Spec
  Kit flow: `/speckit-specify` → (optional `/speckit-clarify`) →
  `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. Constitution
  is consulted before each `plan` step.
- **TDD-skipped changes** (exempt from Principle VI): pure config files
  (`*.toml`, `*.json`, `tsconfig.*`, `vite.config.*`, `tauri.conf.json`,
  `Cargo.toml`, static `index.html` shells, lockfile updates). The moment
  a file in any of these paths gains a function body, an SQL migration,
  an IPC handler, or any other executable behavior, it stops being
  exempt.
- **Quality gates** before any `main` push:
  - The failing test required by Principle VI has been written, observed
    failing, and made to pass in the same scope / push.
  - For any UI-touching change, the `design-taste-frontend` skill has
    been invoked and its review summary included per Principle IX.
  - `cargo check` + `cargo clippy -- -D warnings` clean on Rust side
  - `tsc --noEmit` clean on TypeScript side
  - `cargo test` and the React test runner both pass locally
  - GitHub Actions CI is green on both `macos-latest` and
    `windows-latest` runners
  - App boots and core flow works on the developer's macOS box
  - DB migration runs cleanly on existing DBs (no destructive schema
    changes)
- **Performance budgets** (measured on a 2020-era MacBook Air baseline):
  - Installer size: < 50 MB
  - Cold start to interactive UI: < 2 s
  - List view with 1,000 tasks: scroll at 60 fps
  - DB queries on the main UI path: < 50 ms
  - Measurement scripts and data live in each spec's Acceptance Criteria,
    not in the constitution.
- **Mutation testing** (limited scope, advisory gate): at release
  boundaries, run mutation checks on the critical paths — task-state
  transitions, reminder-scheduling loop, recurring-task expansion, DB
  migration code, IPC error mapping. Mutation findings are bugs-to-fix
  before tagging a release; they are NOT a per-push gate.
- **Targeted platforms for testing**:
  - Primary: macOS (Apple Silicon, the developer's machine)
  - Secondary: Windows 11 x64 (CI runner, no manual machine required)

## Dependency Upgrades

Upgrades are tiered by blast radius:

- **Security / CVE patches**: apply within one week of disclosure. Land
  behind a single commit (or minimal group) with whatever tests the bump
  requires, and reference the advisory ID in the commit body.
- **Minor / patch upgrades**: bundled into the start of the next MVP
  cycle. Bumps are listed in the cycle's opening `chore(deps):` commit.
- **Major upgrades** (e.g. Tauri 2 → 3, React 18 → 19): require an
  explicit "upgrade spec" first, produced via `/speckit-specify`. The
  spec MUST include: version delta, breaking-change inventory, risk
  assessment, and a migration path. Implementation follows the regular
  Spec Kit flow.

## Automation & CI

- **Default posture**: CI is enabled. A single GitHub Actions workflow
  (`.github/workflows/ci.yml`) runs on every push to `main` and every PR.
- **Runners**: `macos-latest` AND `windows-latest`, both required to
  pass. The macOS runner handles the full suite; the Windows runner
  handles build + the cross-platform test subset (path handling,
  notifications, IPC error mapping).
- **Local pre-push hook** (see Principle VI) is the fast-feedback
  companion to CI. Either failing blocks the push.
- Adding new CI providers (e.g. self-hosted, additional SaaS) requires a
  constitution amendment.

## Uninstall & Data Lifecycle

- Uninstalling the app via the OS uninstaller preserves the SQLite file at
  the platform-specific app data directory listed above. Reinstalling the
  same version brings the data back.
- A "Clear all data" entry in Settings performs a destructive wipe with a
  two-step confirmation (button + typed name match). After confirmation,
  the DB file is deleted and the app restarts into an empty state.
- No telemetry or "did you uninstall?" prompt is ever shown.

## Governance

This constitution supersedes all other practices, READMEs, and informal
conventions. Any change to a Core Principle, the Technology Stack, the
Architecture rule, the Automation & CI posture, or the Dependency
Upgrade tiers requires a constitution amendment:

1. Propose the change in a `docs: amend constitution to vX.Y.Z` commit on
   `main`.
2. Bump the version per semver:
   - **MAJOR** — drop or redefine any Core Principle
   - **MINOR** — add a new principle or materially expand existing
     guidance
   - **PATCH** — clarifications, typo fixes, non-semantic wording changes
3. If the amendment invalidates any existing `spec.md` / `plan.md` /
   `tasks.md`, the affected features MUST be re-planned before
   implementation resumes.
4. Every push to `main` is implicitly a claim of compliance with the
   current constitution. The implementer MUST verify and explicitly call
   out any deviation in the commit body.

**Version**: 1.3.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
