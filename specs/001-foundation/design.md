# Design Decisions: Solo Task Foundation

**Feature**: 001-foundation
**Date**: 2026-09-17
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Skill invocation**: `/design-taste-frontend`

---

## 0. Design Read

**Reading this as**: 个人本地桌面待办工具的应用骨架 (Tauri 2 + React + Tailwind), 给单人开发者每天使用, 用 Things 3 / Cron 那种克制低调的本地 app 语言, 倾向 Tailwind utilities + 系统字体 + 极简 motion。

**Dials**:

| Dial | Value | Reason |
|---|---|---|
| **DESIGN_VARIANCE** | 5 (Predictable+) | 个人工具不需要 asymmetry / 艺术版式。5 是 "predictable 但不 rigid" |
| **MOTION_INTENSITY** | 3 (Static) | 待办工具是 daily-use, motion 多 = 烦。CSS `:hover` + `:active` 足矣 |
| **VISUAL_DENSITY** | 3 (Art Gallery) | MVP 阶段内容稀疏, 大量空白帮助聚焦。后续 CRUD 接入后密度会自然上升 |

**System choice**: 不引入 shadcn/ui / Radix Themes / 任何组件库 (避免默认态、避免二次定制)。用原生 Tailwind + 几个自建原子组件。理由: 一个人维护, 不需要 shadcn 那种 "你拥有代码" 的复杂度; 反正要全部定制, 直接写更短。

**Theme lock**: **默认跟随系统** (`prefers-color-scheme: dark` / `light`), 但 Settings 提供手动覆盖。三个选项:
- **跟随系统** (default): 应用 CSS `dark:` variant 由系统决定
- **亮色**: 强制 light theme, 忽略系统
- **暗色**: 强制 dark theme, 忽略系统

用户选择持久化到 DB (`user_preferences` 表), 跨重启保留。MVP 阶段不在应用内做主题切换的快捷键 (避免 scope creep), 仅通过 Settings 切换。

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

## 2. Component Visual Skeletons

文字描述, 无 React 代码。

### 2.1 Button

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

**Radius**: 8px (Shape Consistency Lock)。
**Focus**: 2px outline `--accent`, offset 2px, 满足 WCAG 2.4.7。
**Disabled**: opacity 0.5, cursor not-allowed, 无 hover。
**Loading**: text 替换为同尺寸 spinner (16px)。

### 2.2 Card

- 背景: `--surface`
- 1px border: `--border`
- Radius: 8px
- Padding: `p-4` (16px)
- Shadow: `shadow-sm` (默认), `shadow-md` on hover (可关闭)
- 内部分区: 标题 (text-lg medium) + 副标题 (text-sm muted, 可选) + 内容 (gap-3)

### 2.3 Layout

**结构**: 顶栏 + 主内容区。无侧栏 (Settings 入口在顶栏右上角)。

- 顶栏:
  - 高度: `h-14` (56px)
  - 横向 padding: `px-6` (24px)
  - 左侧: 应用名 "Solo Task" (text-base medium, 永远可见)
  - 右侧: Settings 入口按钮 (icon, secondary ghost)
  - 背景: `--surface` 与主内容区分隔 (用 `--border` 1px 下边线)
- 主内容区:
  - padding: `p-6` 或 `p-8`
  - 最大宽度: 不限制 (Mac 窗口通常 1024+px, 内容铺满)
  - 背景: `--bg` (与 surface 形成层次)

### 2.4 ViewTabs

位于 Layout 顶栏下方, 主内容区上方。

- 横向排列, 三个 tab: `列表` / `看板` / `甘特图`
- 每个 tab:
  - padding: `px-4 py-2`
  - text-base
  - 选中: text `--text-primary` medium + 下边线 2px `--accent`
  - 未选中: text `--text-muted` + 透明下边线 (保持布局稳定)
- 间距: `gap-2` 或更大 `gap-4`
- ARIA: `role="tablist"`, 每个 tab `role="tab"`, 选中 `aria-selected="true"`

### 2.5 CorruptedView

**视觉调性**: calm, NOT alarm. 破损不是错, 是状态。

- 全屏居中布局 (Layout 不显示)
- 顶部: 单图标 (warning triangle, `--warning` 色, 32px)
- 标题: `text-2xl semibold` "数据库损坏"
- 副标题: `text-base muted`, max-width `prose` (65ch)
  - 内容: 解释状况 + 承诺不删除 + 引导导出
- 主操作: `Button variant="primary"` "导出为 JSON"
- 次操作: `Button variant="ghost"` "进入设置" (允许用户在导出前手动清除数据)
- 间距: 标题与图标 `gap-4`, 标题与副标题 `gap-2`, 副标题与按钮 `gap-6`
- 整页 padding: `py-16`

**禁用项**: 红色 banner、感叹号、闪烁、emoji (Skill 9.D: 禁止 emoji 默认)。

### 2.6 Settings

**视觉调性**: 密集但有序, 像 macOS 系统偏好设置。

- Layout 内显示 (非全屏)
- 页面标题: `text-2xl semibold` "设置"
- 分组列表 (grouped sections):
  - 外观 (Appearance)
    - 主题 (Theme): 3 选项 segmented control (跟随系统 / 亮色 / 暗色), 当前选中态用 `--accent` 边框 + text-medium
    - 当前模式文字提示: text-sm muted, 例如 "跟随系统 (当前: 暗色)"
  - 数据 (Data)
    - 检查更新 (Button variant="secondary", 点击 → loading 1s → 显示"已是最新")
    - 清除所有数据 (Button variant="danger", 点击 → ConfirmDialog)
  - 关于 (About)
    - 版本号 `v0.1.0` (text-sm muted, mono font)
- 分组间距: `gap-8`
- 组内间距: `gap-3`
- 每个 action 项: `flex justify-between items-center`, label 在左, control 在右

**Segmented Control** (Theme 选择器子组件):
- 3 个按钮并排, 共享 border-radius-md 8px (Shape Consistency Lock)
- 未选中: bg `--surface`, text `--text-muted`, 1px border `--border`
- 选中: bg `--bg`, text `--text-primary`, border `--accent` 2px
- 尺寸: height 36px, padding `px-3`, text-sm
- ARIA: `role="radiogroup"`, 每个 `role="radio"`, 选中 `aria-checked="true"`

**ConfirmDialog** (子组件):
- Modal overlay: `--bg` 50% 透明
- 居中卡片: 480px 宽, padding `p-6`, radius `lg` (12px), shadow `lg`
- 标题: `text-xl semibold` "确认清除所有数据?"
- 内容: text-base muted, 解释 "此操作不可撤销, 输入 DELETE 确认"
- 输入框: Input component, placeholder "DELETE"
- 按钮组: `flex justify-end gap-2`
  - 取消 (secondary)
  - 确认清除 (danger), disabled until 输入 === 'DELETE'

---

## 3. Anti-Pattern Checklist (Pre-flight Review)

设计评审时, 对照这份清单逐条检查:

### Visual / CSS

1. **❌ 无 pure-black 背景** (`#000000`, `bg-black`) → 应用 `--bg`
2. **❌ 无 pure-white 背景** (`#FFFFFF`, `bg-white`) → 应用 `--surface`
3. **❌ 无 AI-purple / neon glow** (gradient blue→purple, `shadow-[0_0_20px_blue]`)
4. **❌ 无 3-equal feature cards** (任何 "三张相同卡片横排") → Solo Task 三视图是功能性 tab, 不是装饰卡片
5. **❌ 无 emoji 作为 UI 元素** (✅, ❌, 🎉) → 用 icon library (lucide / phosphor)
6. **❌ 无 Inter as default font** → 用系统字体栈 (Things 3 风)
7. **❌ 无 serif 作为默认字体** → 个人工具不用 serif
8. **❌ 无 oversaturated accent** (如 `bg-blue-500` 配白字太刺眼) → 用 blue-600 / blue-500

### Layout / Spacing

9. **❌ 无 centered hero** (骨架无 hero, 跳过; 但任何未来页面避免)
10. **❌ 无 zigzag image+text 布局** (骨架无, 未来页面避免)
11. **❌ 无 decorative dots** (状态点除外)
12. **❌ 无 marquee / 横向滚动条** (Motion Intensity = 3)
13. **❌ 无 version labels in hero** (`v0.1.0 BETA`)
14. **❌ 无 section-number eyebrows** (`01 / INDEX`, `001 · DATA`)
15. **❌ 无 split-header pattern** (左标题 + 右小段落) → 标题副标题垂直 stack

### Typography

16. **❌ 无 em-dash** (`—`) 在任何文案 → 用句号或逗号
17. **❌ 无 oversized H1** (`text-6xl`) → 个人工具用 `text-2xl`
18. **❌ 无 emoji 在文案** (待办描述、按钮、提示)

### Content / Copy

19. **❌ 无 "AI 营销话术"** ("Elevate", "Seamless", "Next-Gen", "Revolutionize") → 用具体动词 ("导出", "删除", "打开")
20. **❌ 无 fake-precise 数字** ("99.99% 完成率") → 不用或标 "(估算)"
21. **❌ 无 generic placeholder** ("Lorem ipsum", "Task 1", "Item A") → 用 i18n key 实际翻译, 占位用真实文案
22. **❌ 无 "Quietly trusted by" / "From the field" 等 poetic label**
23. **❌ 无 "Settings" 副标题中的 mock-humble** ("我们尽力做到不打扰")

### Interaction

24. **❌ 无 infinite-loop animation** (loading spinner 是 OK 的, marquee / shimmer / pulse 不允许)
25. **❌ 无 `window.addEventListener('scroll')`** (Motion 静态, 不需要 scroll 监听)
26. **❌ 无 hover 触发的 layout shift** (`width` 过渡 → 用 `transform`)
27. **❌ 无按钮文字换行** (CTAs must fit on one line at desktop)
28. **❌ 无 white-on-white / white-on-light CTA** → accent 提供足够对比 (WCAG AA 4.5:1)

### Project-Specific

29. **❌ 无硬编码中文** 在 `.tsx` 组件中 → 必须 `t('key')` 包装
30. **❌ 无 emoji 任务状态图标** (✅/⏳/❌) → 用 lucide 的 Circle/Clock/CheckCircle
31. **❌ 无 "Beta" / "Preview" / "v0.x" 角标** 在 Settings 主标题 (允许在 About 版本号旁)
32. **❌ 无 theme toggle 在顶栏/hero 等显眼位置** → 仅在 Settings 内 (Section 2.6), 不做成太阳/月亮图标按钮
33. **❌ 无未持久化的 theme 选择** → 必须存 DB (`user_preferences` 表), 跨重启保留

---

## 4. Pre-Flight Pass Standard

**评审最后一步**: 对照第 3 节清单, 每条标记 ✅ / ❌。**任何一条 ❌ = 不通过, 必须修改后再评审**。

**评审流程**:

1. **Phase 1.5**: 在 `DesignPreview.tsx` 上调一次 `/design-taste-frontend` skill (覆盖 D1+D2)
2. **Phase 3 末**: 三视图 + Layout 真实渲染时再评一次 (覆盖 D2)
3. **Phase 5 末**: CorruptedView 真实渲染时评一次 (覆盖 D3)
4. **Phase 6 末**: Settings + ConfirmDialog + Test Error picker 真实渲染时评一次 (覆盖 D4)

每次评审在 commit body 加摘要:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

`Pre-flight check: fail` = 不允许 commit, 必须回到 Pre-Flight 阶段修复。

---

## 5. Migration Notes (当本 spec 后续 CRUD 接入时)

**未来页面** 必须遵循:
- 主内容区 padding 不变 (`p-6` / `p-8`)
- Card 默认 shadow-sm, hover shadow-md (可关闭)
- 状态色仅用于: 状态徽章 (todo/doing/done), 错误提示, 成功提示
- 不引入新组件库 (除非后续 spec 明确决策)
- i18n key 必须新增到 `zh-CN.ts`, 不允许组件内 hardcode

**未来 motion** (CRUD 完成后):
- List 项添加: fade-in 150ms (单次, 不 infinite)
- Status change: background-color transition 150ms
- Delete: fade-out 150ms
- 不引入新 motion library
