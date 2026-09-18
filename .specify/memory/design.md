# Solo Task Design System

**Constitution Reference**: Principles IX-XI (Design Quality, Design System
Continuity, Governance Layer Promotion, v1.7.0)
**Skill invocation**: `/design-taste-frontend`
**Last Amended**: 2026-09-18

This document is the **single source of truth** for visual design in Solo
Task. It is project-level (not feature-level): every UI spec MUST
reference these tokens, anti-patterns, component primitives, and review
standards. Reusable component patterns live here under Section 6 and MUST
not be redefined in individual specs.

Feature-specific design is only allowed when a feature has a justified,
non-reusable deviation under Constitution Principle X. In the normal case,
there is no `specs/<feature>/design.md`.

---

## 0. Design Read

**Reading this as**: 个人本地桌面待办工具应用骨架 (Tauri 2 + React + Tailwind), 给单人开发者每天使用, 用 Things 3 / Cron 那种克制低调的本地 app 语言, 倾向 Tailwind utilities + 系统字体 + 极简 motion。

**Dials** (single global reading; per-feature docs may note deviations):

| Dial | Value | Reason |
|---|---|---|
| **DESIGN_VARIANCE** | 5 (Predictable+) | 个人工具不需要 asymmetry / 艺术版式。5 是 "predictable 但不 rigid" |
| **MOTION_INTENSITY** | 3 (Static) | 待办工具是 daily-use, motion 多 = 烦。CSS `:hover` + `:active` 足矣 |
| **VISUAL_DENSITY** | 3 (Art Gallery) | MVP 阶段内容稀疏, 大量空白帮助聚焦。后续 CRUD 接入后密度会自然上升 |

**System choice**: shadcn/ui + Radix primitives (source-in-repo under
`src/components/ui/`) is the preferred component foundation. New
reusable primitives MUST use the shadcn source pattern first. Do not
mix another component library. Small feature-specific wrappers may
remain native React when no shadcn primitive exists.

**Theme lock**: **默认跟随系统** (`prefers-color-scheme: dark` / `light`), 但 Settings 提供手动覆盖 (3 选项: 跟随系统 / 亮色 / 暗色)。用户选择持久化到 DB (`user_preferences` 表), 跨重启保留。

---

## 1. Design Tokens

### 1.1 Color Palette (Light + Dark)

使用 off-white / off-black, **永不**纯 `#000000` / `#FFFFFF`。所有 hex 都接近 Tailwind 的 zinc 系, 偏冷, 适合长时间盯屏。

#### Light Theme

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FAFAFA` | 应用背景 (zinc-50) |
| `--surface` | `#FFFFFF` | 卡片表面 (zinc-0) |
| `--surface-elevated` | `#FFFFFF` | 浮层、模态 |
| `--text-primary` | `#18181B` | 主文本 (zinc-900) |
| `--text-muted` | `#71717A` | 次要文本 (zinc-500) |
| `--text-subtle` | `#A1A1AA` | 提示、占位 (zinc-400) |
| `--border` | `#E4E4E7` | 1px 边框 (zinc-200) |
| `--border-strong` | `#D4D4D8` | 强调边框 (zinc-300) |
| `--accent` | `#2563EB` | 主操作 (blue-600), **仅一个**, 不发光 |
| `--accent-hover` | `#1D4ED8` | (blue-700) |
| `--error` | `#DC2626` | (red-600) |
| `--success` | `#16A34A` | (green-600) |
| `--warning` | `#D97706` | (amber-600) |

#### Dark Theme

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#09090B` | 应用背景 (zinc-950) |
| `--surface` | `#18181B` | 卡片表面 (zinc-900) |
| `--surface-elevated` | `#27272A` | 浮层、模态 (zinc-800) |
| `--text-primary` | `#FAFAFA` | (zinc-50) |
| `--text-muted` | `#A1A1AA` | (zinc-400) |
| `--text-subtle` | `#71717A` | (zinc-500) |
| `--border` | `#27272A` | (zinc-800) |
| `--border-strong` | `#3F3F46` | (zinc-700) |
| `--accent` | `#3B82F6` | (blue-500), dark 下稍亮 |
| `--accent-hover` | `#60A5FA` | (blue-400) |
| `--error` | `#EF4444` | (red-500) |
| `--success` | `#22C55E` | (green-500) |
| `--warning` | `#F59E0B` | (amber-500) |

**饱和度约束**: 所有 accent / state 色 saturation < 80%。`--accent` 在 light 下用 `blue-600` 而非 `blue-500`, 避免过于明亮。

### 1.2 Spacing Scale

8px 网格。Tailwind 默认即可, 不重新定义。

| Token | px | Tailwind class |
|---|---|---|
| space-1 | 4 | `p-1`, `gap-1` |
| space-2 | 8 | `p-2`, `gap-2` |
| space-3 | 12 | `p-3`, `gap-3` |
| space-4 | 16 | `p-4`, `gap-4` |
| space-6 | 24 | `p-6`, `gap-6` |
| space-8 | 32 | `p-8`, `gap-8` |
| space-12 | 48 | `p-12`, `gap-12` |
| space-16 | 64 | `p-16`, `gap-16` |

常用组合:
- 卡片内边距: `p-4` (16px)
- 区块间距: `gap-6` (24px)
- 大区块: `py-12` (48px)
- 顶栏高度: `h-14` (56px)

### 1.3 Typography Scale

中文优先, 英文次之。**不**用 Inter (Skill Section 9.A: AVOID Inter as default)。用系统字体栈 + 思源黑体 / 系统中文。

| Token | px | Usage |
|---|---|---|
| text-xs | 12 | 提示、tag、metadata |
| text-sm | 14 | 次要正文、按钮 |
| text-base | 16 | 正文 (默认) |
| text-lg | 18 | 强调正文 |
| text-xl | 20 | 小标题 |
| text-2xl | 24 | 页面标题 |
| text-3xl | 30 | 主标题 (Settings / CorruptedView) |

**字重**:

| Weight | Value | Usage |
|---|---|---|
| regular | 400 | 正文 |
| medium | 500 | 强调、按钮、tab 选中 |
| semibold | 600 | 标题 |

**行高**:

| Context | leading | Tailwind |
|---|---|---|
| 正文 | 1.6 | `leading-relaxed` |
| 标题 | 1.25 | `leading-tight` |
| 紧凑 (tab / button) | 1.0 | `leading-none` |

**字体族**:

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
             "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", sans-serif;
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
             "Liberation Mono", monospace;
```

- 中文 → 系统默认中文 (PingFang SC / 苹方 on macOS, Microsoft YaHei / 微软雅黑 on Windows)
- 英文 / 数字 → 系统 sans (San Francisco on macOS, Segoe UI on Windows)
- mono → 用于错误码、版本号、`AppError` variant 名

### 1.4 Border Radius

**统一 radius 系统**: 中等柔和, 不极端不极方。**全部** = `8px`, 唯一的例外:

| Token | px | Usage |
|---|---|---|
| radius-sm | 4 | tag / pill / 内嵌小元素 |
| radius-md | 8 | button, card, input (默认) |
| radius-lg | 12 | modal, dialog, 大卡片 |
| radius-full | 9999 | 头像, 状态点 |

Shape Consistency Lock (Skill 4.4): 按钮 = 卡片 = 输入框 = 8px, 不混用。

### 1.5 Shadow / Elevation

**阴影颜色调性跟随背景** (Skill 4.4)。zinc 系冷调, **不**用纯黑阴影。

| Token | Definition | Usage |
|---|---|---|
| shadow-sm | `0 1px 2px rgba(24,24,27,0.04)` | 卡片默认 |
| shadow-md | `0 2px 8px rgba(24,24,27,0.06), 0 1px 2px rgba(24,24,27,0.04)` | 浮起 (hover, dropdown) |
| shadow-lg | `0 8px 24px rgba(24,24,27,0.08), 0 2px 4px rgba(24,24,27,0.04)` | 模态 |

dark 模式下 shadow 透明度减半 (`rgba(0,0,0,0.4)`), 不然会显得"贴不上"深色背景。

### 1.6 Motion

**默认无 motion**。允许:

- `transition-colors duration-150` (hover/focus 颜色过渡)
- `transition-transform duration-150` (按钮按下)
- 按钮 `:active` 时 `scale-[0.98]`
- 不允许: ScrollTrigger、parallax、无限循环动画、marquee、骨架闪烁

### 1.7 Z-Index Scale

| Layer | z-index | Usage |
|---|---|---|
| base | 0 | 默认 |
| raised | 10 | 浮起的 dropdown, tooltip |
| sticky | 20 | 顶栏 |
| modal | 50 | 模态对话框 |
| toast | 60 | 错误提示 |

### 1.8 Semantic token strategy (shadcn-first)

All new UI MUST use shadcn semantic tokens first. The canonical names
are:

| shadcn token | Light | Dark | Meaning |
|---|---|---|---|
| `background` | `#FAFAFA` | `#09090B` | App background |
| `foreground` | `#18181B` | `#FAFAFA` | Primary text |
| `card` | `#FFFFFF` | `#18181B` | Card surface |
| `popover` | `#FFFFFF` | `#27272A` | Elevated surface |
| `primary` | `#2563EB` | `#3B82F6` | Primary action |
| `secondary` | `#F4F4F5` | `#27272A` | Secondary surface |
| `muted` | `#F4F4F5` | `#27272A` | Muted container, including TabsList |
| `muted-foreground` | `#71717A` | `#A1A1AA` | Muted text |
| `accent` | `#F4F4F5` | `#27272A` | Hover / selected neutral surface |
| `destructive` | `#DC2626` | `#EF4444` | Destructive action |
| `border` / `input` | `#E4E4E7` | `#27272A` | Borders and inputs |
| `ring` | `#2563EB` | `#3B82F6` | Focus ring |

These variables are defined in `src/styles/main.css` and mapped in
`tailwind.config.ts`. Existing project aliases (`bg`, `surface`,
`text-primary`, etc.) remain only for compatibility; new components MUST
prefer `bg-background`, `text-foreground`, `bg-card`, `bg-muted`,
`text-muted-foreground`, `border-border`, and `ring-ring`.

The default shadcn theme switching model is CSS variables + a `dark`
class or system media query. This project uses `data-theme="light|dark"`
for the persisted Settings override and removes the attribute for
`system` mode. Theme controls belong in Settings and use the shadcn
Radio Group / Toggle Group pattern when a matching primitive exists.

---

## 2. Anti-Pattern Checklist (Pre-flight Review)

所有 UI spec MUST 在 commit body 引用本清单, 逐条 ✅。**任何一条 ❌ = 不允许 commit**。

### Visual / CSS

1. ❌ 无 pure-black 背景 (`#000000`, `bg-black`) → 应用 `--bg`
2. ❌ 无 pure-white 背景 (`#FFFFFF`, `bg-white`) → 应用 `--surface`
3. ❌ 无 AI-purple / neon glow (gradient blue→purple, `shadow-[0_0_20px_blue]`)
4. ❌ 无 3-equal feature cards (任何 "三张相同卡片横排")
5. ❌ 无 emoji 作为 UI 元素 (✅, ❌, 🎉) → 用 icon library (lucide / phosphor)
6. ❌ 无 Inter as default font → 用系统字体栈 (Things 3 风)
7. ❌ 无 serif 作为默认字体 → 个人工具不用 serif
8. ❌ 无 oversaturated accent (如 `bg-blue-500` 配白字太刺眼) → 用 blue-600 / blue-500

### Layout / Spacing

9. ❌ 无 centered hero (避免大段文字+CTA 的居中布局)
10. ❌ 无 zigzag image+text 布局
11. ❌ 无 decorative dots (状态点除外)
12. ❌ 无 marquee / 横向滚动条 (Motion Intensity = 3)
13. ❌ 无 version labels in hero (`v0.1.0 BETA`)
14. ❌ 无 section-number eyebrows (`01 / INDEX`, `001 · DATA`)
15. ❌ 无 split-header pattern (左标题 + 右小段落) → 标题副标题垂直 stack

### Typography

16. ❌ 无 em-dash (`—`) 在任何文案 → 用句号或逗号
17. ❌ 无 oversized H1 (`text-6xl`) → 个人工具用 `text-2xl`
18. ❌ 无 emoji 在文案 (待办描述、按钮、提示)

### Content / Copy

19. ❌ 无 "AI 营销话术" ("Elevate", "Seamless", "Next-Gen", "Revolutionize") → 用具体动词 ("导出", "删除", "打开")
20. ❌ 无 fake-precise 数字 ("99.99% 完成率") → 不用或标 "(估算)"
21. ❌ 无 generic placeholder ("Lorem ipsum", "Task 1", "Item A") → 用 i18n key 实际翻译, 占位用真实文案
22. ❌ 无 "Quietly trusted by" / "From the field" 等 poetic label
23. ❌ 无 "Settings" 副标题中的 mock-humble ("我们尽力做到不打扰")

### Interaction

24. ❌ 无 infinite-loop animation (loading spinner 是 OK 的, marquee / shimmer / pulse 不允许)
25. ❌ 无 `window.addEventListener("scroll")` (Motion 静态, 不需要 scroll 监听)
26. ❌ 无 hover 触发的 layout shift (`width` 过渡 → 用 `transform`)
27. ❌ 无按钮文字换行 (CTAs must fit on one line at desktop)
28. ❌ 无 white-on-white / white-on-light CTA → accent 提供足够对比 (WCAG AA 4.5:1)

### Project-Specific

29. ❌ 无硬编码中文 在 `.tsx` 组件中 → 必须 `t('key')` 包装
30. ❌ 无 emoji 任务状态图标 (✅/⏳/❌) → 用 lucide 的 Circle/Clock/CheckCircle
31. ❌ 无 "Beta" / "Preview" / "v0.x" 角标 在 Settings 主标题 (允许在 About 版本号旁)
32. ❌ 无 theme toggle 在顶栏/hero 等显眼位置 → 仅在 Settings 内 (外观分组), 不做成太阳/月亮图标按钮
33. ❌ 无未持久化的 theme 选择 → 必须存 DB (`user_preferences` 表), 跨重启保留

---

## 3. Pre-Flight Pass Standard

**评审最后一步**: 对照第 2 节清单, 每条标记 ✅ / ❌。**任何一条 ❌ = 不通过, 必须修改后再评审**。

**每次评审的 commit body 格式**:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

`Pre-flight check: fail` = 不允许 commit, 必须回到 Pre-Flight 阶段修复。

**标准 review 触发点** (per-feature design.md 定义):
- 项目级: 每当推出新视觉组件类别时
- Feature 级: feature 的 design.md 顶部列出的 checkpoint

---

## 4. How a UI Spec References This Document

每个 `specs/<feature>/` UI spec MUST reference this file directly:

1. `plan.md` 声明: "no design deviation; inherits
   `.specify/memory/design.md` verbatim" (the default path).
2. `tasks.md` maps each UI checkpoint to Section 2 anti-patterns and
   Section 6 component primitives.
3. Feature-local `design.md` is forbidden by default. It exists only
   under the explicit deviation process in Constitution Principle X.
4. New reusable component patterns, tokens, or anti-pattern rules MUST
   be added to this global file through a design-amendment spec before
   their dependent feature ships.

This makes shadcn source components under `src/components/ui/` and this
file the shared UI contract for every future feature.

---

## 6. Established Component Library

Components introduced and visually defined by the foundation feature.
Any spec that uses these components MUST inherit these visual
descriptions (no redefinition per feature). A feature that introduces a
**new** component visual pattern MUST add it to this section via a
design-amendment spec.

### 6.1 Button (shadcn source-owned)

The preferred Button primitive is `src/components/ui/button.tsx`,
following the shadcn `cva` + `cn()` pattern. Public variants:

| Variant | Project mapping | Usage |
|---|---|---|
| `default` | `--accent` + white text | Primary action |
| `destructive` | `--error` + white text | Destructive action |
| `outline` | surface + border-strong | Secondary action |
| `secondary` | surface + border-strong | Secondary action alias |
| `ghost` | transparent, hover bg | Low emphasis |
| `link` | accent underline | Inline action |

Sizes: `default` (h-10), `sm` (h-8), `lg` (h-11), `icon` (h-10 w-10).
All variants inherit radius-md, focus-visible ring, disabled opacity,
and active scale feedback from the shadcn source pattern. New buttons
MUST use this primitive rather than hand-rolled `<button>` classes.

### 6.2 Card (shadcn source-owned)

The preferred Card primitive is `src/components/ui/card.tsx` with the
canonical compound API:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

Card / CardHeader / CardTitle / CardDescription / CardContent /
CardFooter are composed rather than a bespoke wrapper per feature.
Visual baseline: `--surface`, 1px `--border`, radius-md, shadow-sm,
`p-4` content rhythm. `hoverable` is an explicitly supported extension
that adds shadow-md on hover; do not add arbitrary card styling per page.

### 6.3 Layout + Frameless TitleBar

**Structure**: a transparent frameless TitleBar overlay plus a main
content area. The OS chrome is disabled (`decorations: false`) and
window controls are source-owned under `src/components/TitleBar.tsx`.

- TitleBar: fixed overlay at the window top, `h-9`, transparent, no
  visible background band; its traffic-light / Windows controls are
  `no-drag`, while the surrounding region is `data-tauri-drag-region`.
- Main content starts at the top of the window. No separate visible
  app header or sub-header band.
- Settings gear lives in the content area top-right when the views route
  is active; Settings itself has no gear.
- Settings route: a shadcn `Button` with `variant="ghost"` and a back
  arrow is rendered at the top-left of the Settings content, returning
  to the active view.
- Main content: `p-6` or `p-8`, `--bg`, max width unlimited.

### 6.4 Tabs (shadcn new-york-v4 source-owned)

The preferred Tabs primitive is `src/components/ui/tabs.tsx`, installed
from the default shadcn template (`pnpm dlx shadcn@latest add tabs`) and
backed by `radix-ui`. The public API is exactly:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

Foundation uses the default shadcn composition:

```text
Tabs
├── TabsList (default: muted background, rounded-lg, p-[3px], h-9)
│   ├── TabsTrigger (active: bg-surface + shadow-sm)
│   └── TabsTrigger
└── TabsContent
```

`TabsList variant="line"` remains available for screens that explicitly
need an underline indicator. Foundation's list/board/gantt tabs use the
default container variant and sit centered at the top of the main content,
not in a separate title bar. New tab groups MUST use this primitive.

### 6.5 CorruptedView

**Visual tone**: calm, NOT alarm. A corrupted DB is a state, not an error.

- Full-screen centered layout (Layout not shown)
- Top: single icon (warning triangle, `--warning` color, 32px)
- Title: `text-2xl semibold` "数据库损坏"
- Subtitle: `text-base muted`, max-width `prose` (65ch)
  - Content: explain situation + promise no deletion + guide to export
- Primary action: `Button variant="primary"` "导出为 JSON"
- Secondary action: `Button variant="ghost"` "进入设置" (allow user to manually clear data before exporting)
- Spacing: icon-to-title `gap-4`, title-to-subtitle `gap-2`, subtitle-to-buttons `gap-6`
- Page padding: `py-16`

**Forbidden**: red banner, exclamation marks, flashing, emoji.

### 6.6 Settings

**Visual tone**: dense but ordered, like macOS System Preferences.

- Displayed inside Layout (not full-screen)
- Page title: `text-2xl semibold` "设置"
- Grouped sections:
  - 外观 (Appearance)
    - 主题 (Theme): 3-option segmented control (跟随系统 / 亮色 / 暗色), current selection uses `--accent` border + text-medium
    - Current mode hint: text-sm muted, e.g. "跟随系统 (当前: 暗色)"
  - 数据 (Data)
    - 检查更新 (Button variant="secondary", click → loading 1s → show "已是最新")
    - 清除所有数据 (Button variant="danger", click → ConfirmDialog)
  - 关于 (About)
    - Version `v0.1.0` (text-sm muted, mono font)
- Group spacing: `gap-8`
- Inner spacing: `gap-3`
- Each action item: `flex justify-between items-center`, label left, control right

**Segmented Control** (Theme selector sub-component):

- 3 buttons side-by-side, shared border-radius-md 8px (Shape Consistency Lock)
- Selected: `bg-bg` + `font-medium` + text-text-primary
- Unselected: bg-surface + text-text-muted, hover text-text-primary
- Size: height 36px (h-9), padding `px-3`, text-sm
- ARIA: `role="radiogroup"`, each `role="radio"`, selected `aria-checked="true"`

**No accent border, no inset box-shadow.** Selected state is conveyed
only by background tint + medium weight. Consistent with ViewTabs
selection pattern above.

**ConfirmDialog** (sub-component):

- Modal overlay: `--bg` 50% transparent
- Centered card: 480px wide, padding `p-6`, radius `lg` (12px), shadow `lg`
- Title: `text-xl semibold` "确认清除所有数据?"
- Content: text-base muted, explain "此操作不可撤销, 输入 DELETE 确认"
- Input: Input component, placeholder "DELETE"
- Button group: `flex justify-end gap-2`
  - 取消 (secondary)
  - 确认清除 (danger), disabled until input === 'DELETE'

---

### 6.7 Task List (introduced by spec 003-task-crud)

**Visual tone**: calm working list, no decorative chrome. Composed
entirely of established primitives (Button, Input, Dialog, tokens);
no new colors or radii were introduced.

**TaskList container**: vertical stack `flex flex-col gap-2`. No card
wrapping the list — rows are the surface.

**TaskRow**: full-width, `h-12`, radius-md, `--surface` background,
1px `--border`, `px-3`, `gap-3`; hover `--muted` transition 150ms.
Content left-to-right:

- Status badge: pill button, radius-full, `text-xs font-medium`,
  colored by state (text + border only, no fill):
  - todo → `--text-subtle` + `--border`
  - doing → `--warning`
  - done → `--success`
  - Click cycles todo→doing→done→todo; `title` hint from i18n.
- Title: `text-base text-text-primary`, single-line truncate.
- Priority label (only when != none): `text-xs`, `--muted` background
  chip, radius-sm, `--text-muted`. No per-priority colors.
- Due date (only when set): `text-xs text-text-muted`, prefixed by
  the localized 截止 label, `YYYY-MM-DD`.
- Actions: two `Button variant="ghost" size="sm"` (编辑 / 删除),
  no icons.

**Empty state**: centered `py-16`; `text-base text-text-muted` title
"还没有任务" + `text-sm text-text-subtle` hint. No illustration, no
call-to-action button duplicated in the empty body (the toolbar's
新建任务 button remains the single entry).

**TaskEditorDialog**: shadcn Dialog (`radius-lg`, `p-6`), title
`text-lg font-semibold`, fields as vertical `label` groups
(`gap-1.5`, label `text-sm font-medium`): Input (title, maxLength
200), textarea styled with the Input token set (description,
maxLength 5000), priority segmented radiogroup reusing the §6.6
pattern (`h-8` options, selected = `bg-bg` + `font-medium`), date
Input (`type="date"`). Footer: outline 取消 + primary 保存,
disabled while the trimmed title is empty.

**Delete confirmation**: ConfirmDialog with title interpolating the
truncated task name (20 chars) and NO typed confirmation input
(weaker destruction than the DB wipe; plan.md D7).

## 7. Amending This Document

Design system changes (token adjustment / new anti-pattern / dials
shift) are **MINOR amendment** (additive principle-like content) or
**PATCH** (correction/clarification), landed on `main` via a
`docs: amend design to vX.Y.Z` commit.

Any spec that finds the design system insufficient:
- MUST NOT modify this file in place
- Produces a "design-amendment" sub-spec via `/speckit-specify`, with
  plan.md referencing this file and tasks.md listing concrete changes
- Implement completes, then this file is amended
