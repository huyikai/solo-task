# Implementation Plan: 托盘 + 窗口控制 (004)

**Spec**: `spec.md`
**Date**: 2026-09-20
**TDD commitment**: Principle VI — Red commit 先于同 scope Green commit
同 push。

---

## Decisions (Lock Phase)

### D1 — 关闭按钮拦截在 Rust 还是前端? → **前端 `onCloseRequested`**
**Why**: 单一文件 (`src/App.tsx` 或新文件 `src/window/lifecycle.ts`),
无需 Rust 端 IPC;可与 Settings 状态(`useEffect` + `getPreference`)干净
配合;Tauri 2 官方推荐 window-scoped 拦截走前端。
**Cost**: 极短窗口(应用启动到 React 挂载)的关闭事件未被拦截 — 风险
可接受(用户启动时不会立刻关闭)。
**Alternative rejected** — Rust `on_window_event(CloseRequested { api })`:
更"硬",但要把偏好读取穿透到 Rust,需要新 IPC 命令;规则简单反而代价大。

### D2 — 双箭头按钮如何重写语义? → **Rust 端接管 macOS zoom**
**Why**: 标题栏按钮是 OS-owned,前端无法拦截。但 Tauri 的
`titleBarStyle: "Overlay"` 把 macOS NSWindow 的 zoom 透传成
`toggleMaximize()`,我们要把它改成 `setFullscreen`。Rust 端在
`Builder::on_window_event` 监听 `Resized` 不够;改为 **hook titleBarStyle
在 Rust 端处理 zoom**:Tauri 2 没有直接 hook,改走 **前端调换**:
新建一个**透明覆盖层**盖住原生"双箭头"按钮,把它重新画成一个自定义
按钮,点击触发 `setFullscreen(!isFullscreen())`。
**Cost**: 牺牲原生气泡 hover 效果(原生双箭头 hover 出现绿色圈)——
  通过把覆盖层设成透明 + 全屏视觉仍由 OS 绘 hover 来近似。
**Alternative rejected** — `titleBarStyle: "Visible"` 完全自定义标题栏:
  回到自绘红绿灯(违反我们刚采纳的 v1.1.1 原生路线)。
**Alternative rejected** — 改 Tauri 内核映射:超出 spec scope。
**注**: 经侦察,Tauri 2 当前没有 hook 进 NSWindow zoom 的官方途径。—
  最终方案: **前端透明覆盖层 + setFullscreen**(在 tasks.md T011 落实
  端到端集成)。

### D3 — 菜单栏 icon 何时注册? → **应用启动时立即注册,不按需**
**Why**: Tauri `tray-icon` 在 macOS 下注册后**永久**驻留菜单栏,按需
显隐需要 `tray.set_visible(true/false)`,但 macOS 上图标一旦隐藏可能
被系统认为"已退出"。用户体验上菜单栏 icon 始终可见更稳。
**Cost**: 即使用户没关窗、图标就亮着 — 不影响视觉(可移除)。
**Alternative rejected**:在关闭按钮第一次按下时再创建 tray:
Rust 端需异步等待,复杂度高。

### D4 — 关闭行为偏好默认值 → **`minimize_to_tray`**
**Why**: 本 spec 的核心诉求;macOS 用户对"close = quit"陌生。
**Why not quit**: 若默认 quit,首次安装即覆盖既有 macOS 行为惯例,
  可能让老用户不悦;以"显式 opt-in 到 quit"为稳态。
**Alternative rejected**:默认 quit:违反 spec 核心。

### D5 — Settings 新控件分组 → **沿用"外观"分组**
**Why**: 外观分组已有 ThemeSwitcher + segmented radiogroup 范式
(§6.6);新增"关闭按钮"控件紧跟主题,语义连续("个人偏好")。
**Cost**: 无 — 设计已预留"外观"扩展位(分组是 flex+gap)。
**Alternative rejected** — 新建"窗口"分组:增加分组但与"主题/数据/关于"
的 4 分段关系失衡;`gap-8` 排版分组数变成 5 个不够整。
**Alternative rejected** — "高级"分组:个人工具不需要"高级"层级。

### D6 — i18n key 命名 → **`settings.close_action.*`**
**Why**: 已有 `settings.theme.*` / `settings.check_for_update` 等命名
风格,新 key 沿用 `settings.close_action.label`,
`settings.close_action.minimize_to_tray`,`settings.close_action.quit`。
**Alternative rejected** — `window.close_action.*`:与 Settings 页面命名
不统一(命名空间不是"窗口")。

### D7 — tray icon PNG 来源 → **项目自有 `src-tauri/icons/tray-icon.png`**
**Why**: 不复用 app 主 icon(设计原则"icon 形状硬约束"——主 icon 是
圆形 1024x1024 圆角图标,菜单栏应是简单的单色 silhouette)。新建一
张 256x256 PNG,**单色黑色 + 透明**(set_icon_as_template 会接管着色)。
**Alternative rejected** — 复用 main icon:在深色模式下高亮白图标在菜单
栏里看不清;设计意图不明。

### D8 — 自动化门禁不覆盖的项
**Why**:
- 菜单栏 icon 注册 → 必须在真机 (Tauri runtime + macOS 菜单栏) 验证,
  jsdom 不渲染 OS 菜单栏。TDD 用 Rust 单测断言 `Builder.setup` 闭包
  调用了 `TrayIconBuilder::new().icon(...).menu(...)`。
- 关闭按钮拦截 → Rust 单测 + jsdom 前端断言 `getCurrentWindow().listen`
  注册了 `tauri://close-requested` handler。

---

## Architecture (Plan Phase)

### Rust side (`src-tauri/src/`)

新增 `tray.rs`:
```rust
pub fn install(app: &mut tauri::App) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu  = Menu::with_items(app, &[&show_i, &quit_i])?;
    let icon  = app.default_window_icon().unwrap().clone();

    TrayIconBuilder::with_id("main")
        .icon(icon)
        .icon_as_template(true)            // macOS dark-mode auto invert
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => toggle_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up, ..
            } = event {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    Ok(())
}

fn toggle_main_window(app: &AppHandle) {
    let Some(win) = app.get_webview_window("main") else { return };
    let visible = win.is_visible().unwrap_or(false);
    if visible { let _ = win.hide(); }
    else {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}
```

`lib.rs` 变更:
- 启用 `tray-icon` Cargo feature
- `.setup(|app| { tray::install(app); Ok(()) })`
- 新增 capabilities: `core:window:allow-hide`, `core:window:allow-show`,
  `core:window:allow-set-focus`, `core:window:allow-set-fullscreen`,
  `core:window:allow-unminimize`(autoload 不含,需显式列)。
- **不**加 `core:app:allow-exit`(Rust 端 `app.exit(0)` 不需 ACL)。

### Frontend side (`src/`)

新增 `src/window/lifecycle.ts`:
- App 挂载时 `await getCurrentWindow().onCloseRequested(handler)`
- handler 内读 `getPreference("window.close_action")` → 解析为
  `CloseAction = "minimize_to_tray" | "quit"`(解析失败回退
  `minimize_to_tray`)
- `minimize_to_tray` → `event.preventDefault(); await getCurrentWindow().hide();`
- `quit` → 不 preventDefault,允许原生 quit

新增 `src/components/WindowControls.tsx`:
- 透明覆盖层(absolute inset-x-0 top-0 h-12),绝对定位覆盖双箭头按钮
  位置(`left-2 top-2`,48×48 命中区),点击调
  `await getCurrentWindow().setFullscreen(!(await isFullscreen()))`

新增 `src/components/SettingsCloseAction.tsx`:
- 沿用 §6.6 ThemeSwitcher 视觉语言的两选项 radiogroup:
  - 显示文本: `t("settings.close_action.label")` "关闭按钮"
  - 选项: `t("settings.close_action.minimize_to_tray")` "退回菜单栏"
    (默认) / `t("settings.close_action.quit")` "退出应用"
- 选中状态用 §6.6 模式 (`bg-bg` + `font-medium` + `shadow-sm`)
- 变更调 `setPreference("window.close_action", JSON.stringify(value))`,
  再局部 React state 同步,关闭按钮下次点击即按新行为执行

Settings 页面插入位置:外观分组 (`<h2>外观</h2>`) 内、Theme 卡片**下
方**、与 Theme 卡片同样的 `Card` 包裹 + `CardContent`。

### i18n keys (新增)

`src/i18n/zh-CN.ts`:
- `settings.close_action.label`: "关闭按钮"
- `settings.close_action.minimize_to_tray`: "退回菜单栏"
- `settings.close_action.quit`: "退出应用"

若未来加 en-US,平行翻译(暂不必)。

### capabilities (`src-tauri/capabilities/default.json`)

```json
{
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-start-dragging",
    "core:window:allow-hide",
    "core:window:allow-show",
    "core:window:allow-set-focus",
    "core:window:allow-set-fullscreen",
    "core:window:allow-unminimize",
    "dialog:default"
  ]
}
```

新增权限由 §2 清单"窗口动作权限"机器测试覆盖(沿用 v1.1.1 的守卫)。

### design.md amendment (v1.1.2)
新增 §6.8 "Settings CloseAction Switch",锁定:
- 二选一 radiogroup 视觉:与 §6.6 ThemeSwitcher 一致
- label 与选项 i18n key 锁定
- 默认值锁定为 `minimize_to_tray`
- 不持久化到 JS 状态,只持久化到 SQLite
- 关闭拦截逻辑在 Rust 内(避免硬性拒绝用户改默认)

---

## Compliance Gates (Per-PR)

对每个 commit:
1. `cargo test`(包含新增 tray 单测)— Rust 单测通过
2. `pnpm test`(包含新增 SettingsCloseAction + lifecycle 测试)
4. `pnpm typecheck` / `pnpm build`
5. `pnpm test:visual` — 0 drift(新增控件用现有 token,基线不动)
6. `pnpm check:i18n` — 0 违规
7. pre-push hook(scope 匹配 + test-before-production)

设计自审(design.md §2 34 条):本 spec 不引入新 token / 新 radius /
新字体;新增 Settings 分组沿用 §6.6。