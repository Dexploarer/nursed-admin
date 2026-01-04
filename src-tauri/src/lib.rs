mod commands;
mod db;
mod models;
mod vector_store;
mod menu;
mod tray;
mod event_handlers;
mod window_state;

use std::sync::Mutex;
use std::fs;
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
            // SQL Commands - Students
            commands::get_all_students,
            commands::get_student_details,
            commands::create_student,
            commands::update_student,
            commands::update_student_notes,
            commands::delete_student,
            // SQL Commands - Clinical Logs
            commands::add_clinical_log,
            commands::get_clinical_logs,
            commands::approve_clinical_log,
            commands::update_clinical_log,
            commands::delete_clinical_log,
            // SQL Commands - Skills
            commands::update_student_skills,
            commands::get_student_skills,
            // SQL Commands - Grades
            commands::add_grade,
            commands::update_grade,
            commands::delete_grade,
            // SQL Commands - Calendar Events
            commands::add_event,
            commands::get_all_events,
            commands::update_event,
            commands::delete_event,
            // SQL Commands - Lesson Plans
            commands::get_todays_lesson_plan,
            commands::get_all_lesson_plans,
            commands::create_lesson_plan,
            commands::update_lesson_plan,
            commands::delete_lesson_plan,
            // SQL Commands - Teaching Materials
            commands::add_teaching_material,
            commands::update_teaching_material,
            commands::delete_teaching_material,
            commands::get_materials_for_lesson,
            // SQL Commands - Attendance
            commands::record_attendance,
            commands::bulk_record_attendance,
            commands::get_attendance_for_date,
            commands::get_student_attendance,
            commands::get_students_with_attendance_issues,
            commands::get_student_attendance_detail,
            // SQL Commands - Makeup Hours
            commands::add_makeup_hours,
            commands::update_makeup_hours,
            commands::get_student_makeup_hours,
            commands::get_all_makeup_hours_summaries,
            commands::delete_makeup_hours,
            commands::auto_create_makeup_hours,
            // SQL Commands - Certifications
            commands::add_certification,
            commands::update_certification,
            commands::delete_certification,
            commands::get_student_certifications,
            commands::get_expiring_certifications,
            // SQL Commands - Preceptor Evaluations
            commands::add_preceptor_evaluation,
            commands::update_preceptor_evaluation,
            commands::get_pending_evaluations,
            commands::get_student_evaluations,
            commands::review_evaluation,
            // SQL Commands - Deadlines
            commands::add_deadline,
            commands::update_deadline,
            commands::delete_deadline,
            commands::get_upcoming_deadlines,
            commands::get_all_deadlines,
            commands::complete_deadline,
            // SQL Commands - Skill Validations
            commands::save_skill_validation,
            commands::get_skill_validations,
            // SQL Commands - Student Hours Summaries
            commands::get_student_hours_by_site,
            commands::get_student_simulation_summary,
            // SQL Commands - Student Flags
            commands::get_student_flags,
            // SQL Commands - Clinical Sites
            commands::add_clinical_site,
            commands::get_all_clinical_sites,
            commands::update_clinical_site,
            commands::delete_clinical_site,
            commands::get_sites_with_expiring_contracts,
            commands::get_site_usage_stats,
            commands::update_site_last_used,
            // SQL Commands - Preceptors (Clinical)
            commands::add_preceptor,
            commands::get_all_preceptors,
            commands::get_preceptors_by_site,
            commands::update_preceptor,
            commands::delete_preceptor,
            commands::verify_preceptor_license,
            commands::get_preceptors_with_details,
            commands::get_preceptors_needing_verification,
            commands::get_preceptor_by_id,
            // SQL Commands - Clinical Assignments
            commands::create_clinical_assignment,
            commands::bulk_create_assignments,
            commands::get_assignments_for_date,
            commands::get_assignments_for_week,
            commands::get_student_assignments,
            commands::update_assignment,
            commands::cancel_assignment,
            commands::complete_assignment,
            // SQL Commands - VR Scenarios
            commands::add_vr_scenario,
            commands::get_all_vr_scenarios,
            commands::update_vr_scenario,
            commands::delete_vr_scenario,
            // SQL Commands - Student VR Completions
            commands::save_vr_completion,
            commands::get_student_vr_completions,
            commands::get_student_vr_summary,
            // SQL Commands - Student Hour Submissions
            commands::submit_hours,
            commands::get_pending_submissions,
            commands::get_student_submissions,
            commands::approve_submission,
            commands::reject_submission,
            // SQL Commands - Instructor Certifications
            commands::add_instructor_certification,
            commands::update_instructor_certification,
            commands::delete_instructor_certification,
            commands::get_all_instructor_certifications,
            commands::get_instructor_certification_alerts,
            // SQL Commands - Comp Hours
            commands::add_comp_hours_earned,
            commands::get_all_comp_hours_earned,
            commands::delete_comp_hours_earned,
            commands::add_comp_hours_used,
            commands::get_all_comp_hours_used,
            commands::delete_comp_hours_used,
            commands::get_comp_hours_summary,
            commands::get_comp_hours_expiration_warnings,
            // SQL Commands - Courses
            commands::add_course,
            commands::get_all_courses,
            commands::get_course_by_id,
            commands::update_course,
            commands::delete_course,
            commands::get_lesson_plans_by_course,
            commands::get_lesson_plans_by_week,
            commands::get_lesson_plan_with_materials,
            // SQL Commands - VBON Compliance
            commands::get_all_vbon_regulations,
            commands::add_vbon_regulation,
            commands::seed_vbon_regulations,
            commands::get_vbon_regulations_with_mappings,
            commands::get_vbon_mapping,
            commands::upsert_vbon_mapping,
            commands::get_vbon_compliance_summary,
            commands::delete_vbon_mapping,
            // File Management Commands
            commands::save_file,
            commands::delete_file,
            commands::list_files,
            commands::get_file_as_base64,
            // Bulk Import Commands
            commands::import_preceptor_evaluations,
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

            // Create file storage directories
            let app_dir = handle.path().app_data_dir().expect("failed to get app data dir");
            let files_dir = app_dir.join("files");
            fs::create_dir_all(files_dir.join("student_photos")).expect("failed to create student_photos dir");
            fs::create_dir_all(files_dir.join("student_certs")).expect("failed to create student_certs dir");
            fs::create_dir_all(files_dir.join("instructor_certs")).expect("failed to create instructor_certs dir");

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
