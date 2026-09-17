# Solo Task Design System

**Constitution Reference**: Principle X (Design System Continuity, v1.5.0)
**Skill invocation**: `/design-taste-frontend`
**Last Amended**: 2026-09-17

This document is the **single source of truth** for visual design in Solo
Task. It is project-level (not feature-level): every UI spec MUST
reference these tokens, anti-patterns, and review standards. Per-feature
design decisions (e.g. "this spec's TaskModal has these visual props") live
in `specs/<feature>/design.md` and MUST NOT redefine these global values.

---

## 0. Design Read

**Reading this as**: 个人本地桌面待办工具应用骨架 (Tauri 2 + React + Tailwind), 给单人开发者每天使用, 用 Things 3 / Cron 那种克制低调的本地 app 语言, 倾向 Tailwind utilities + 系统字体 + 极简 motion。

**Dials** (single global reading; per-feature docs may note deviations):

| Dial | Value | Reason |
|---|---|---|
| **DESIGN_VARIANCE** | 5 (Predictable+) | 个人工具不需要 asymmetry / 艺术版式。5 是 "predictable 但不 rigid" |
| **MOTION_INTENSITY** | 3 (Static) | 待办工具是 daily-use, motion 多 = 烦。CSS `:hover` + `:active` 足矣 |
| **VISUAL_DENSITY** | 3 (Art Gallery) | MVP 阶段内容稀疏, 大量空白帮助聚焦。后续 CRUD 接入后密度会自然上升 |

**System choice**: 不引入 shadcn/ui / Radix Themes / 任何组件库 (避免默认态、避免二次定制)。用原生 Tailwind + 几个自建原子组件。理由: 一个人维护, 不需要 shadcn 那种 "你拥有代码" 的复杂度; 反正要全部定制, 直接写更短。

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

### 1.8 Tailwind Config 映射

```js
// tailwind.config.ts (摘要)
module.exports = {
  darkMode: 'media',  // 跟随系统
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-elevated': 'var(--surface-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
};
```

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

每个 `specs/<feature>/design.md` MUST:

1. **Section 0**: 重申 Design Read + Dials (引用本文件 Section 0, 注明本 feature 是否偏离)
2. **Section 1**: 引用本文件 Section 1 (tokens), 不重复
3. **Section 2**: 描述本 feature 特定的组件视觉骨架 (无 component 时此 section 为空)
4. **Section 3**: 引用本文件 Section 2 (anti-pattern), 可在本 feature 加 ≤ 5 条 feature-specific 项
5. **Section 4**: 列出本 feature 的 review checkpoint (D1, D2, ...) 和对应的待评审组件
6. **Section 5**: 任何本 feature 对全局 design system 的偏离建议, 需触发 constitution amendment

---

## 6. Established Component Library

Components introduced and visually defined by the foundation feature.
Any spec that uses these components MUST inherit these visual
descriptions (no redefinition per feature). A feature that introduces a
**new** component visual pattern MUST add it to this section via a
design-amendment spec.

### 6.1 Button

**Matrix**:

| Variant | Background | Border | Text | Hover | Active |
|---|---|---|---|---|---|
| primary | `--accent` | none | `#FFFFFF` | `--accent-hover` | `scale(0.98)` |
| secondary | `--surface` | `1px --border-strong` | `--text-primary` | bg `--bg` | `scale(0.98)` |
| ghost | transparent | none | `--text-primary` | bg `--bg` | `scale(0.98)` |
| danger | `--error` | none | `#FFFFFF` | darken 8% | `scale(0.98)` |

**Size**:

| Size | Height | Padding | Font |
|---|---|---|---|
| sm | 32px | `px-3` | text-sm |
| md | 40px | `px-4` | text-base |

**Radius**: 8px (Shape Consistency Lock per Section 1.4).
**Focus**: 2px outline `--accent`, offset 2px, WCAG 2.4.7 compliant.
**Disabled**: opacity 0.5, cursor not-allowed, no hover.
**Loading**: text replaced with same-size spinner (16px).

### 6.2 Card

- Background: `--surface`
- 1px border: `--border`
- Radius: 8px
- Padding: `p-4` (16px)
- Shadow: `shadow-sm` default, `shadow-md` on hover (toggleable)
- Internal layout: title (text-lg medium) + subtitle (text-sm muted, optional) + content (gap-3)

### 6.3 Layout (App Shell)

**Structure**: top bar + main content area. No sidebar. Three-column
top bar: `左 | 中 | 右` via CSS grid `grid-cols-[1fr_auto_1fr]`.

- Top bar:
  - Height: `h-14` (56px)
  - Horizontal padding: `px-6` (24px)
  - **Left slot** (`headerLeft`): app name "Solo Task" (text-base medium)
    in views route; on settings route, an inline "← {list}" back button
    styled as ghost (rounded-md, px-2 py-1, text-sm, hover bg-bg).
  - **Center slot** (`activeTab`): ViewTabs component in views route;
    empty in settings route.
  - **Right slot**: Settings gear icon button (secondary ghost, p-2,
    hover bg-bg + text-text-primary). Hidden in settings route.
  - Background: `--surface`, separated from main content by 1px `--border` bottom line
- Main content area:
  - Padding: `p-6` or `p-8`
  - Max width: unlimited (Mac window typically 1024+px, content fills)
  - Background: `--bg` (creates layer with surface)

### 6.4 ViewTabs

Lives inside the Layout top bar's center slot (NOT a separate row).

- Horizontal layout, three tabs: `列表` / `看板` / `甘特图`
- Tab shape: `rounded-md px-3 py-1.5 text-sm`
- Selected: `bg-bg` (slightly lighter than surrounding surface) +
  `font-medium` + text-text-primary
- Unselected: bg transparent + text-text-muted, hover `bg-bg` + text-text-primary
- Spacing: `gap-1` (tight, tabs sit together as a group)
- ARIA: `role="tablist"`, each tab `role="tab"`, selected `aria-selected="true"`

**No accent border / no underline.** Selected state is conveyed only
by background tint + medium weight. Avoids the AI-default "blue glow
on active tab" pattern (anti-pattern #3).

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
