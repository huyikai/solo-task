//! macOS menu-bar tray (FR-001 ~ FR-004).
//!
//! Real macOS icon APIs require a live `tauri::App` instance, so this
//! module exposes a pure `build_tray_config()` for unit tests, plus
//! `install()` which calls into the real `tauri::tray` builder.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, Manager};

/// Pure data describing what `install()` will hand to `TrayIconBuilder`.
/// Kept in this module so the unit tests in `tray_tests` can pin every
/// field without touching the OS layer.
#[derive(Debug, PartialEq, Eq)]
pub struct TrayConfig {
    pub tray_id: String,
    pub icon_path: String,
    pub menu_items: Vec<String>,
    pub show_menu_on_left_click: bool,
}

/// Build the configuration for the Solo Task menu-bar icon.
///
/// The icon path is relative to the `src-tauri/` Cargo workspace — Tauri
/// resolves it via the bundled resources at runtime.
pub fn build_tray_config(icon_path: &str) -> TrayConfig {
    TrayConfig {
        tray_id: "main".to_string(),
        icon_path: icon_path.to_string(),
        menu_items: vec!["show".to_string(), "quit".to_string()],
        show_menu_on_left_click: false,
    }
}

/// Install the menu-bar icon. Must be called inside `Builder::setup`
/// so `app` is fully wired.
pub fn install(app: &mut App) -> tauri::Result<()> {
    const ICON_PATH: &str = "icons/tray-icon.png";

    let config = build_tray_config(ICON_PATH);

    let show_i = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound(config.icon_path.clone()))?;

    TrayIconBuilder::with_id(&config.tray_id)
        .icon(icon)
        .icon_as_template(true)
        .menu(&menu)
        .show_menu_on_left_click(config.show_menu_on_left_click)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => toggle_main_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

/// Show + focus the main window, or hide it if currently visible. Symmetric
/// for the menu-bar icon's left-click behavior (US1 / SC-001-2,3).
pub(crate) fn toggle_main_window(app: &tauri::AppHandle) {
    let Some(win) = app.get_webview_window("main") else {
        return;
    };
    let visible = win.is_visible().unwrap_or(false);
    if visible {
        let _ = win.hide();
    } else {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tray_config_pins_main_id_and_show_quit_menu() {
        let c = build_tray_config("icons/tray-icon.png");
        assert_eq!(c.tray_id, "main");
        assert!(
            c.icon_path.contains("tray-icon.png"),
            "icon path should resolve under bundled resources: got {}",
            c.icon_path
        );
        assert_eq!(c.menu_items, vec!["show".to_string(), "quit".to_string()]);
        // FR-003 关闭行为 left click 不弹菜单, 而是 our / 直接 toggle
        // (menu 仅由 OS 在右键时弹出)
        assert!(!c.show_menu_on_left_click);
    }
}