# Feature Specification: 托盘 + 窗口控制 (Tray & Window Controls)

**Feature Branch**: `004-tray-and-window-controls`

**Created**: 2026-09-20

**Status**: Done (2026-09-24 — 27/27 tasks; 人工 e2e 用户逐项验证通过, 含 Dock 图标恢复)

**Input**: 2026-09-20 用户拍板的四条需求:
1. macOS 原生红绿灯的"双箭头(zoom/fullscreen)"按钮改为 `setFullscreen(true/false)` 二态语义 — 一次点最大化,再点一次全屏是错的,要求二选一清晰切换。
2. 关闭按钮 = 退回菜单栏(macOS menu bar icon),不是 quit。
3. 左键单击菜单栏 icon → 显示 + 聚焦窗口;右键菜单(显示 / 退出)。
4. Settings → 外观分组新增"关闭按钮 = 退出/退托盘"二选一开关,持久化到 `user_preferences`。

设计 Reference: `.specify/memory/design.md` (Constitution Principle X)。
本 spec 不引入新的 UI 原语;Settings 开关复用既有 §6.6 模式(ThemeSwitcher
同一视觉语言)。

**Constitution Reference**: `.specify/memory/constitution.md` v1.8.0
- Principle I (Local-First: 托盘状态 / 关闭行为开关存本地 SQLite,无外发)
- Principle V (Rust owns system: 托盘构造、菜单事件、窗口事件拦截均在 Rust 端)
- Principle VI (TDD NON-NEGOTIABLE)
- Principle VII.3 (IPC errors structured, not stringified)
- Principle IX (Design Quality)
- Principle X (Design System Continuity: 新分组沿用 §6.6 token)
- Principle XI (Settings 必须有返回控制 — 已沿用,本 spec 新增分组保留)

**Prior Spec Reference**: `specs/001-foundation/` 提供 `user_preferences` 表
与 `get_preference` / `set_preference` IPC(已有,本 spec 复用);
`specs/002-tailwind-v4-upgrade` 提供 v1.1.0 设计 token;
`specs/003-task-crud` 提供 `AppError::Validation` 等共享错误类型。

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — 关闭窗口退回菜单栏 (Priority: P1)

用户想最小化注意力但保持应用存活。在主窗口点击左上角红色关闭按钮,窗口
消失,但应用继续运行 — 在 macOS 顶部菜单栏出现 Solo Task 图标,左键单击
图标可恢复窗口。

**Why this priority**: macOS 个人工具标配(Things 3 / Linear / Bear 都这
样),关闭 = quit 对长期后台使用的应用体验差。

**Independent Test**: 在主窗口点击红色关闭按钮,验证:(a) 窗口消失;
(c) 菜单栏存在 Solo Task icon(肉眼可见);(d) 单击 icon 窗口重新出现并
置顶;(e) 应用进程未退出(`ps aux | grep solo-task` 仍在)。

**Acceptance Scenarios**:

1. **Given** 主窗口可见, **When** 用户点击左上角红色关闭按钮, **Then**
   窗口立即消失,菜单栏出现 Solo Task icon,应用未退出
2. **Given** 窗口已隐藏(在菜单栏驻留), **When** 用户左键单击菜单栏
   icon, **Then** 窗口重新显示并获得焦点(若之前最小化,先 unminimize 再
   show 再 set_focus)
3. **Given** 窗口可见, **When** 用户左键单击菜单栏 icon, **Then** 窗口
   隐藏(行为对称)
4. **Given** 菜单栏 icon 驻留中, **When** 用户右键菜单栏 icon, **Then**
   弹出菜单(显示 / 退出),点击"显示"行为同 US1-2,点击"退出"应用完全退出

### User Story 2 — 双箭头按钮 = 全屏二态 (Priority: P1)

用户希望"双箭头"按钮行为可预测:第一次按进入全屏,再按一次退出全屏(不
经过 maximize 状态)。原 macOS 标题栏"zoom"行为(最大化 ↔ 全屏两态)在
Tauri Overlay 透传 `toggleMaximize()` 下会出现"按一次最大化、再按一次
才进全屏"的诡异两步操作,本 spec 改为单一的 `setFullscreen(true/false)`
切换。

**Why this priority**: 桌面工具全屏频繁(专注模式),两步延迟会让人怀疑是
否按下。

**Independent Test**: 主窗口,点击原生"双箭头"按钮;验证:(a) 第一次点击
进入全屏(无最大化中间态);(b) 再点击一次退出全屏;(c) 窗口高度无最大
化/全屏中间尺寸。

**Acceptance Scenarios**:

1. **Given** 主窗口非全屏, **When** 用户点击双箭头按钮, **Then** 窗口
   直接进入全屏(fullscreen state = true)
2. **Given** 主窗口已全屏, **When** 用户点击双箭头按钮, **Then** 窗口
   退出全屏(回到原尺寸/位置,不经过 maximize 状态)
3. **Given** 关闭按钮已通过 Settings 改为"退出", **When** 用户点关闭,
   **Then** 应用真退出(US1 不适用)

### User Story 3 — Settings 关闭行为开关 (Priority: P2)

部分用户仍偏好"关闭 = 退出"的传统 mac 行为。Settings → 外观分组新增
"关闭按钮"二选一控件(退出 / 退回菜单栏),与主题选择器同一视觉语言
(§6.6 segmented radiogroup)。变更立即生效,无需重启。

**Why this priority**: 用户控制;非 P1 阻塞,但影响长期用户偏好。

**Independent Test**: 打开 Settings,外观分组找到"关闭按钮",切换为"退
出";验证:(a) 设置立即生效(下一次关闭按钮 = 真退出);(b) 重启应用
   设置保留;(c) SQLite `user_preferences` 表新增一行
   `key='window.close_action'`,`value='"quit"'`(JSON 序列化的 quit 字面量)。

**Acceptance Scenarios**:

1. **Given** 默认值(退回菜单栏), **When** 用户切换为"退出", **Then**
   下一次点击关闭按钮应用真退出,菜单栏 icon 不再出现
2. **Given** 设置为"退出", **When** 用户切换回"退回菜单栏", **Then**
   下一次关闭按钮退回菜单栏(US1 行为)
3. **Given** 设置已变更, **When** 用户完全退出并重启应用, **Then**
   设置保留(`user_preferences` 持久化)
4. **Given** 设置被非法值(如 JSON 不是合法 QuitAction), **When**
   `get_preference` 返回值, **Then** Rust 端解析失败 fallback 到
   `minimize_to_tray` 且不 panic(防御性默认值,等价于"未知是默认值")

---

## Functional Requirements

- **FR-001**: Rust 端必须使用 `tauri::tray::TrayIconBuilder`(在 `tauri` core
  模块,启用 `tray-icon` feature),通过 `tauri::Builder::default().setup()`
  在应用启动时构造菜单栏 icon。**禁止** `tauri-plugin-tray`(此 crate 已合
  并进 core,引用即编译失败)。
- **FR-002**: 托盘 icon 必须使用 PNG 文件 `src-tauri/icons/tray-icon.png`
  (1024×1024 或 256×256,透明背景)。在 macOS 下必须调用
  `set_icon_as_template(true)`,系统菜单栏自动应用 dark mode 反色。
- **FR-003**: 菜单栏 icon 左键单击默认 **不** 显示托盘菜单(show_menu_on_left_click=false),
  而是触发"显示/聚焦主窗口"逻辑;主窗口已可见时改为隐藏(对称行为)。
- **FR-004**: 右键单击菜单栏 icon 弹出菜单(显示 / 退出),点击"退出"调用
  `app.exit(0)`,应用进程立即终止。
- **FR-005**: 主窗口标题栏的原生"双箭头"按钮(OS-owned),其 macOS
  zoom 行为在当前 Tauri 2 内核下会出现"放大 + 全屏"两步透传(spec 用户
  报告的根因)。本 spec 在前端 `<Tooltip > Tag>` 透明覆盖层(绝对定位
  覆盖双箭头按钮矩形)接管点击:点击调
  `await getCurrentWindow().setFullscreen(!(await isFullscreen()))`。
  原生双箭头 hover 高亮由 macOS 继续渲染(覆盖层透明)。**已知 trade-off**:
  牺牲原生气泡 hover 的"放大"图标(覆盖后此按钮永远显"全屏"),但用户
  拍板"两步诡异 → 二态明确"价值高于 hover 视觉细节。
  若未来 Tauri 提供 `WindowEvent::ZoomRequested` 或同等原生 hook,可重
  新评估是否回到原生 zoom。
- **FR-006**: 主窗口关闭按钮(原生红按钮)被 `onCloseRequested` 拦截:
  拦截后读 Settings `window.close_action` 偏好(默认 `minimize_to_tray`),
  根据偏好决定 `window.hide()` 还是 `app.exit(0)`。
- **FR-007**: Settings 外观分组新增"关闭按钮"控件,二选一
  (`minimize_to_tray` / `quit`),沿用 §6.6 segmented radiogroup 视觉语言。
  选择变更立即生效(关闭按钮下次点击即按新行为执行),不需重启。
- **FR-008**: 新偏好 key `window.close_action`,值类型 JSON 字符串
  (`'"minimize_to_tray"'` 或 `'"quit"'`),存 `user_preferences` 表
  (沿用 001 schema,Rust 端读写通过 `get_preference` / `set_preference`
  IPC,无需新 IPC 命令)。
- **FR-009**: `core:app:default` 不包含 `allow-exit`,Rust 端调
  `app.exit(0)` 不需 ACL,但若未来需前端触发退出则需补 `core:app:allow-exit`。
  本 spec 范围内 Rust 侧退出,**禁止**前端直接 `import { exit } from '@tauri-apps/api/app'`。
- **FR-010**: macOS Dock 图标保留(`app.set_activation_policy` 不调用
  `accessory`),应用是标准 .app 而非纯菜单栏 utility,符合个人工具的
  心智模型。
- **FR-011**: 菜单栏 icon 在窗口被关闭(进入 tray)后才需要出现;窗口可见
  时无需菜单栏 icon — 但 Tauri `tray-icon` 在 macOS 下 icon 一旦注册就
  驻留菜单栏,本 spec 不做按需显隐(增加复杂度且无明显收益;若用户反馈
  反感再开 004 评估)。

## Out of Scope (explicitly)

- **OS-001**: 不实现 `tauri-plugin-global-shortcut`,⌘Q 走原生应用菜单;
  ⌘W 不拦截(由 OS 决定,我们走 hide→tray 自定义入口)。
- **OS-002**: 不实现多 tray icon;只一个 Solo Task 主 icon。
- **OS-003**: 不实现 tray icon 的"tooltip"自定义,系统自动取 icon 标题。
- **OS-004**: 不实现 tray icon 的"badge"(macOS 不支持 tray badge,
  dock badge 是另一回事,本 spec 不动)。
- **OS-005**: 不实现跨平台(Windows/Linux tray 行为差异大,本 spec 显式
  标注 macOS-only;Windows/Linux 留 `.setup()` 钩子里 stub 掉)。

## Success Criteria

- **SC-001**: 关闭按钮 → 菜单栏驻留 → 左键恢复 完整链路在 macOS 14/15
  真机通过,自动化门禁(pnpm test / typecheck / cargo test / test:visual)
  全绿。
- **SC-002**: 双箭头按钮两步操作(放大 + 全屏)压缩为单步全屏切换,无中
  间态;通过 `isFullscreen()` 状态断言验证。
- **SC-003**: Settings 切换关闭行为后,重启应用设置保留;通过 SQLite
  `user_preferences` 表直查 + 重启后 settings UI 回显验证。

---

## Spec Inventory & Critical Dependencies

无新增数据模型;`user_preferences` 表已在 001 创建。
无新增外部资源(仅一个 tray icon PNG,需补 — 放 `src-tauri/icons/tray-icon.png`,
规格 256×256,内容自 PR 设计草图确定)。

## Constitution & Design Alignment

- 设计 token 复用:Settings 新分组沿用 `bg-muted` 轨道 + 选中 `bg-bg` +
  `font-medium` + `shadow-sm`(design.md §6.6)。
- 不引入新颜色 / 圆角 / 字体。
- TDD 纪律(Principle VI):FR 全部以 Rust 单测 + 前端组件测试覆盖;闭
  环由人工 e2e quickstart 验证。
- Rust owns system:所有托盘构造 + 关闭拦截 + 退出触发均在 `src-tauri/src/`。
- i18n 纪律:Settings 新控件的"关闭按钮"标题 + 两个选项 label 走
  `t(key)` i18n key,新 key 必须落在 zh-CN 与 en-US(若有)— `pnpm check:i18n` 0 违规。

## Compliance Gates (每个 PR / commit body MUST 引用)

- `pnpm test`:红先于同 scope 绿,Rust 同。
- `cargo test` / `cargo clippy --all-targets -- -D warnings`。
- `pnpm test:visual`:0 drift vs baseline。
- `pnpm check:i18n`:0 违规。
- `pnpm typecheck` / `pnpm build` 全绿。
- pre-push hook(scope 匹配 + test-before-production)。
- design.md §2 清单 34 项 ✅(本 spec 不引入新 token / 不改 §1.1
  对比度阶梯 — 但 Settings 新分组属于 §6.6 复用,需 §6.6 check)。