use std::sync::Mutex;
use tauri::{
    AppHandle, CustomMenuItem, Manager, Menu, MenuItem, State, Submenu,
    SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_notification::NotificationExt;

// ── Application State ────────────────────────────────────
struct AppState {
    window_visible: Mutex<bool>,
    update_available: Mutex<bool>,
    app_version: String,
}

impl AppState {
    fn new() -> Self {
        Self {
            window_visible: Mutex::new(false),
            update_available: Mutex::new(false),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
        }
    }
}

// ── Window Manager ───────────────────────────────────────
fn setup_splash_to_main(app: &AppHandle) {
    let splash_window = app.get_webview_window("splashscreen");
    let main_window = app.get_webview_window("main");

    if let Some(splash) = splash_window {
        // Close splash after 2 seconds and show main window
        let splash_clone = splash.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(2));
            let _ = splash_clone.close();
        });
    }

    if let Some(main) = main_window {
        let main_clone = main.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(3));
            let _ = main_clone.show();
            let _ = main_clone.set_focus();
        });
    }

    // Update state
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut visible) = state.window_visible.lock() {
            *visible = true;
        }
    }
}

// ── System Tray ──────────────────────────────────────────
fn create_tray_menu() -> SystemTrayMenu {
    SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show", "Show Window").accelerator("CmdOrCtrl+Shift+S"))
        .add_item(CustomMenuItem::new("hide", "Hide Window").accelerator("CmdOrCtrl+Shift+H"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("check_update", "Check for Updates..."))
        .add_item(CustomMenuItem::new(
            "about",
            "About SHRANIX Krushi ERP",
        ))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit", "Quit").accelerator("CmdOrCtrl+Q"))
}

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::LeftClick { .. } => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.set_always_on_top(true);
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    let _ = window.set_always_on_top(false);
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "check_update" => {
                // Trigger update check - updater plugin handles this
                let _ = app.emit("menu:check-update", ());
            }
            "about" => {
                let _ = app.emit("menu:about", ());
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        _ => {}
    }
}

// ── IPC Commands ─────────────────────────────────────────

#[tauri::command]
fn get_app_info(state: State<AppState>) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "name": "SHRANIX Krushi ERP",
        "version": state.app_version,
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
fn toggle_window_visibility(app: AppHandle) -> Result<bool, String> {
    if let Some(window) = app.get_webview_window("main") {
        let visible = window.is_visible().map_err(|e| e.to_string())?;
        if visible {
            window.hide().map_err(|e| e.to_string())?;
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
        }
        Ok(!visible)
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn minimize_to_tray(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| e.to_string())?;
        // Actually hide instead of minimize for tray behavior
        window.hide().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}

#[tauri::command]
fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn get_document_dir() -> Result<String, String> {
    let path = std::env::current_dir().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn check_for_updates(app: AppHandle) -> Result<serde_json::Value, String> {
    // Delegates to the updater plugin
    let response = serde_json::json!({
        "status": "checking",
        "message": "Update check initiated"
    });
    let _ = app.emit("update:check-started", ());
    Ok(response)
}

// ── Deep Link Handler ────────────────────────────────────
fn handle_deep_link(app: &AppHandle, link: &str) {
    let _ = app.emit("deep-link:received", link);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// ── Application Entry Point ──────────────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        // ── Plugins ──────────────────────────────────────────
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_deep_link::Builder::new()
                .on_open_url(|app, urls| {
                    if let Some(url) = urls.first() {
                        handle_deep_link(app, url);
                    }
                })
                .build(),
        )

        // ── Application Menu ─────────────────────────────────
        .menu(|app| {
            let file_menu = Submenu::new(
                "File",
                Menu::new()
                    .add_item(CustomMenuItem::new("preferences", "Preferences").accelerator("CmdOrCtrl+,"))
                    .add_native_item(MenuItem::Separator)
                    .add_item(CustomMenuItem::new("quit", "Quit").accelerator("CmdOrCtrl+Q")),
            );
            let edit_menu = Submenu::new(
                "Edit",
                Menu::new()
                    .add_item(CustomMenuItem::new("undo", "Undo").accelerator("CmdOrCtrl+Z"))
                    .add_item(CustomMenuItem::new("redo", "Redo").accelerator("CmdOrCtrl+Shift+Z"))
                    .add_native_item(MenuItem::Separator)
                    .add_item(CustomMenuItem::new("cut", "Cut").accelerator("CmdOrCtrl+X"))
                    .add_item(CustomMenuItem::new("copy", "Copy").accelerator("CmdOrCtrl+C"))
                    .add_item(CustomMenuItem::new("paste", "Paste").accelerator("CmdOrCtrl+V"))
                    .add_item(CustomMenuItem::new("select_all", "Select All").accelerator("CmdOrCtrl+A")),
            );
            let view_menu = Submenu::new(
                "View",
                Menu::new()
                    .add_item(CustomMenuItem::new("toggle_sidebar", "Toggle Sidebar").accelerator("CmdOrCtrl+B"))
                    .add_item(CustomMenuItem::new("zoom_in", "Zoom In").accelerator("CmdOrCtrl+Plus"))
                    .add_item(CustomMenuItem::new("zoom_out", "Zoom Out").accelerator("CmdOrCtrl+-"))
                    .add_native_item(MenuItem::Separator)
                    .add_item(CustomMenuItem::new("toggle_devtools", "Toggle DevTools").accelerator("CmdOrCtrl+Shift+I")),
            );
            let help_menu = Submenu::new(
                "Help",
                Menu::new()
                    .add_item(CustomMenuItem::new("about", "About SHRANIX Krushi ERP"))
                    .add_item(CustomMenuItem::new("check_update", "Check for Updates..."))
                    .add_item(CustomMenuItem::new("documentation", "Documentation").accelerator("F1")),
            );

            let menu = Menu::new()
                .add_submenu(file_menu)
                .add_submenu(edit_menu)
                .add_submenu(view_menu)
                .add_submenu(help_menu);
            app.set_menu(menu).ok();
            menu
        })
        .on_menu_event(|app, event| match event.id.as_str() {
            "quit" => std::process::exit(0),
            "toggle_sidebar" => {
                let _ = app.emit("menu:toggle-sidebar", ());
            }
            "zoom_in" => {
                let _ = app.emit("menu:zoom-in", ());
            }
            "zoom_out" => {
                let _ = app.emit("menu:zoom-out", ());
            }
            "toggle_devtools" => {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_devtools_open() {
                        window.close_devtools();
                    } else {
                        window.open_devtools();
                    }
                }
            }
            "check_update" => {
                let _ = app.emit("menu:check-update", ());
            }
            "about" => {
                let _ = app.emit("menu:about", ());
            }
            "documentation" => {
                let _ = app.emit("menu:documentation", ());
            }
            _ => {}
        })

        // ── System Tray ──────────────────────────────────────
        .system_tray(create_tray_menu())
        .on_system_tray_event(handle_tray_event)

        // ─── Application State ────────────────────────────────
        .manage(AppState::new())

        // ── IPC Commands ──────────────────────────────────────
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            toggle_window_visibility,
            minimize_to_tray,
            show_notification,
            get_app_data_dir,
            get_document_dir,
            check_for_updates,
        ])

        // ── Setup ─────────────────────────────────────────────
        .setup(|app| {
            // Register deep link handler
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Setup splash screen to main window transition
            setup_splash_to_main(app);

            // Register deep link scheme
            app.deep_link().register_all().ok();

            // Emit app ready event
            let _ = app.emit("app:ready", {
                let state = app.state::<AppState>();
                serde_json::json!({
                    "version": state.app_version,
                    "platform": std::env::consts::OS,
                })
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SHRANIX Krushi ERP");
}
