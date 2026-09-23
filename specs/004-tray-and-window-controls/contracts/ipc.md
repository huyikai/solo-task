# IPC Contracts: 托盘 + 窗口控制 (004)

**Feature**: 004-tray-and-window-controls

本 spec **不新增 IPC 命令**。所有跨端通讯复用 001 已建 IPC。

## 复用 IPC

| IPC | 用途 | 字段 |
|---|---|---|
| `get_preference(key)` | 读 `user_preferences` 表 | `key: string` → `{ value: string }` (JSON 序列化的字面量) |
| `set_preference(key, value)` | 写 `user_preferences` 表 | `key: string, value: string` |

## 新增 preferences key

| key | 值类型 | 取值 | 默认 | 持久化层 |
|---|---|---|---|---|
| `window.close_action` | JSON string | `'"minimize_to_tray"'` 或 `'"quit"'` | `'"minimize_to_tray"'` | SQLite `user_preferences` 表 |

## Window / Tray 控制流(不经 IPC)

| 操作 | 调用路径 | 来源 |
|---|---|---|
| 注册托盘 icon | Rust `Builder::setup` 闭包内 `tray::install(app)` | Tauri 启动时一次性 |
| 菜单栏 icon 左键单击 | Rust `on_tray_icon_event` → `toggle_main_window(app_handle)` | OS 事件 → Rust |
| 菜单栏 icon 右键菜单 | Rust `on_menu_event` 匹配 "show" / "quit" id | OS 事件 → Rust |
| 关闭按钮拦截 | 前端 `getCurrentWindow().onCloseRequested(handler)` | OS 事件 → JS |
| 关闭按钮 handler 读取偏好 | 前端 `getPreference("window.close_action")` | JS → Rust IPC |
| 关闭按钮 = 退托盘 | 前端 `getCurrentWindow().hide()` + `event.preventDefault()` | JS → Tauri |
| 关闭按钮 = 真退出 | 前端 **不** preventDefault | JS → Tauri (native quit) |
| 双箭头覆盖层点击 | 前端 `getCurrentWindow().setFullscreen(!isFullscreen())` | JS → Tauri |
| 菜单栏菜单"退出" | Rust `app.exit(0)` | OS 事件 → Rust (直接 exit) |

## 错误路径

| 场景 | Rust 处理 | UI 表现 |
|---|---|---|
| `get_preference("window.close_action")` 返回 `value: null`(未持久化) | n/a | JS fallback 到 `minimize_to_tray` |
| `value` 不是合法 JSON | n/a | JS fallback 到 `minimize_to_tray` |
| `value` 是合法 JSON 但不是 `"minimize_to_tray"`/`"quit"` | n/a | JS fallback 到 `minimize_to_tray` |
| Rust 端托盘构造失败(PNG 不存在 / 权限被拒) | `tray::install()` 返回 `tauri::Result::Err` | 应用退出 setup 阶段,无法启动 (panic) — 由 CI 早期拦截 |

## 依赖

依赖 001 的 `get_preference`/`set_preference` IPC,后者依赖 001 创建的
`user_preferences(key TEXT PK, value TEXT NOT NULL)` 表。

依赖 003 的 `AppError::Validation` 枚举(用于 IPC 错误序列化) — 本 spec
不直接触发 Validation,但前端 `setPreference` 的错误路径会用到。