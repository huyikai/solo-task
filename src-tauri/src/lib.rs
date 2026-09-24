pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod paths;
pub mod repo;
pub mod state;
pub mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state = commands::health_check::init_state()
        .expect("failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(db_state)
        .setup(|app| {
            tray::install(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::create_task,
            commands::list_tasks,
            commands::update_task,
            commands::set_task_status,
            commands::delete_task,
            commands::export_json,
            commands::get_preference,
            commands::set_preference,
            commands::trigger_test_error_command,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // macOS: 点击 Dock 图标触发 Reopen 事件。窗口被 hide() 后
            // Tauri 不会自动恢复 — 需要显式 show + focus (004 US1)。
            // RunEvent::Reopen 是 macOS 专属 variant, 其他平台不编译此分支。
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if let Some(win) = app_handle.get_webview_window("main") {
                    let _ = win.unminimize();
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            // 非 macOS 平台: 事件参数未使用, 消除警告
            #[cfg(not(target_os = "macos"))]
            let _ = (app_handle, event);
        });
}

#[cfg(test)]
mod window_capability_tests {
    // v1.1.1: 自绘红绿灯废弃 (顺序/hover/glyph 三处不像原生且要养权限),
    // 改用 macOS 原生 Overlay。此测试机器守护窗口配置不回退到
    // transparent 私有 API 路线, 且拖拽权限不被裁掉。
    #[test]
    fn window_uses_native_overlay_not_frameless_hack() {
        let conf = include_str!("../tauri.conf.json");
        assert!(
            conf.contains(r#""titleBarStyle": "Overlay""#),
            "tauri.conf.json 缺少 titleBarStyle Overlay — 红绿灯会退回自绘路线"
        );
        for legacy in ["macOSPrivateApi", "\"transparent\": true", "\"decorations\": false"] {
            assert!(
                !conf.contains(legacy),
                "tauri.conf.json 不应再含 {legacy} (v1.1.1 已废弃 transparent 私有 API 路线)"
            );
        }
    }

    #[test]
    fn drag_region_permission_granted_without_window_actions() {
        let caps = include_str!("../capabilities/default.json");
        assert!(
            caps.contains("core:window:allow-start-dragging"),
            "capabilities/default.json 缺少 allow-start-dragging — 拖拽区会失效"
        );
        for action in ["allow-minimize", "allow-close", "allow-toggle-maximize"] {
            assert!(
                !caps.contains(action),
                "原生红绿灯不需要 {action} (v1.1.1); 若加回说明又在自绘"
            );
        }
    }

    // v1.1.2 (004-tray-and-window-controls): 关闭按钮退菜单栏 + 双箭头
    // 覆盖层 setFullscreen 需要以下五条窗口权限。机器守护: 任何一条被
    // 裁掉都会让"关闭窗口"或"全屏切换"不可用。
    #[test]
    fn window_supports_hide_show_focus_for_tray_and_fullscreen() {
        let caps = include_str!("../capabilities/default.json");
        for perm in [
            "core:window:allow-hide",
            "core:window:allow-show",
            "core:window:allow-set-focus",
            "core:window:allow-set-fullscreen",
            "core:window:allow-unminimize",
        ] {
            assert!(
                caps.contains(perm),
                "capabilities/default.json 缺少 {perm} (004 FR-001/FR-005/FR-006); \
                 关闭退托盘或全屏覆盖层会因 ACL 拒绝而失效"
            );
        }
    }
}

#[cfg(test)]
mod lifecycle_tests;
