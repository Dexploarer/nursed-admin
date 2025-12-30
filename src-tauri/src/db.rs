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
            notes TEXT
        );"
    ).execute(&pool).await?;

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
            FOREIGN KEY(student_id) REFERENCES students(id)
        );"
    ).execute(&pool).await?;

    Ok(pool)
}
