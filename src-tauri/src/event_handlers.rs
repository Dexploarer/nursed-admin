use tauri::{AppHandle, Emitter, Manager};

pub fn handle_menu_event(app: &AppHandle, event_id: &str) {
    println!("Menu event: {}", event_id);

    match event_id {
        // File Menu
        "new_student" => {
            let _ = app.emit("menu:new-student", ());
        }
        "import_data" => {
            let _ = app.emit("menu:import-data", ());
        }
        "export_reports" => {
            let _ = app.emit("menu:export-reports", ());
        }
        "settings" => {
            let _ = app.emit("menu:settings", ());
        }

        // View Menu
        "view_dashboard" => {
            let _ = app.emit("menu:navigate", "/");
        }
        "view_students" => {
            let _ = app.emit("menu:navigate", "/students");
        }
        "view_clinical_logs" => {
            let _ = app.emit("menu:navigate", "/clinical-logs");
        }
        "view_skills_matrix" => {
            let _ = app.emit("menu:navigate", "/skills-matrix");
        }
        "toggle_sidebar" => {
            let _ = app.emit("menu:toggle-sidebar", ());
        }

        // Help Menu
        "documentation" => {
            let _ = app.emit("menu:documentation", ());
        }
        "about" => {
            let _ = app.emit("menu:about", ());
        }

        // Window Menu (macOS)
        "bring_all_to_front" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }

        _ => {}
    }
}

pub fn handle_tray_event(app: &AppHandle, event_id: &str) {
    println!("Tray event: {}", event_id);

    match event_id {
        "tray_show_hide" => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        "tray_dashboard" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("menu:navigate", "/");
        }
        "tray_new_student" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("menu:new-student", ());
        }
        "tray_clinical_logs" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("menu:navigate", "/clinical-logs");
        }
        "tray_settings" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("menu:settings", ());
        }
        "tray_quit" => {
            app.exit(0);
        }
        _ => {}
    }
}
