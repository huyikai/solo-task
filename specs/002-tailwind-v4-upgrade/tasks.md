# Tasks: Tailwind v4 Upgrade

**Input**: `/specs/002-tailwind-v4-upgrade/` (spec.md, plan.md, baseline-v3.json)

**TDD posture**: This is a configuration/engine migration — exempt from
TDD per Constitution Principle VI's config-only carve-out. The one
behavioral change (repaired Tabs rendering) carries a rendering test.

**Gate**: `baseline-v3.json` is the acceptance oracle. Every step below
is verified against it, not merely "does it build".

---

## Phase 1: Baseline (done)

- [x] **T001** Capture computed-style baseline in light mode →
      `specs/002-tailwind-v4-upgrade/baseline-v3.json`
      (root, tabs root/list/content, active+inactive tab, 4 button
      variants, card, typography scale)
- [ ] **T002** Capture the same baseline in dark mode → append
      `baseline-v3-dark.json` *(optional; light is the primary gate)*

**Checkpoint**: Baseline exists and is committed. Without it, "no visual
regression" is unprovable.

---

## Phase 2: Engine swap

- [ ] **T003** Update `package.json`: `tailwindcss` `^3.4.15` → `^4`,
      add `@tailwindcss/postcss`, remove `autoprefixer` (built into v4)
- [ ] **T004** Update `postcss.config.mjs`: `tailwindcss` →
      `@tailwindcss/postcss`; drop the `autoprefixer` entry
- [ ] **T005** Run `pnpm install`; confirm the lockfile updates and no
      v3 packages remain resolved
- [ ] **T006** Verify PostCSS config is actually picked up (a wrong
      filename extension silently disables it)

**Checkpoint**: `pnpm exec vite build` no longer errors on Tailwind
resolution.

---

## Phase 3: CSS-first configuration

- [ ] **T007** Rewrite `src/styles/main.css` entry:
      `@tailwind base/components/utilities` → `@import "tailwindcss"`
- [ ] **T008** Port the project's token values (from
      `.specify/memory/design.md`) into a `@theme` block. **Do NOT adopt
      shadcn's default oklch palette** — the project's hex values are the
      source of truth (Constitution Principle X)
- [ ] **T009** Preserve the existing semantic token names:
      `--background`, `--foreground`, `--card`, `--popover`, `--primary`,
      `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
      `--input`, `--ring` (+ their `-foreground` pairs), plus the legacy
      aliases (`--bg`, `--surface`, `--text-primary`, …)
- [ ] **T010** Configure dark mode. v4 defaults to `prefers-color-scheme`;
      the project also needs the `[data-theme="light"|"dark"]` override
      used by Settings. Define a matching `@custom-variant dark`
- [ ] **T011** Delete `tailwind.config.ts` (or reduce it to a comment
      noting v4 is CSS-first) and confirm nothing imports it
- [ ] **T012** Verify content scanning covers every `.tsx` under `src/` —
      v4 auto-detects sources; explicitly confirm component files are
      included by checking a class that appears only in a rarely-rendered
      component produces CSS

**Checkpoint**: Light/dark/system theme switching still applies the
project's colors.

---

## Phase 4: Restore shadcn-native syntax

- [ ] **T013** Revert `src/components/ui/tabs.tsx` from the v3-compat
      form back to the shadcn-shipped v4 form
      (`data-horizontal:`, `group-data-horizontal/tabs:`, `data-active:`)
- [ ] **T014** Confirm `shadcn add tabs` output now compiles **verbatim**
      — diff the project file against the CLI output; expect no syntax
      translation
- [ ] **T015** Verify the built stylesheet contains rules for
      `data-horizontal`, `group-data-horizontal/tabs:h-8`, and
      `data-active:bg-background` *(these were exactly 0 under v3)*

**Checkpoint**: SC-001/SC-002 satisfied — shadcn source works unmodified.

---

## Phase 5: Behavioral verification

- [ ] **T016** Re-check the Tabs rendering in the browser: list height
      32px, root `flex-direction: column`, active tab lifted with
      `bg-background` + shadow, inactive tabs transparent
- [ ] **T017** Add/extend a test asserting the Tabs strip renders its
      three triggers and the active one carries the selected state
      (the one behavioral change in this migration)
- [ ] **T018** Exercise the Settings theme switcher in the running app —
      light → dark → system — and confirm tokens change correctly
- [ ] **T019** Exercise the corrupted-DB screen (rename the DB file to
      junk and relaunch) — confirm it is still styled, since it renders
      outside the normal Layout

**Checkpoint**: Every user-visible surface verified in the real app, not
just in unit tests.

---

## Phase 6: Visual parity gate

- [ ] **T020** Re-capture computed styles in light mode and diff against
      `baseline-v3.json`. Every entry must match; any drift is a blocker
- [ ] **T021** Compare the built stylesheet against the pre-upgrade one:
      no token value changed, no utility class silently dropped
- [ ] **T022** Audit `@apply` usage and layer order — v4 is layer-aware
      and order-sensitive

**Checkpoint**: Screens are pixel-equivalent to the baseline.

---

## Phase 7: Quality gate + land

- [ ] **T023** `pnpm exec tsc --noEmit` clean
- [ ] **T024** `pnpm test` — full suite green
- [ ] **T025** `pnpm check:i18n` — zero hardcoded strings
- [ ] **T026** `pnpm exec vite build` succeeds; inspect the bundle size
      delta for sanity
- [ ] **T027** `cargo check` (Rust side untouched, but the gate is
      whole-project)
- [ ] **T028** `design-taste-frontend` review of the styled surfaces;
      record the pre-flight summary
- [ ] **T029** Land as **one revertible commit** (the plan's stated
      rollback strategy)

**Checkpoint**: Upgrade complete and revertible.

---

## Dependencies & Execution Order

```text
Phase 1 (baseline)
    │
    ▼
Phase 2 (engine swap) ──► Phase 3 (CSS-first config)
                               │
                               ▼
                    Phase 4 (shadcn-native syntax)
                               │
                               ▼
                    Phase 5 (behavioral verification)
                               │
                               ▼
                    Phase 6 (visual parity)
                               │
                               ▼
                    Phase 7 (quality gate + land)
```

Phases 2–3 must land together — a half-migrated config produces a broken
build. Phases 4–6 are ordered: you cannot verify parity before the syntax
is restored.

---

## Risks Carried From plan.md

| # | Risk | Guard |
|---|---|---|
| R1 | Silent class loss from v4 auto source detection | T012 + T015 explicitly check a rarely-rendered class |
| R2 | Accidental adoption of shadcn's oklch palette | T008 forbids it; T020/T021 diff token values |
| R3 | Theme override (light/dark/system) breaks | T010 + T018 verify in the running app |
| R4 | v4 spacing/radius defaults shift subtly | T020 diff against baseline |
| R5 | Mixed v3/v4 config left behind | T011 deletes the v3 config; T029 lands as one commit |

---

## Notes

- **No feature work.** This migration must not add or change user-facing
  functionality. The only behavioral change is the repaired Tabs strip.
- **The v3-compat Tabs adaptation is temporary.** T013 removes it. If the
  upgrade is reverted, that adaptation must come back with it (it lives
  in the same commit's inverse).
- **Tailwind v4 is a major version.** Per the Constitution, this spec is
  the required upgrade spec; no separate amendment is needed.
