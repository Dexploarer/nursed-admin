mod commands;
mod db;
mod models;
mod vector_store;
mod menu;
mod tray;
mod event_handlers;
mod window_state;

use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(commands::VectorStoreState {
            store: Mutex::new(None),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            // Vector Store
            commands::init_vector_store,
            commands::index_document,
            commands::search_documents,
            // SQL Commands
            commands::get_all_students,
            commands::get_student_details,
            commands::create_student,
            commands::update_student,
            commands::update_student_notes,
            commands::add_clinical_log,
            commands::get_clinical_logs,
            commands::approve_clinical_log,
            commands::update_student_skills,
            commands::get_student_skills,
        ])
        .on_menu_event(|app, event| {
            event_handlers::handle_menu_event(app, event.id().as_ref());
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let handle = app.handle();

            // Create native menu
            let menu = menu::create_menu(&handle)?;
            app.set_menu(menu)?;

            // Create system tray
            tray::create_tray(&handle)?;

            // Set up tray menu event handler
            app.on_menu_event(|app, event| {
                let event_id = event.id().as_ref();
                // Check if it's a tray event (starts with "tray_")
                if event_id.starts_with("tray_") {
                    event_handlers::handle_tray_event(app, event_id);
                } else {
                    event_handlers::handle_menu_event(app, event_id);
                }
            });

            // Get main window and set up window state
            if let Some(window) = app.get_webview_window("main") {
                // Restore window state from previous session
                let _ = window_state::restore_window_state(&window);

                // Set up listener to save window state on changes
                window_state::setup_window_state_listener(window);
            }

            // Initialize DB
            tauri::async_runtime::block_on(async move {
                let pool = db::init_db(handle).await.expect("failed to init db");
                handle.manage(db::DbState { db: pool });
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
