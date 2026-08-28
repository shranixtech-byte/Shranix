use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconEvent,
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_deep_link::DeepLinkExt;
use tauri_plugin_notification::NotificationExt;

// ── Constants ────────────────────────────────────────────
const DEFAULT_PORT: u16 = 19256;
const PORT_RANGE_START: u16 = 19256;
const PORT_RANGE_END: u16 = 19276;

// ── Global backend PID for cleanup ───────────────────────
static mut BACKEND_PID: Option<u32> = None;

// ── Application State ────────────────────────────────────
struct AppState {
    window_visible: Mutex<bool>,
    update_available: Mutex<bool>,
    app_version: String,
    backend_port: Mutex<u16>,
}

impl AppState {
    fn new() -> Self {
        Self {
            window_visible: Mutex::new(false),
            update_available: Mutex::new(false),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            backend_port: Mutex::new(DEFAULT_PORT),
        }
    }
}

// ── Port Management ──────────────────────────────────────

/// Check if a TCP port is available on localhost.
fn is_port_available(port: u16) -> bool {
    use std::net::TcpListener;
    TcpListener::bind(("127.0.0.1", port)).is_ok()
}

/// Kill orphan backend processes on known ports before we start.
fn kill_orphan_backends() {
    #[cfg(target_os = "windows")]
    {
        // Check each port in range and kill any process listening on it
        for port in PORT_RANGE_START..=PORT_RANGE_END {
            if !is_port_available(port) {
                // Port is occupied — find and kill the process
                let output = std::process::Command::new("netstat")
                    .args(["-ano"])
                    .output();
                if let Ok(out) = output {
                    let stdout = String::from_utf8_lossy(&out.stdout);
                    for line in stdout.lines() {
                        if line.contains(&format!(":{} ", port))
                            && line.contains("LISTENING")
                        {
                            if let Some(pid_str) = line.split_whitespace().last() {
                                if let Ok(pid) = pid_str.parse::<u32>() {
                                    log::info!(
                                        "[desktop] Killing orphan PID {} on port {}",
                                        pid, port
                                    );
                                    let _ = std::process::Command::new("taskkill")
                                        .args(["/F", "/PID", &pid.to_string()])
                                        .output();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/// Find an available port in the range.
fn find_available_port() -> u16 {
    for port in PORT_RANGE_START..=PORT_RANGE_END {
        if is_port_available(port) {
            return port;
        }
    }
    // Fallback: OS picks a free port
    0
}

// ── Backend Process Manager ──────────────────────────────
struct BackendManager {
    backend_dir: std::path::PathBuf,
    port: u16,
}

impl BackendManager {
    fn new(port: u16) -> Result<Self, String> {
        let backend_root = Self::find_backend_dir()?;
        Ok(Self {
            backend_dir: backend_root,
            port,
        })
    }

    /// Find the backend directory by searching multiple paths.
    fn find_backend_dir() -> Result<std::path::PathBuf, String> {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_dir = exe_path.parent().unwrap_or(&exe_path);

        let candidates = vec![
            // Installed app: runtime/backend/ next to the EXE (Tauri resources)
            exe_dir.join("runtime/backend"),
            // Dev build: exe is in target/release/
            exe_dir.join("../../../backend"),
            // Dev build alternative
            exe_dir.join("../../backend"),
            // CWD fallback
            std::env::current_dir()
                .unwrap_or_default()
                .join("backend"),
        ];

        candidates
            .iter()
            .find(|p| p.join("main.js").exists() || p.join("dist").join("main.js").exists())
            .cloned()
            .ok_or_else(|| {
                let paths: Vec<String> =
                    candidates.iter().map(|p| p.display().to_string()).collect();
                format!(
                    "Backend not found. Searched: {}. Build with: pnpm run build:backend",
                    paths.join(", ")
                )
            })
    }

    /// Find the best node executable: bundled first, then system PATH.
    fn find_node_executable(&self) -> Result<std::path::PathBuf, String> {
        let exe_path = std::env::current_exe().ok();
        let exe_dir = exe_path.as_ref().and_then(|p| p.parent());

        // 1. Bundled node in the runtime directory
        let mut bundled_paths: Vec<std::path::PathBuf> = vec![];
        if let Some(ed) = exe_dir {
            // Installed app: runtime/node/node.exe next to the EXE (Tauri resources)
            bundled_paths.push(ed.join("runtime/node/node.exe"));
            // Dev build: exe is in target/release/
            bundled_paths.push(ed.join("../../../../desktop/node/win-x64/node.exe"));
        }

        for p in &bundled_paths {
            if p.exists() {
                log::info!("[desktop] Using bundled Node.js: {}", p.display());
                return Ok(p.clone());
            }
        }

        // 2. Fallback to system node
        log::warn!("[desktop] No bundled Node.js found, using system PATH");
        Ok(std::path::PathBuf::from("node"))
    }

    fn start(&self) -> Result<u32, String> {
        // Try multiple paths for main.js: dist/main.js or just main.js
        let main_js = if self.backend_dir.join("dist").join("main.js").exists() {
            self.backend_dir.join("dist").join("main.js")
        } else if self.backend_dir.join("main.js").exists() {
            self.backend_dir.join("main.js")
        } else {
            return Err(format!(
                "Backend main.js not found in {}. Build first.",
                self.backend_dir.display()
            ));
        };

        // Database path in app data directory
        let app_data = dirs_next::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("com.shranix.krushi-erp")
            .join("data");

        std::fs::create_dir_all(&app_data)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;

        let db_path = app_data.join("erp.db");
        let db_url = format!("file:{}", db_path.to_string_lossy().replace('\\', "/"));

        let node = self.find_node_executable()?;

        log::info!("[desktop] Starting backend on port {}", self.port);
        log::info!("[desktop] Database: {}", db_url);
        log::info!("[desktop] Node: {}", node.display());
        log::info!("[desktop] Backend dir: {}", self.backend_dir.display());

        let mut cmd = std::process::Command::new(&node);
        cmd.arg(&main_js)
            .env("APP_PORT", self.port.to_string())
            .env("NODE_ENV", "production")
            .env("DATABASE_PROVIDER", "sqlite")
            .env("DATABASE_URL", &db_url)
            .env(
                "JWT_SECRET",
                "shranix-offline-jwt-2024-change-in-production",
            )
            .env(
                "JWT_REFRESH_SECRET",
                "shranix-offline-refresh-2024-change-in-production",
            )
            .env("SWAGGER_ENABLED", "false")
            .env("DATABASE_LOG_LEVEL", "error")
            // Set NODE_PATH so the backend can find bundled node_modules
            .env(
                "NODE_PATH",
                self.backend_dir
                    .join("node_modules")
                    .to_string_lossy()
                    .to_string(),
            )
            .current_dir(&self.backend_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let child = cmd.spawn().map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "Node.js is not installed and no bundled runtime found. \
                 Install Node.js v20+ from https://nodejs.org/ and add it to PATH."
                    .to_string()
            } else {
                format!("Failed to start backend: {}", e)
            }
        })?;

        let pid = child.id();

        // Detach stdout/stderr
        if let Some(stdout) = child.stdout {
            std::thread::spawn(move || {
                use std::io::BufRead;
                for line in std::io::BufReader::new(stdout).lines().flatten() {
                    log::info!("[backend] {}", line);
                }
            });
        }
        if let Some(stderr) = child.stderr {
            std::thread::spawn(move || {
                use std::io::BufRead;
                for line in std::io::BufReader::new(stderr).lines().flatten() {
                    log::warn!("[backend] {}", line);
                }
            });
        }

        unsafe {
            BACKEND_PID = Some(pid);
        }

        Ok(pid)
    }
}

impl Drop for BackendManager {
    fn drop(&mut self) {
        if let Some(pid) = unsafe { BACKEND_PID } {
            log::info!("[desktop] Killing backend PID {}", pid);
            #[cfg(target_os = "windows")]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/F", "/PID", &pid.to_string()])
                    .output();
            }
            #[cfg(not(target_os = "windows"))]
            {
                let _ = std::process::Command::new("kill")
                    .args(["-9", &pid.to_string()])
                    .output();
            }
        }
    }
}

// ── Health check helper ──────────────────────────────────
fn wait_for_backend(port: u16, max_wait_secs: u64) -> bool {
    let url = format!("http://127.0.0.1:{}/v1/health/live", port);
    for _ in 0..(max_wait_secs * 10) {
        match ureq::get(&url).call() {
            Ok(response) if response.status() == 200 => return true,
            _ => {}
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    false
}

/// Spawn a health monitor thread that periodically checks if the backend is alive.
/// If the backend dies, it attempts to restart it automatically.
fn spawn_health_monitor(port: u16) {
    std::thread::spawn(move || {
        let url = format!("http://127.0.0.1:{}/v1/health/live", port);
        let mut consecutive_failures = 0u32;
        loop {
            std::thread::sleep(Duration::from_secs(10));
            match ureq::get(&url).call() {
                Ok(resp) if resp.status() == 200 => {
                    consecutive_failures = 0;
                }
                _ => {
                    consecutive_failures += 1;
                    log::warn!(
                        "[desktop] Backend health check failed ({}/3)",
                        consecutive_failures
                    );
                    if consecutive_failures >= 3 {
                        log::error!("[desktop] Backend appears dead — attempting restart");
                        match BackendManager::new(port) {
                            Ok(mgr) => {
                                if let Ok(_pid) = mgr.start() {
                                    if wait_for_backend(port, 15) {
                                        log::info!("[desktop] Backend restarted successfully");
                                        consecutive_failures = 0;
                                    }
                                }
                            }
                            Err(e) => {
                                log::error!("[desktop] Restart failed: {}", e);
                            }
                        }
                    }
                }
            }
        }
    });
}

// ── Window Manager ───────────────────────────────────────
fn setup_splash_to_main(app: &AppHandle) {
    if let Some(splash) = app.get_webview_window("splashscreen") {
        let splash_clone = splash.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(2));
            let _ = splash_clone.close();
        });
    }

    if let Some(main) = app.get_webview_window("main") {
        let main_clone = main.clone();
        std::thread::spawn(move || {
            std::thread::sleep(Duration::from_secs(3));
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
    let about = MenuItem::with_id(app, "about", "About SHRANIX Krushi ERP", true, None::<&str>)
        .unwrap();
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
    if let TrayIconEvent::Click { .. } = event {
        if let Some(window) = app.get_webview_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}

// ── IPC Commands ─────────────────────────────────────────

#[tauri::command]
fn get_app_info(state: State<AppState>) -> Result<serde_json::Value, String> {
    let port = state.backend_port.lock().map_err(|e| e.to_string())?;
    Ok(serde_json::json!({
        "name": "SHRANIX Krushi ERP",
        "version": state.app_version,
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "backendPort": *port,
        "mode": "offline",
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

#[tauri::command]
fn get_backend_status(state: State<AppState>) -> Result<serde_json::Value, String> {
    let port = state.backend_port.lock().map_err(|e| e.to_string())?;
    let url = format!("http://127.0.0.1:{}/v1/health/live", *port);
    let healthy = ureq::get(&url)
        .call()
        .map(|r| r.status() == 200)
        .unwrap_or(false);
    Ok(serde_json::json!({
        "port": *port,
        "healthy": healthy,
        "url": format!("http://127.0.0.1:{}", *port),
    }))
}

// ── Application Entry Point ──────────────────────────────
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    // ── Kill orphan backend processes from previous crashes ──
    kill_orphan_backends();

    // ── Find available port ──
    let port = find_available_port();
    if port == 0 {
        log::error!("[desktop] No available port found in range {}-{}", PORT_RANGE_START, PORT_RANGE_END);
    }
    log::info!("[desktop] Using port {}", port);

    // ── Start local backend process ──
    let backend_started = match BackendManager::new(port) {
        Ok(mgr) => match mgr.start() {
            Ok(pid) => {
                log::info!("[desktop] Backend started PID={}", pid);
                if wait_for_backend(port, 30) {
                    log::info!("[desktop] Backend healthy on port {}", port);
                } else {
                    log::warn!("[desktop] Backend health check timed out — continuing");
                }
                true
            }
            Err(e) => {
                log::error!("[desktop] Backend start failed: {}", e);
                false
            }
        },
        Err(e) => {
            log::error!("[desktop] BackendManager init failed: {}", e);
            false
        }
    };

    // ── Start health monitor thread ──
    if backend_started {
        spawn_health_monitor(port);
    }

    let app_state = AppState::new();
    if let Ok(mut port_lock) = app_state.backend_port.lock() {
        *port_lock = port;
    }

    let final_port = port;

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
        .setup(move |app| {
            // Create tray icon
            let tray_menu = create_tray_menu(app.handle());
            let _tray = tauri::tray::TrayIconBuilder::with_id("main-tray")
                .menu(&tray_menu)
                .tooltip("SHRANIX Krushi ERP")
                .build(app.handle())?;

            // Build application menu
            let menu = {
                let ah = app.handle().clone();

                let preferences = MenuItem::with_id(
                    &ah,
                    "preferences",
                    "Preferences",
                    true,
                    Some("CmdOrCtrl+,"),
                )
                .unwrap();
                let quit = MenuItem::with_id(
                    &ah,
                    "quit_menu",
                    "Quit",
                    true,
                    Some("CmdOrCtrl+Q"),
                )
                .unwrap();
                let sep = PredefinedMenuItem::separator(&ah).unwrap();
                let file_menu =
                    Submenu::with_items(&ah, "File", true, &[&preferences, &sep, &quit]).unwrap();

                let undo = MenuItem::with_id(
                    &ah,
                    "undo",
                    "Undo",
                    true,
                    Some("CmdOrCtrl+Z"),
                )
                .unwrap();
                let redo = MenuItem::with_id(
                    &ah,
                    "redo",
                    "Redo",
                    true,
                    Some("CmdOrCtrl+Shift+Z"),
                )
                .unwrap();
                let sep2 = PredefinedMenuItem::separator(&ah).unwrap();
                let cut = MenuItem::with_id(
                    &ah,
                    "cut",
                    "Cut",
                    true,
                    Some("CmdOrCtrl+X"),
                )
                .unwrap();
                let copy = MenuItem::with_id(
                    &ah,
                    "copy",
                    "Copy",
                    true,
                    Some("CmdOrCtrl+C"),
                )
                .unwrap();
                let paste = MenuItem::with_id(
                    &ah,
                    "paste",
                    "Paste",
                    true,
                    Some("CmdOrCtrl+V"),
                )
                .unwrap();
                let select_all = MenuItem::with_id(
                    &ah,
                    "select_all",
                    "Select All",
                    true,
                    Some("CmdOrCtrl+A"),
                )
                .unwrap();
                let edit_menu = Submenu::with_items(
                    &ah,
                    "Edit",
                    true,
                    &[
                        &undo, &redo, &sep2, &cut, &copy, &paste, &select_all,
                    ],
                )
                .unwrap();

                let toggle_sidebar = MenuItem::with_id(
                    &ah,
                    "toggle_sidebar",
                    "Toggle Sidebar",
                    true,
                    Some("CmdOrCtrl+B"),
                )
                .unwrap();
                let zoom_in = MenuItem::with_id(
                    &ah,
                    "zoom_in",
                    "Zoom In",
                    true,
                    Some("CmdOrCtrl+="),
                )
                .unwrap();
                let zoom_out = MenuItem::with_id(
                    &ah,
                    "zoom_out",
                    "Zoom Out",
                    true,
                    Some("CmdOrCtrl+-"),
                )
                .unwrap();
                let sep3 = PredefinedMenuItem::separator(&ah).unwrap();
                let toggle_devtools = MenuItem::with_id(
                    &ah,
                    "toggle_devtools",
                    "Toggle DevTools",
                    true,
                    Some("CmdOrCtrl+Shift+I"),
                )
                .unwrap();
                let view_menu = Submenu::with_items(
                    &ah,
                    "View",
                    true,
                    &[
                        &toggle_sidebar,
                        &zoom_in,
                        &zoom_out,
                        &sep3,
                        &toggle_devtools,
                    ],
                )
                .unwrap();

                let about = MenuItem::with_id(
                    &ah,
                    "about_menu",
                    "About SHRANIX Krushi ERP",
                    true,
                    None::<&str>,
                )
                .unwrap();
                let check_update = MenuItem::with_id(
                    &ah,
                    "check_update_menu",
                    "Check for Updates...",
                    true,
                    None::<&str>,
                )
                .unwrap();
                let documentation = MenuItem::with_id(
                    &ah,
                    "documentation",
                    "Documentation",
                    true,
                    Some("F1"),
                )
                .unwrap();
                let help_menu = Submenu::with_items(
                    &ah,
                    "Help",
                    true,
                    &[&about, &check_update, &documentation],
                )
                .unwrap();

                Menu::with_items(&ah, &[&file_menu, &edit_menu, &view_menu, &help_menu]).unwrap()
            };

            app.set_menu(menu)?;

            // Inject backend port into webview
            if let Some(window) = app.get_webview_window("main") {
                let js = format!(
                    "window.__SHRANIX_BACKEND_PORT__='{}';localStorage.setItem('shranix_backend_port','{}');",
                    final_port, final_port
                );
                window.eval(&js).ok();
            }

            setup_splash_to_main(app.handle());

            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            app.deep_link().register_all().ok();

            let _ = app.emit("app:ready", {
                let state = app.state::<AppState>();
                serde_json::json!({
                    "version": state.app_version,
                    "platform": std::env::consts::OS,
                    "mode": "offline",
                    "backendPort": final_port,
                    "backendStarted": backend_started,
                })
            });

            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "quit_menu" => {
                    if let Some(pid) = unsafe { BACKEND_PID } {
                        #[cfg(target_os = "windows")]
                        {
                            let _ = std::process::Command::new("taskkill")
                                .args(["/F", "/PID", &pid.to_string()])
                                .output();
                        }
                        #[cfg(not(target_os = "windows"))]
                        {
                            let _ = std::process::Command::new("kill")
                                .args(["-9", &pid.to_string()])
                                .output();
                        }
                    }
                    std::process::exit(0);
                }
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
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            toggle_window_visibility,
            minimize_to_tray,
            show_notification,
            get_app_data_dir,
            get_document_dir,
            check_for_updates,
            get_backend_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SHRANIX Krushi ERP");
}
