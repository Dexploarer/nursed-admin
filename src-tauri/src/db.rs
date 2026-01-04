use sqlx::migrate::MigrateDatabase;
use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};
use std::fs;
use tauri::AppHandle;
use tauri::Manager;

pub struct DbState {
    pub db: Pool<Sqlite>,
}

pub async fn init_db(app: &AppHandle) -> Result<Pool<Sqlite>, Box<dyn std::error::Error>> {
    let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
    fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("nursed.db");
    
    let db_url = format!("sqlite://{}", db_path.to_string_lossy());
    
    if !sqlx::Sqlite::database_exists(&db_url).await.unwrap_or(false) {
        sqlx::Sqlite::create_database(&db_url).await?;
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            cohort TEXT NOT NULL,
            status TEXT NOT NULL,
            clinical_hours_completed REAL DEFAULT 0,
            clinical_hours_required REAL DEFAULT 400,
            skills_completed TEXT NOT NULL DEFAULT '[]',
            nclex_predictor_score REAL,
            win_probability REAL,
            remediation_status TEXT,
            remediation_topic TEXT,
            email TEXT,
            phone TEXT,
            dob TEXT,
            gpa REAL,
            notes TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            photo_url TEXT
        );"
    ).execute(&pool).await?;

    // Add new columns to students if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE students ADD COLUMN emergency_contact_name TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE students ADD COLUMN emergency_contact_phone TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE students ADD COLUMN photo_url TEXT")
        .execute(&pool).await;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS grades (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            course_id TEXT NOT NULL,
            course_name TEXT NOT NULL,
            grade REAL NOT NULL,
            semester TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );"
    ).execute(&pool).await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS clinical_logs (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            site_name TEXT NOT NULL,
            patient_diagnosis TEXT NOT NULL,
            mapped_competencies TEXT NOT NULL DEFAULT '[]',
            status TEXT NOT NULL,
            instructor_feedback TEXT,
            hours REAL DEFAULT 8.0,
            is_simulation INTEGER DEFAULT 0,
            is_makeup INTEGER DEFAULT 0,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );"
    ).execute(&pool).await?;

    // Add new columns to clinical_logs if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE clinical_logs ADD COLUMN hours REAL DEFAULT 8.0")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_logs ADD COLUMN is_simulation INTEGER DEFAULT 0")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_logs ADD COLUMN is_makeup INTEGER DEFAULT 0")
        .execute(&pool).await;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            event_type TEXT NOT NULL,
            location TEXT,
            proctor TEXT,
            status TEXT,
            description TEXT
        );"
    ).execute(&pool).await?;

    // Courses table for course-level information
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS courses (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            syllabus_url TEXT,
            content_outline_url TEXT,
            clinical_manual_url TEXT,
            semester TEXT,
            year INTEGER,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // Lesson plans for Today's Teaching View (enhanced)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS lesson_plans (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            course_id TEXT,
            course_name TEXT NOT NULL,
            week_number INTEGER,
            chapter TEXT,
            topic TEXT NOT NULL,
            topics_covered TEXT,
            assessment_method TEXT,
            vbon_tags TEXT,
            notes TEXT,
            last_taught_notes TEXT,
            notes_for_next_time TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(course_id) REFERENCES courses(id)
        );"
    ).execute(&pool).await?;

    // Add new columns to lesson_plans if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN course_id TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN week_number INTEGER")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN topics_covered TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN assessment_method TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN vbon_tags TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE lesson_plans ADD COLUMN notes_for_next_time TEXT")
        .execute(&pool).await;

    // Teaching materials (links to Google Drive, YouTube, ATI, etc.)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS teaching_materials (
            id TEXT PRIMARY KEY,
            lesson_plan_id TEXT NOT NULL,
            material_type TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY(lesson_plan_id) REFERENCES lesson_plans(id)
        );"
    ).execute(&pool).await?;

    // Attendance tracking
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS attendance (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            notes TEXT,
            recorded_at TEXT NOT NULL,
            attendance_type TEXT DEFAULT 'classroom',
            hours_attended REAL,
            hours_required REAL DEFAULT 8.0,
            FOREIGN KEY(student_id) REFERENCES students(id),
            UNIQUE(student_id, date, attendance_type)
        );"
    ).execute(&pool).await?;

    // Add new columns to attendance if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE attendance ADD COLUMN attendance_type TEXT DEFAULT 'classroom'")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE attendance ADD COLUMN hours_attended REAL")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE attendance ADD COLUMN hours_required REAL DEFAULT 8.0")
        .execute(&pool).await;

    // Make-up hours tracking
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS makeup_hours (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            original_absence_id TEXT,
            hours_owed REAL NOT NULL,
            hours_completed REAL DEFAULT 0,
            reason TEXT,
            due_date TEXT,
            completion_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(original_absence_id) REFERENCES attendance(id)
        );"
    ).execute(&pool).await?;

    // Student certifications (BLS, immunizations, etc.)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS student_certifications (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            certification_type TEXT NOT NULL,
            certification_name TEXT NOT NULL,
            issue_date TEXT,
            expiry_date TEXT NOT NULL,
            status TEXT NOT NULL,
            document_url TEXT,
            notes TEXT,
            FOREIGN KEY(student_id) REFERENCES students(id)
        );"
    ).execute(&pool).await?;

    // Preceptor evaluations (from QR codes/Google Forms)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS preceptor_evaluations (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            clinical_log_id TEXT,
            preceptor_name TEXT NOT NULL,
            evaluation_date TEXT NOT NULL,
            overall_rating INTEGER,
            clinical_skills_rating INTEGER,
            professionalism_rating INTEGER,
            communication_rating INTEGER,
            comments TEXT,
            areas_for_improvement TEXT,
            strengths TEXT,
            status TEXT NOT NULL,
            submitted_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(clinical_log_id) REFERENCES clinical_logs(id)
        );"
    ).execute(&pool).await?;

    // Upcoming deadlines
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS deadlines (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            due_date TEXT NOT NULL,
            deadline_type TEXT NOT NULL,
            related_student_id TEXT,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(related_student_id) REFERENCES students(id)
        );"
    ).execute(&pool).await?;

    // Skill validations (tracks individual skill proficiency validations)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS skill_validations (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            proficiency TEXT NOT NULL,
            validated_date TEXT NOT NULL,
            validated_location TEXT,
            validated_by TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            UNIQUE(student_id, skill_id)
        );"
    ).execute(&pool).await?;

    // ==================== CLINICAL TRACKING SYSTEM ====================

    // Clinical Sites (managed list of clinical locations)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS clinical_sites (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            contact_name TEXT,
            contact_phone TEXT,
            contact_email TEXT,
            site_type TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            notes TEXT,
            created_at TEXT NOT NULL,
            unit_name TEXT,
            contact_title TEXT,
            accrediting_body TEXT,
            last_accreditation_date TEXT,
            contract_start_date TEXT,
            contract_expiration_date TEXT,
            last_used_date TEXT,
            max_students_per_day INTEGER DEFAULT 4,
            parking_info TEXT,
            dress_code TEXT
        );"
    ).execute(&pool).await?;

    // Add new VBON columns to clinical_sites if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN unit_name TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN contact_title TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN accrediting_body TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN last_accreditation_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN contract_start_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN contract_expiration_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN last_used_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN max_students_per_day INTEGER DEFAULT 4")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN parking_info TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE clinical_sites ADD COLUMN dress_code TEXT")
        .execute(&pool).await;

    // Preceptors (managed list of clinical preceptors)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS preceptors (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            credentials TEXT,
            email TEXT,
            phone TEXT,
            site_id TEXT,
            is_active INTEGER DEFAULT 1,
            notes TEXT,
            created_at TEXT NOT NULL,
            license_number TEXT,
            license_state TEXT DEFAULT 'VA',
            license_expiration_date TEXT,
            last_verification_date TEXT,
            next_verification_due TEXT,
            specialties TEXT,
            FOREIGN KEY(site_id) REFERENCES clinical_sites(id)
        );"
    ).execute(&pool).await?;

    // Add new license tracking columns to preceptors if they don't exist (for existing databases)
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN license_number TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN license_state TEXT DEFAULT 'VA'")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN license_expiration_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN last_verification_date TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN next_verification_due TEXT")
        .execute(&pool).await;
    let _ = sqlx::query("ALTER TABLE preceptors ADD COLUMN specialties TEXT")
        .execute(&pool).await;

    // Clinical Assignments (scheduled clinical rotations)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS clinical_assignments (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            site_id TEXT NOT NULL,
            preceptor_id TEXT,
            date TEXT NOT NULL,
            start_time TEXT,
            end_time TEXT,
            hours REAL DEFAULT 8.0,
            objectives TEXT,
            patient_assignment TEXT,
            status TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(site_id) REFERENCES clinical_sites(id),
            FOREIGN KEY(preceptor_id) REFERENCES preceptors(id)
        );"
    ).execute(&pool).await?;

    // VR Scenarios (configurable list of required VR simulations)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vr_scenarios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            default_hours REAL DEFAULT 1.0,
            is_required INTEGER DEFAULT 1,
            course_id TEXT,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // Student VR Completions (tracks VR scenario completions per student)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS student_vr_completions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            scenario_id TEXT NOT NULL,
            completion_date TEXT NOT NULL,
            hours REAL NOT NULL,
            score REAL,
            attempts INTEGER DEFAULT 1,
            notes TEXT,
            verified_by TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(scenario_id) REFERENCES vr_scenarios(id),
            UNIQUE(student_id, scenario_id)
        );"
    ).execute(&pool).await?;

    // Student Hour Submissions (for approval workflow)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS student_hour_submissions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            assignment_id TEXT,
            date TEXT NOT NULL,
            site_name TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            hours REAL NOT NULL,
            activities TEXT NOT NULL,
            skills_practiced TEXT,
            reflection TEXT,
            status TEXT NOT NULL,
            reviewer_feedback TEXT,
            reviewed_at TEXT,
            reviewed_by TEXT,
            submitted_at TEXT NOT NULL,
            FOREIGN KEY(student_id) REFERENCES students(id),
            FOREIGN KEY(assignment_id) REFERENCES clinical_assignments(id)
        );"
    ).execute(&pool).await?;

    // ==================== INSTRUCTOR CREDENTIALS & COMP HOURS ====================

    // Instructor certifications (BLS, RN License, etc.)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS instructor_certifications (
            id TEXT PRIMARY KEY,
            certification_type TEXT NOT NULL,
            certification_name TEXT NOT NULL,
            license_number TEXT,
            issuing_authority TEXT,
            issue_date TEXT,
            expiry_date TEXT NOT NULL,
            alert_days INTEGER NOT NULL DEFAULT 60,
            status TEXT NOT NULL,
            document_path TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // Comp hours earned (curriculum planning, training, after-hours work, etc.)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS comp_hours_earned (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            activity_type TEXT NOT NULL,
            hours REAL NOT NULL,
            notes TEXT,
            expiration_date TEXT,
            created_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // Comp hours used (left early, sick day, personal day, etc.)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS comp_hours_used (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            hours REAL NOT NULL,
            reason TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // ==================== VBON COMPLIANCE MAPPING ====================

    // VBON Regulations (Virginia Board of Nursing requirements)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vbon_regulations (
            id TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            section TEXT NOT NULL,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );"
    ).execute(&pool).await?;

    // VBON Mappings (how each regulation is covered in the curriculum)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS vbon_mappings (
            id TEXT PRIMARY KEY,
            regulation_id TEXT NOT NULL,
            syllabus_reference TEXT,
            lesson_plan_ids TEXT,
            material_links TEXT,
            assessment_method TEXT,
            clinical_experience TEXT,
            notes TEXT,
            coverage_status TEXT NOT NULL DEFAULT 'not_covered',
            last_reviewed_date TEXT,
            reviewed_by TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(regulation_id) REFERENCES vbon_regulations(id),
            UNIQUE(regulation_id)
        );"
    ).execute(&pool).await?;

    Ok(pool)
}
