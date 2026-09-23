# Tasks: 托盘 + 窗口控制 (004)

**Spec**: `spec.md` **Plan**: `plan.md`
**TDD discipline**: Red commit 先于同 scope Green commit 同 push。
每个 Green commit body MUST 引用 design.md §2 清单。

---

## Phase 1: 基础设施 (Cargo + 依赖)

- [ ] T001 登记 `specs/004-tray-and-window-controls/` 四件套并提交
- [ ] T002 [P] `src-tauri/Cargo.toml` 启用 `tauri` crate 的 `tray-icon`
      feature (line 16 现状 `features = []` → `features = ["tray-icon"]`)。
      Rust 端将自动获得 `tauri::tray` 模块与 `tauri::menu` 模块。
- [ ] T003 `src-tauri/capabilities/default.json` 新增 5 条权限
      (allow-hide / allow-set-fullscreen / allow-show / allow-set-focus /
      allow-unminimize),保证 §2 守卫测试可通过。

## Phase 2: Rust 托盘模块 (Rust 单元测试先行)

- [ ] T004 [P] [Red] `src-tauri/src/tray_tests.rs`:断言 `install()` 调用
      了 `TrayIconBuilder::with_id("main").icon(...).menu(&menu)
      .show_menu_on_left_click(false).on_tray_icon_event(...).on_menu_event(...).build()`,
      并验证 menu 包含 "show" / "quit" 两个 id。
- [ ] T005 [Green] `src-tauri/src/tray.rs` 实现 `install(app)` —
      `MenuItem::with_id` x2 + `Menu::with_items` + `TrayIconBuilder`
      装配 + `toggle_main_window(app_handle)` 工具函数(show/hide 切换
      含 unminimize/set_focus 顺序)。
- [ ] T006 [P] [Red] `src-tauri/src/lifecycle_tests.rs`:关闭按钮拦截
      必须经前端 `onCloseRequested`(选 D1 决定),Rust 端**不**实现
      `WindowEvent::CloseRequested` 拦截;守卫测试断言 lib.rs **不**
      注册 `.on_window_event(...)`(防止后人误入 Rust 拦截方案)。
- [ ] T007 [Green] `src-tauri/src/lib.rs` 注册 `.setup(|app| tray::install(app); Ok(()))`,
      不引入 on_window_event 拦截。
- [ ] T008 `cargo test` 全绿 + `cargo clippy --all-targets -- -D warnings` clean。

## Phase 3: 前端 — 关闭拦截 + 全屏接管

- [ ] T009 [P] [Red] `src/__tests__/window-lifecycle.test.ts`:
      (a) 启动时调用 `getCurrentWindow().onCloseRequested` 注册 handler;
      (b) handler 读 `getPreference("window.close_action")`,
          默认 `minimize_to_tray` → 调用 `hide()` + `preventDefault()`;
      (c) value `"quit"` → 不 preventDefault;
      (d) 非法值(解析失败)→ fallback minimize_to_tray。
- [ ] T010 [Green] `src/window/lifecycle.ts` 实现 `installCloseGuard()`,
      在 `App.tsx` 挂载时执行(useEffect 一次;严格只注册一次)。
- [ ] T011 [P] [Red] `src/__tests__/WindowControls.test.tsx`:组件渲染一个
      透明覆盖层(absolute,48×48,inset-x-0 top-0 偏移 left-2 top-2),
      点击调用 `setFullscreen` 翻转当前 `isFullscreen()` 返回值。
- [ ] T012 [Green] `src/components/WindowControls.tsx`: 透明覆盖按钮,
      `pointer-events-auto`,`bg-transparent`,点击 handler 调
      `setFullscreen(!isFullscreen())`。在 App.tsx 的 TitleBar z 层
      上(z-40)与 z-40 同 z-50 之间插入(避免被 Tabs 遮挡)。
- [ ] T013 前端 `pnpm test` + typecheck 全绿。

## Phase 4: Settings 新控件

- [ ] T014 [P] [Red] `src/__tests__/SettingsCloseAction.test.tsx`:
      (a) 渲染两个选项 radiogroup,默认选中"退回菜单栏";
      (b) 点击"退出" → 调用 `setPreference("window.close_action", '"quit"')`;
      (c) 选中样式含 `shadow-sm` (§6.6 锁定)。
- [ ] T015 [Green] `src/components/SettingsCloseAction.tsx`: 沿用
      §6.6 ThemeSwitcher 视觉,值类型 `CloseAction` ("minimize_to_tray" | "quit")。
- [ ] T016 i18n 新增 3 个 zh-CN 键(`label` / `minimize_to_tray` /
      `quit`),通过 `pnpm check:i18n` 0 违规。
- [ ] T017 [Green] `src/views/Settings.tsx` 在 ThemeSwitcher Card 下方
      新增 SettingsCloseAction Card(外观分组内)。
- [ ] T018 前端 `pnpm test` + `pnpm typecheck` + `pnpm build` 全绿。

## Phase 5: design.md amendment + 视觉回归

- [ ] T019 [P] [Red] `lib.rs` 新增 `window_capability_tests` 内置 test
      `window_supports_hide_show_fullscreen` (断言 capabilities 含五条
      新权限),先失败。
- [ ] T020 [Green] capabilities 已在 T003 同步添加,守卫测试自然绿。
- [ ] T021 [docs] `.specify/memory/design.md` 升至 v1.1.2,新增 §6.8
      "Settings CloseAction Switch",锁定 D5 分组 / D6 i18n key / D4
      默认值 / §6.6 视觉继承。
- [ ] T022 `pnpm test:visual` — 0 drift(新控件沿用既有 token,基线不动)。
      若 drift,定位是 token 回归还是设计意图变了;前者改回,后者更新基线。

## Phase 6: 集成 + 端到端门禁

- [ ] T023 `pnpm test` / `cargo test` / `pnpm typecheck` / `pnpm build` /
      `pnpm check:i18n` / `pnpm test:visual` 六门全绿。
- [ ] T024 Tauri 编译可启动 — `pnpm tauri dev` 在真机启动一次,
      验证应用能正常加载(CI 不覆盖 Tauri runtime,故由 dev 启动 +
      肉眼确认)。**此步骤依赖用户/真机**,自动化层止于编译。

## Phase 7: 人工 e2e + 归档

- [ ] T025 quickstart.md 写 7 步:
      1. 启动应用,主窗口正常显示;
      2. 点关闭按钮 → 窗口消失,菜单栏出现 Solo Task icon;
      3. 左键单击菜单栏 icon → 主窗口恢复并置顶;
      4. 双箭头按钮覆盖层点击 → 窗口全屏;
      5. 双箭头按钮覆盖层点击 → 退出全屏;
      6. Settings → 外观 → "关闭按钮"切到"退出",保存,点关闭 → 应用真退出;
      7. 启动应用,设置仍在(持久化验证)。
- [ ] T026 人工 e2e:用户跑 quickstart 7 步,逐项报告 OK。
- [ ] T027 `spec.md` Status 推进 + `tasks.md` 全勾 + 单 commit 归档。