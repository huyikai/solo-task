# Implementation Plan: Tailwind v4 Upgrade

**Branch**: `002-tailwind-v4-upgrade` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-tailwind-v4-upgrade/spec.md`

---

## Summary

Migrate the styling engine from Tailwind v3.4.15 to v4.x so that shadcn/ui
component source (which now ships v4 variant syntax) works unmodified.
The project keeps its own design tokens from
`.specify/memory/design.md`; only the engine and its configuration format
change.

**Critical constraint**: this is a *visual no-op* upgrade. Every screen
must look identical before and after, except the Tabs strip, which is
currently broken and must be repaired by the upgrade.

---

## Technical Context

- **Language/Version**: TypeScript ^5.x, React 18, Vite 5
- **Current styling**: `tailwindcss@3.4.15` + `autoprefixer` +
  `postcss`, configured via `tailwind.config.ts` (JS config) and
  `postcss.config.mjs` (`tailwindcss` + `autoprefixer` plugins)
- **Target styling**: `tailwindcss@4.x` +
  `@tailwindcss/postcss`, configured CSS-first via `@import "tailwindcss"`
  and `@theme`
- **Token source**: `.specify/memory/design.md` — the project's own
  palette/typography/radius/shadow values. NOT shadcn's defaults.
- **Component source**: `src/components/ui/*` — shadcn-generated files
  already present (`button`, `card`, `confirm-dialog`, `error-toast`,
  `tabs`)
- **Testing**: `vitest` + `@testing-library/react` (jsdom). Styling-engine
  agnostic in principle, but `Tabs` assertions reference Base UI
  attributes and may need alignment.
- **Constraints**:
  - Visual output must be unchanged (token parity is the acceptance test)
  - Light/dark/system theme override must keep working
  - Revertible as a single unit
- **Scale/Scope**: ~6 config/stylesheet files, 5 component files,
  3 test files. No feature work.

---

## Constitution Check

*GATE: Must pass before proceeding.*

| Principle | Status | Notes |
|---|---|---|
| I. Local-First Privacy | ✅ PASS | No network surface added. Tailwind v4 is a build-time dependency. |
| II. Offline by Default | ✅ PASS | Unaffected. |
| III. No Feature Creep | ✅ PASS | Engine migration only; no new user-facing capability. |
| IV. Tauri + React + SQLite — Locked Stack | ✅ PASS | shadcn source-in-repo model preserved and *strengthened*: after this change `shadcn add` output works with zero adaptation. |
| V. Rust Owns the System, React Owns the UI | ✅ PASS | Styling only; no logic moves. |
| VI. TDD (NON-NEGOTIABLE) | ⚠️ CONDITIONAL | This is a config/engine migration. Per Principle VI's exemption list, pure config changes are TDD-skipped. **However** the repaired `Tabs` behavior is a behavioral change and MUST have a failing-then-passing test. |
| VII. Failure & Recovery | ✅ PASS | No persistence or error-path change. |
| VIII. Data Escape Hatch | ✅ PASS | Unaffected. |
| IX. Design Quality | ⚠️ REQUIRES REVIEW | Styling changes require `design-taste-frontend` review with a pre-flight summary before landing. |
| X. Design System Continuity | ✅ PASS (with care) | `.specify/memory/design.md` stays the token source. The migration must NOT import shadcn's default palette over the project's values. |
| XI. Governance Layer Promotion | ✅ PASS | Any reusable migration convention stays project-level. |
| Dependency Upgrades (major) | ✅ SATISFIED | This spec *is* the required upgrade spec: it documents the version delta, breaking-change inventory, risk, and migration path. |
| Quality Gates | ⚠️ PENDING | `tsc --noEmit`, `pnpm test`, `pnpm check:i18n`, `vite build`, `cargo check` must all pass post-migration. |

**Verdict**: No violations. Proceed.

---

## Breaking-Change Inventory (v3 → v4)

The concrete deltas that affect this codebase:

| Area | v3 | v4 | Action |
|---|---|---|---|
| CSS entry | `@tailwind base/components/utilities` | `@import "tailwindcss"` | Rewrite `src/styles/main.css` entry |
| Config | `tailwind.config.ts` (JS) | `@theme` block in CSS | Port token mapping into CSS |
| PostCSS | `tailwindcss` + `autoprefixer` | `@tailwindcss/postcss` | Update `postcss.config.mjs`; autoprefixer is built in |
| Variant syntax | `data-[orientation=horizontal]:` | `data-horizontal:` | Now supported natively — shadcn source works as-is |
| Group variant | `group-data-[orientation=horizontal]/tabs:` | `group-data-horizontal/tabs:` | Supported natively |
| State variant | `data-[state=active]:` | `data-active:` (when the attribute is `data-active`) | shadcn source already uses the v4 form |
| Content scanning | `content: [...]` in config | Automatic source detection | Verify all component files are scanned |
| Dark mode | `darkMode: 'media'` | `@custom-variant dark` | Map to the project's existing system/media behavior |
| `@apply` | Order-sensitive | Layer-aware | Audit any `@apply` usage |
| oklch tokens | n/a | shadcn default theme uses oklch | **Do NOT adopt** — keep project hex tokens per Principle X |

**Highest-risk item**: automatic source detection replacing the explicit
`content` globs. If a file is missed, its classes silently vanish — the
exact class of bug being fixed, inverted.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-tailwind-v4-upgrade/
├── spec.md          # Written
├── plan.md          # This file
└── tasks.md         # /speckit-tasks output
```

### Files touched

```text
src/styles/main.css              # v4 entry + @theme token definition
postcss.config.mjs               # @tailwindcss/postcss
tailwind.config.ts               # removed (or reduced to content hints)
package.json                     # tailwindcss ^4, + @tailwindcss/postcss
src/components/ui/tabs.tsx       # verify shadcn source builds unmodified
src/components/ThemeSwitcher.tsx # verify variant-class parity
src/__tests__/Tabs.test.tsx      # align assertions if attributes changed
```

---

## Implementation Approach

1. **Capture a visual baseline first.** Screenshot every screen (list,
   board, gantt, settings, corrupted-DB) before touching anything. Without
   a baseline, "no visual regression" is unverifiable.
2. **Upgrade and configure.** Swap the dependency, rewrite the CSS entry
   with `@theme`, update PostCSS.
3. **Port tokens, not the palette.** Define the project's own token values
   from `.specify/memory/design.md` inside `@theme`. Explicitly reject
   shadcn's default oklch theme.
4. **Verify shadcn source compiles unmodified.** Diff the generated
   `tabs.tsx` against the project's copy; if they differ, the project
   copy wins only for token naming, not for syntax.
5. **Repair the Tabs regression** — this is the one behavioral change and
   needs a test.
6. **Verify parity** by comparing screenshots and the built stylesheet
   against the baseline.
7. **Run the full quality gate** and land it as one revertible commit.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Silent class loss from automatic content detection | HIGH | Grep the built stylesheet for a sample of classes per component after each build |
| Accidental adoption of shadcn's default palette | HIGH | Tokens are re-declared explicitly from design.md; diff token values against the pre-upgrade stylesheet |
| Theme override (light/dark/system) breaks | MEDIUM | Test the Settings theme switcher in the running app, not just unit tests |
| v4 changes spacing/radius defaults subtly | MEDIUM | Screenshot diff against baseline |
| Rollback leaves mixed config | LOW | Land as a single commit; revert is `git revert` |

---

## Complexity Tracking

No constitution violations requiring justification.

---

## Next Steps

1. `/speckit-tasks` — break this into ordered tasks (including the
   baseline screenshot step and the Tabs regression test).
2. `/speckit-implement` — execute with the visual baseline as the gate.
