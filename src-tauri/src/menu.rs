use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Runtime,
};

pub fn create_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    // File Menu
    let new_student = MenuItem::with_id(app, "new_student", "New Student", true, Some("CmdOrCtrl+N"))?;
    let import_data = MenuItem::with_id(app, "import_data", "Import Data", true, Some("CmdOrCtrl+I"))?;
    let export_reports = MenuItem::with_id(app, "export_reports", "Export Reports", true, Some("CmdOrCtrl+E"))?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, Some("CmdOrCtrl+,"))?;

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &new_student,
            &import_data,
            &export_reports,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, Some("Quit"))?,
        ],
    )?;

    // Edit Menu
    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    // View Menu
    let dashboard = MenuItem::with_id(app, "view_dashboard", "Dashboard", true, Some("CmdOrCtrl+1"))?;
    let students = MenuItem::with_id(app, "view_students", "Students", true, Some("CmdOrCtrl+2"))?;
    let clinical_logs = MenuItem::with_id(app, "view_clinical_logs", "Clinical Logs", true, Some("CmdOrCtrl+3"))?;
    let skills_matrix = MenuItem::with_id(app, "view_skills_matrix", "Skills Matrix", true, Some("CmdOrCtrl+4"))?;
    let toggle_sidebar = MenuItem::with_id(app, "toggle_sidebar", "Toggle Sidebar", true, Some("CmdOrCtrl+B"))?;

    let view_menu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &dashboard,
            &students,
            &clinical_logs,
            &skills_matrix,
            &PredefinedMenuItem::separator(app)?,
            &toggle_sidebar,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::fullscreen(app, None)?,
        ],
    )?;

    // Window Menu (macOS specific but works on all platforms)
    let window_menu = Submenu::with_items(
        app,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            #[cfg(target_os = "macos")]
            &PredefinedMenuItem::separator(app)?,
            #[cfg(target_os = "macos")]
            &MenuItem::with_id(app, "bring_all_to_front", "Bring All to Front", true, None::<&str>)?,
        ],
    )?;

    // Help Menu
    let documentation = MenuItem::with_id(app, "documentation", "Documentation", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "About NursEd Admin", true, None::<&str>)?;

    let help_menu = Submenu::with_items(
        app,
        "Help",
        true,
        &[
            &documentation,
            &PredefinedMenuItem::separator(app)?,
            &about,
        ],
    )?;

    // Build the complete menu
    let menu = Menu::with_items(
        app,
        &[
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
            &help_menu,
        ],
    )?;

    Ok(menu)
}
