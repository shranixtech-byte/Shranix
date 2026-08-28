use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconEvent,
    AppHandle, Emitter, Manager, State,
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

    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(mut visible) = state.window_visible.lock() {
            *visible = true;
        }
    }
}

// ── System Tray ──────────────────────────────────────────
fn create_tray_menu(app: &AppHandle) -> Menu<tauri::Wry> {
    let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>).unwrap();
    let hide = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>).unwrap();
    let check_update =
        MenuItem::with_id(app, "check_update", "Check for Updates...", true, None::<&str>)
            .unwrap();
    let about =
        MenuItem::with_id(app, "about", "About SHRANIX Krushi ERP", true, None::<&str>).unwrap();
    let quit = MenuItem::with_id(app, "quit", "Quit", true, Some("CmdOrCtrl+Q")).unwrap();
    let separator = PredefinedMenuItem::separator(app).unwrap();

    Menu::with_items(
        app,
        &[
            &show,
            &hide,
            &separator,
            &check_update,
            &about,
            &separator,
            &quit,
        ],
    )
    .unwrap()
}

fn handle_tray_event(app: &AppHandle, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click { .. } => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
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
    let response = serde_json::json!({
        "status": "checking",
        "message": "Update check initiated"
    });
    let _ = app.emit("update:check-started", ());
    Ok(response)
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
        .plugin(tauri_plugin_deep_link::init())

        // ── System Tray ──────────────────────────────────────
        .setup(|app| {
            // Create and configure tray icon
            let tray_menu = create_tray_menu(app.handle());
            let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .tooltip("SHRANIX Krushi ERP")
                .build(app.handle())?;

            // Build application menu
            let menu = {
                let app_handle = app.handle().clone();

                let preferences = MenuItem::with_id(
                    &app_handle,
                    "preferences",
                    "Preferences",
                    true,
                    Some("CmdOrCtrl+,"),
                )
                .unwrap();
                let quit = MenuItem::with_id(
                    &app_handle,
                    "quit_menu",
                    "Quit",
                    true,
                    Some("CmdOrCtrl+Q"),
                )
                .unwrap();
                let file_separator = PredefinedMenuItem::separator(&app_handle).unwrap();
                let file_menu = Submenu::with_items(
                    &app_handle,
                    "File",
                    true,
                    &[&preferences, &file_separator, &quit],
                )
                .unwrap();

                let undo = MenuItem::with_id(
                    &app_handle,
                    "undo",
                    "Undo",
                    true,
                    Some("CmdOrCtrl+Z"),
                )
                .unwrap();
                let redo = MenuItem::with_id(
                    &app_handle,
                    "redo",
                    "Redo",
                    true,
                    Some("CmdOrCtrl+Shift+Z"),
                )
                .unwrap();
                let edit_separator = PredefinedMenuItem::separator(&app_handle).unwrap();
                let cut = MenuItem::with_id(
                    &app_handle,
                    "cut",
                    "Cut",
                    true,
                    Some("CmdOrCtrl+X"),
                )
                .unwrap();
                let copy = MenuItem::with_id(
                    &app_handle,
                    "copy",
                    "Copy",
                    true,
                    Some("CmdOrCtrl+C"),
                )
                .unwrap();
                let paste = MenuItem::with_id(
                    &app_handle,
                    "paste",
                    "Paste",
                    true,
                    Some("CmdOrCtrl+V"),
                )
                .unwrap();
                let select_all = MenuItem::with_id(
                    &app_handle,
                    "select_all",
                    "Select All",
                    true,
                    Some("CmdOrCtrl+A"),
                )
                .unwrap();
                let edit_menu = Submenu::with_items(
                    &app_handle,
                    "Edit",
                    true,
                    &[
                        &undo, &redo, &edit_separator, &cut, &copy, &paste, &select_all,
                    ],
                )
                .unwrap();

                let toggle_sidebar = MenuItem::with_id(
                    &app_handle,
                    "toggle_sidebar",
                    "Toggle Sidebar",
                    true,
                    Some("CmdOrCtrl+B"),
                )
                .unwrap();
                let zoom_in = MenuItem::with_id(
                    &app_handle,
                    "zoom_in",
                    "Zoom In",
                    true,
                    Some("CmdOrCtrl+="),
                )
                .unwrap();
                let zoom_out = MenuItem::with_id(
                    &app_handle,
                    "zoom_out",
                    "Zoom Out",
                    true,
                    Some("CmdOrCtrl+-"),
                )
                .unwrap();
                let view_separator = PredefinedMenuItem::separator(&app_handle).unwrap();
                let toggle_devtools = MenuItem::with_id(
                    &app_handle,
                    "toggle_devtools",
                    "Toggle DevTools",
                    true,
                    Some("CmdOrCtrl+Shift+I"),
                )
                .unwrap();
                let view_menu = Submenu::with_items(
                    &app_handle,
                    "View",
                    true,
                    &[
                        &toggle_sidebar,
                        &zoom_in,
                        &zoom_out,
                        &view_separator,
                        &toggle_devtools,
                    ],
                )
                .unwrap();

                let about = MenuItem::with_id(
                    &app_handle,
                    "about_menu",
                    "About SHRANIX Krushi ERP",
                    true,
                    None::<&str>,
                )
                .unwrap();
                let check_update = MenuItem::with_id(
                    &app_handle,
                    "check_update_menu",
                    "Check for Updates...",
                    true,
                    None::<&str>,
                )
                .unwrap();
                let documentation = MenuItem::with_id(
                    &app_handle,
                    "documentation",
                    "Documentation",
                    true,
                    Some("F1"),
                )
                .unwrap();
                let help_menu = Submenu::with_items(
                    &app_handle,
                    "Help",
                    true,
                    &[&about, &check_update, &documentation],
                )
                .unwrap();

                Menu::with_items(
                    &app_handle,
                    &[&file_menu, &edit_menu, &view_menu, &help_menu],
                )
                .unwrap()
            };

            app.set_menu(menu)?;

            // Setup splash screen to main window transition
            setup_splash_to_main(app.handle());

            // Register deep link handler
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

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
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "quit_menu" => std::process::exit(0),
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
                    #[cfg(debug_assertions)]
                    if let Some(window) = app.get_webview_window("main") {
                        if window.is_devtools_open() {
                            window.close_devtools();
                        } else {
                            window.open_devtools();
                        }
                    }
                }
                "check_update_menu" => {
                    let _ = app.emit("menu:check-update", ());
                }
                "about_menu" => {
                    let _ = app.emit("menu:about", ());
                }
                "documentation" => {
                    let _ = app.emit("menu:documentation", ());
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|app, event| {
            handle_tray_event(app, event);
        })
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
        .run(tauri::generate_context!())
        .expect("error while running SHRANIX Krushi ERP");
}
