<!-- Sync Impact Report
Version: 1.0.0 (initial)
Bump rationale: Initial ratification — no prior version exists. MINOR/MAJOR/PATCH bumps apply only to amendments.
Modified principles: none (all principles are net-new)
Added sections:
- Core Principles (5 principles, see below)
- Technology Stack
- Development Workflow
- Governance
Removed sections: none
Follow-up TODOs: none (all placeholders filled; ratification date = today, 2026-09-17)
-->

# Solo Task Constitution

## Core Principles

### I. Local-First Privacy
All user data lives on the user's machine. The app MUST NOT initiate network requests for user
data. No telemetry, no analytics, no crash reporting, no auto-update pings, no remote config.
The only outbound network calls permitted are: (a) optional manual check-for-updates that the
user explicitly triggers, (b) fetching static assets from the project's own website when the
user clicks a link. SQLite database files live under the OS-standard per-user app data
directory and never leave it. Rationale: this is a personal tool; trust is the product.

### II. Offline by Default
The application MUST be fully functional with no network connectivity at any time after
install. No login, no account, no OAuth, no cloud sync, no "sign in with...". Any feature
that would require network access MUST be rejected at design time. Rationale: the user's
task list should not disappear when WiFi drops, and zero-account means zero lock-in.

### III. No Feature Creep — MVP Discipline
Scope is the deliverable. The MVP feature set is: basic CRUD on tasks (title, description,
created, due, priority, status: todo/doing/done), subtasks (parent/child), tags with filter,
reminders (due + recurring), three views (list / board / gantt), local stats (burndown).
Anything beyond this scope is OUT until the MVP ships end-to-end. "Just one more thing"
requests during MVP MUST be deferred to a post-MVP backlog. Rationale: shipping beats
polishing; a small finished product is worth more than a large half-finished one.

### IV. Tauri + React + SQLite — Locked Stack
The desktop shell is Tauri (Rust core + system WebView). The UI is React + TypeScript. The
data store is SQLite accessed through Rust (via `rusqlite` or `sqlx`). The frontend MUST
NOT bundle Node/Electron/Chromium — Tauri uses the OS WebView, which keeps the installer
under ~50 MB. Switching to Electron, adding a backend server, or replacing SQLite with a
network database are all forbidden without a constitution amendment. Rationale: the stack
is chosen for small binary, fast cold start, and a single developer can hold it in their
head.

### V. Architecture — Rust Owns the System, React Owns the UI
System capabilities (filesystem, SQLite, OS notifications, clipboard, autostart, window
management, native dialogs) live in the Rust backend. The React layer is presentation-only:
it renders state and dispatches typed commands to Rust via Tauri IPC. There MUST be no
business logic, persistence call, or platform API call inside React components or hooks.
Cross-cutting state management MUST happen on the Rust side where it can be persisted and
tested headlessly. Rationale: keeps the UI thin, the data model testable, and lets us swap
or rewrite the UI without touching persistence.

## Technology Stack

- **Desktop shell**: Tauri 2.x (Rust 1.78+)
- **UI**: React 18 + TypeScript 5.x
- **Build tool**: Vite (default Tauri template)
- **State / data fetching**: React Query or equivalent for IPC cache; Zustand or Context
  for UI-local state — pick the lighter option per case
- **Styling**: Tailwind CSS or CSS modules — pick one and stay consistent
- **Data store**: SQLite 3, schema migrations managed by `rusqlite` migrations crate
- **DB file location**:
  - macOS: `~/Library/Application Support/com.huyikai.solo-task/tasks.db`
  - Windows: `%APPDATA%\com.huyikai.solo-task\tasks.db`
- **Packaging**: Tauri bundler → `.dmg` (macOS), `.msi` and `.exe` (Windows x64 + arm64)
- **Distribution**: project website only; no App Store, no Microsoft Store
- **Code signing**: explicitly NOT required at MVP. SmartScreen warnings on Windows and
  "cannot verify developer" on macOS are accepted as the cost of staying free. A future
  amendment may add signing if/when the user opts to pay for certificates.

## Development Workflow

- **Repository**: `github.com/huyikai/solo-task`, default branch `main`
- **Branching**: trunk-based. Single developer, so feature branches only when a change is
  large enough to need >1 day of isolated work; small changes land directly on `main`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.).
  No force-pushes to `main`.
- **Spec-driven development**: every non-trivial feature follows the Spec Kit flow:
  `/speckit-specify` → (optional `/speckit-clarify`) → `/speckit-plan` → `/speckit-tasks`
  → `/speckit-implement`. Constitution is consulted before each `plan` step.
- **Quality gates** before any `main` push:
  - `cargo check` + `cargo clippy -- -D warnings` clean on Rust side
  - `tsc --noEmit` clean on TypeScript side
  - App boots and core flow works on the developer's macOS box
  - DB migration runs cleanly on existing DBs (no destructive schema changes)
- **Performance budgets** (measured on a 2020-era MacBook Air baseline):
  - Installer size: < 50 MB
  - Cold start to interactive UI: < 2 s
  - List view with 1,000 tasks: scroll at 60 fps
  - DB queries on the main UI path: < 50 ms
- **Testing**: Rust unit tests for domain logic and DB queries; React Testing Library for
  component behavior; one end-to-end smoke (Tauri WebDriver or manual) per release. Full
  coverage is NOT a goal — cover the hard parts (DB migrations, recurrence math, reminder
  scheduling), not the trivial ones.
- **Targeted platforms for testing**:
  - Primary: macOS (Apple Silicon, the developer's machine)
  - Secondary: Windows 11 x64 (manual smoke before any release; no CI runner yet)

## Governance

This constitution supersedes all other practices, READMEs, and informal conventions. Any
change to a Core Principle, the Technology Stack, or the Architecture rule requires a
constitution amendment:

1. Propose the change in a `docs: amend constitution to vX.Y.Z` commit on `main`.
2. Bump the version per semver:
   - **MAJOR** — drop or redefine any Core Principle
   - **MINOR** — add a new principle or materially expand existing guidance
   - **PATCH** — clarifications, typo fixes, non-semantic wording changes
3. If the amendment invalidates any existing `spec.md` / `plan.md` / `tasks.md`, the
   affected features MUST be re-planned before implementation resumes.
4. Every PR that lands on `main` is implicitly a claim of compliance with the current
   constitution. The implementer MUST verify and explicitly call out any deviation.

**Version**: 1.0.0 | **Ratified**: 2026-09-17 | **Last Amended**: 2026-09-17
