pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod paths;
pub mod repo;
pub mod state;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_state = commands::health_check::init_state()
        .expect("failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(db_state)
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
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
}
