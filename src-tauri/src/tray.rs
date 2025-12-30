use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime,
};

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), tauri::Error> {
    // Load tray icon
    let icon_bytes = include_bytes!("../icons/32x32.png");
    let icon = Image::from_bytes(icon_bytes)?;

    // Create tray menu
    let show_hide = MenuItem::with_id(app, "tray_show_hide", "Show/Hide Window", true, None::<&str>)?;
    let dashboard = MenuItem::with_id(app, "tray_dashboard", "Dashboard", true, None::<&str>)?;
    let new_student = MenuItem::with_id(app, "tray_new_student", "New Student", true, None::<&str>)?;
    let clinical_logs = MenuItem::with_id(app, "tray_clinical_logs", "Clinical Logs", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "tray_settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "tray_quit", "Quit", true, None::<&str>)?;

    let tray_menu = Menu::with_items(
        app,
        &[
            &show_hide,
            &PredefinedMenuItem::separator(app)?,
            &dashboard,
            &new_student,
            &clinical_logs,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &quit,
        ],
    )?;

    // Build the tray icon
    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&tray_menu)
        .tooltip("NursEd Admin")
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    Ok(())
}
