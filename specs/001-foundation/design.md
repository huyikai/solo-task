# Design (Feature Local): 项目骨架 (Foundation)

**Feature**: 001-foundation
**Global design reference**: [`../../../.specify/memory/design.md`](../../../.specify/memory/design.md)
**Constitution**: Principle X (Design System Continuity, v1.5.0)
**Skill**: `/design-taste-frontend`

This file is **feature-local** — it inherits tokens, anti-patterns, and
pre-flight standards from the global design.md and adds only the
foundation-specific content: the visual skeletons of the components
introduced in this feature, plus the per-feature review checkpoints.

> **Anything not defined in this file lives in the global
> `.specify/memory/design.md`.** Do not duplicate. If a token or rule
> is missing, edit the global file via a design-amendment spec, not
> locally.

---

## 0. Design Read (Feature Local)

**Inherits from global design.md Section 0**:
- DESIGN_VARIANCE: 5
- MOTION_INTENSITY: 3
- VISUAL_DENSITY: 3

**Foundation-specific notes**:
- This is the **first feature** to land the design system. The global
  design.md was authored as part of this spec.
- Visual density at MVP is intentionally low; CRUD-following features
  (002, 003) will see density rise naturally with content.

---

## 1. Component Visual Skeletons (Foundation-Specific)

文字描述, 无 React 代码。Foundation 引入了 6 个用户可见组件 + 1 个 dev-only 预览页, 视觉规范如下:

### 1.1 Button

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

**Radius**: 8px (Shape Consistency Lock per global Section 1.4)。
**Focus**: 2px outline `--accent`, offset 2px, 满足 WCAG 2.4.7。
**Disabled**: opacity 0.5, cursor not-allowed, 无 hover。
**Loading**: text 替换为同尺寸 spinner (16px)。

### 1.2 Card

- 背景: `--surface`
- 1px border: `--border`
- Radius: 8px
- Padding: `p-4` (16px)
- Shadow: `shadow-sm` (默认), `shadow-md` on hover (可关闭)
- 内部分区: 标题 (text-lg medium) + 副标题 (text-sm muted, 可选) + 内容 (gap-3)

### 1.3 Layout

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

### 1.4 ViewTabs

位于 Layout 顶栏下方, 主内容区上方。

- 横向排列, 三个 tab: `列表` / `看板` / `甘特图`
- 每个 tab:
  - padding: `px-4 py-2`
  - text-base
  - 选中: text `--text-primary` medium + 下边线 2px `--accent`
  - 未选中: text `--text-muted` + 透明下边线 (保持布局稳定)
- 间距: `gap-2` 或更大 `gap-4`
- ARIA: `role="tablist"`, 每个 tab `role="tab"`, 选中 `aria-selected="true"`

### 1.5 CorruptedView

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

**禁用项**: 红色 banner、感叹号、闪烁、emoji。

### 1.6 Settings

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

## 2. Feature-Local Anti-Patterns

Foundation 不向全局清单追加项目 (全局 33 条已覆盖本 feature 范围)。如后续 feature 发现全局清单不足, 通过 design-amendment spec 写入全局 `.specify/memory/design.md`。

---

## 3. Pre-Flight Review Checkpoints

调用 `/design-taste-frontend` skill 时, 对照全局 `design.md` Section 2 的 33 条 anti-pattern 逐条检查。每次评审的 commit body 必须包含:

```
Design review (design-taste-frontend):
- Skill version: <version>
- Findings: <N anti-patterns flagged, M resolved>
- Pre-flight check: <pass | fail>
```

本 feature 的 4 个 checkpoint:

| ID | Scope | When |
|---|---|---|
| **D1** | tokens (Section 1) + Button + Card + Layout + ViewTabs (Section 1.1-1.4) | End of Phase 1.5 |
| **D2** | Layout (Section 1.3) + three view-tab placeholders + 三视图 (Section 1.4-1.5) | End of Phase 3 Visual |
| **D3** | CorruptedView (Section 1.5) + its integration in App state machine | End of Phase 5 Visual |
| **D4** | Settings page (Section 1.6) + ConfirmDialog + Test Error picker + ThemeSwitcher | End of Phase 6 Visual |

---

## 4. Deviation Proposals

如有 feature-local 设计需要偏离全局 design.md (如本 feature 想引入新 token / 新组件变体 / 新 motion 模式), **必须**先在 `.specify/memory/design.md` 通过 design-amendment spec 写入全局, 再在本 feature 引用。**不允许就地偏离**。

Foundation 阶段预期无 deviation。
