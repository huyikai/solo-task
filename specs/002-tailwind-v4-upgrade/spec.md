# Feature Specification: Tailwind v4 Upgrade

**Feature Branch**: `002-tailwind-v4-upgrade`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Tailwind v3 与 shadcn v4 语法不兼容，导致 Tabs 样式失效。升级到 Tailwind v4 使 shadcn 组件源码可以 1:1 使用。"

**Constitution Reference**: Constitution v1.8.0
- Principle IV: shadcn/ui is the preferred path for all new reusable UI
  primitives; `shadcn add` output MUST be usable without hand-adaptation.
- Principle VI: TDD (NON-NEGOTIABLE)
- Principle VII: Failure & Recovery
- Principle X: Design System Continuity (`.specify/memory/design.md`)
- Dependency Upgrades: "Major upgrades require an explicit upgrade spec"

---

## Problem Statement

The project uses Tailwind CSS v3.4.15. The shadcn/ui CLI (v4.21.0) now
generates component source using **Tailwind v4 syntax**, including:

- `data-horizontal:flex-col` (v4 variant syntax)
- `group-data-horizontal/tabs:h-8`
- `data-active:bg-background`
- `@import "tailwindcss"` / `@theme` CSS-first configuration
- oklch color tokens

Under Tailwind v3 these class names are **silently dropped**, producing no
CSS. Verified: the built stylesheet contains **zero** rules for
`data-horizontal:` or `group-data-horizontal/tabs:h-8`.

**Observed impact**: `TabsList` loses its `h-8` height and the `Tabs` root
loses `flex-col`, so the tab strip and its content panel collapse into an
unstyled layout. The tab active-state highlight is also lost.

**Why this must be fixed at the framework level**: Constitution
Principle IV now requires that new UI use shadcn source directly. With a
v3/v4 mismatch, every `shadcn add <component>` requires hand-adaptation,
which violates that principle and will keep breaking as shadcn evolves.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — shadcn source works unmodified (Priority: P1)

A developer runs `pnpm dlx shadcn@latest add <component>`. The generated
file under `src/components/ui/` compiles and renders correctly **without
any manual syntax translation**.

**Why this priority**: This is the entire point of the upgrade. Without
it, Principle IV ("shadcn-first") is not actually satisfiable.

**Independent Test**: Run `shadcn add tabs` into a scratch path, diff the
generated classes against the project's Tailwind build output, and
confirm every utility class used by the component produces a CSS rule.

**Acceptance Scenarios**:

1. **Given** a freshly generated shadcn component using v4 variant syntax,
   **When** the project builds, **Then** the produced CSS contains rules
   for every variant class the component uses.
2. **Given** the `Tabs` component as shipped by the shadcn CLI,
   **When** rendered, **Then** `TabsList` has a 32px height and the root
   stacks its list above its content.

---

### User Story 2 — Tabs visual regression is repaired (Priority: P1)

The tab strip renders exactly as shadcn's own docs show: a muted pill
container holding the triggers, with the active trigger lifted out by a
surface background and a soft shadow.

**Why this priority**: This is the user-visible defect that motivated the
upgrade. It is the acceptance test for the whole change.

**Independent Test**: Screenshot the Tabs row and compare against the
shadcn base-nova reference; confirm container, active fill, and shadow.

**Acceptance Scenarios**:

1. **Given** the app is running, **When** the list/board/gantt tabs render,
   **Then** the strip has a muted rounded container with the active tab
   visually raised.
2. **Given** the user clicks a different tab, **When** the state changes,
   **Then** the raised treatment moves to the newly active tab.

---

### User Story 3 — No visual regression elsewhere (Priority: P1)

Every existing screen keeps its design tokens and layout.

**Why this priority**: A framework swap that silently changes colors,
spacing, or radii across the app is worse than the bug being fixed.

**Independent Test**: Compare before/after screenshots of the main views,
Settings, and the corrupted-DB screen; confirm tokens, spacing, and
typography are unchanged.

**Acceptance Scenarios**:

1. **Given** the app renders any existing screen, **When** compared with
   the pre-upgrade build, **Then** colors, spacing, typography, radii, and
   shadows are unchanged.
2. **Given** the light/dark/system theme override, **When** the user
   switches theme in Settings, **Then** the token values still apply.

---

### Edge Cases

- **Build output parity**: The new stylesheet must still contain the
  project's token custom properties and every utility class actually used
  by the app. A silently smaller stylesheet is a failure, not a pass.
- **Content scanning**: Utility generation must still cover all `.tsx`
  files; a mis-scoped content configuration would drop classes only used
  in rarely-rendered components.
- **Third-party class sources**: Classes referenced from
  `class-variance-authority` variant maps (e.g. `bg-muted`,
  `data-active:bg-background`) must be detected, not just literal strings
  in JSX.
- **Rollback**: If the upgrade proves unworkable, the change must be
  revertible as a single unit without leaving mixed v3/v4 configuration.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST use Tailwind CSS v4 as its styling engine.
- **FR-002**: shadcn/ui component source generated by
  `shadcn@latest add <component>` MUST compile and render correctly
  without manual class-name translation.
- **FR-003**: The project's design tokens defined in
  `.specify/memory/design.md` (color, spacing, typography, radius, shadow)
  MUST remain the single source of truth and MUST NOT be replaced by
  shadcn's default palette.
- **FR-004**: Existing token names (`--bg`, `--surface`, `--text-primary`,
  and the shadcn semantic aliases `--background`, `--foreground`,
  `--muted`, `--primary`, `--ring`, etc.) MUST remain available to
  components.
- **FR-005**: The light / dark / follow-system theme override MUST keep
  working, including the persisted user preference.
- **FR-006**: All existing automated tests MUST pass unchanged in intent;
  test updates are permitted only where a framework-level attribute or
  callback signature changed.
- **FR-007**: The production build MUST complete successfully and its
  generated stylesheet MUST contain rules for every utility class used by
  shipped components.
- **FR-008**: The upgrade MUST be revertible as a single unit.

### Key Entities

- **Design tokens**: The custom properties in the global stylesheet that
  encode `.specify/memory/design.md`. Must survive the migration.
- **Component source**: Files under `src/components/ui/`, owned by the
  project, generated by the shadcn CLI.
- **Theme modes**: `system` (follows OS), `light`, `dark` — user-selected
  in Settings and persisted.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `shadcn add` output compiles with **zero** manual
  class-syntax edits — verified by diffing a freshly generated component
  against the project's version.
- **SC-002**: The built stylesheet contains at least one CSS rule for each
  of `data-horizontal` and `group-data-horizontal/tabs` (currently zero),
  proving v4 variant syntax is now processed.
- **SC-003**: The Tabs strip renders with the container, active fill, and
  shadow visible; confirmed by screenshot comparison against shadcn's
  reference.
- **SC-004**: All existing screens are visually unchanged apart from the
  repaired Tabs — confirmed by before/after screenshots.
- **SC-005**: The full existing test suite passes, with no reduction in
  assertion coverage.
- **SC-006**: The project builds successfully and the app runs on macOS
  with no console errors attributable to styling.

---

## Assumptions

- **A-001**: The user accepts that this is a framework-level change
  requiring configuration migration, as authorized by the Constitution's
  Dependency Upgrades policy for major upgrades.
- **A-002**: shadcn/ui will continue to target the current Tailwind major
  version, so aligning to v4 keeps future `shadcn add` calls working.
- **A-003**: The existing token values (not shadcn's defaults) remain the
  project's design language; the upgrade changes the engine, not the
  look.
- **A-004**: Vitest/Testing Library behavior is unaffected by the styling
  engine; only assertions that referenced framework-specific DOM
  attributes may need updating.
- **A-005**: PostCSS plugin wiring is part of this change's scope.
