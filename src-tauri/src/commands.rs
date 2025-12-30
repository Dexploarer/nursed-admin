use tauri::{AppHandle, State};
use crate::vector_store::VectorStore;
use crate::models::{Student, Grade, ClinicalLog};
use crate::db::DbState;

// Wrapper state for vector store
pub struct VectorStoreState {
    pub store: std::sync::Mutex<Option<VectorStore>>,
}

#[tauri::command]
pub async fn init_vector_store(app: AppHandle, state: State<'_, VectorStoreState>) -> Result<(), String> {
    let store = VectorStore::new(&app).await.map_err(|e| e.to_string())?;
    store.create_table().await.map_err(|e| e.to_string())?;
    
    let mut state_store = state.store.lock().unwrap();
    *state_store = Some(store);
    Ok(())
}

#[tauri::command]
pub async fn index_document(
    state: State<'_, VectorStoreState>,
    id: String,
    text: String
) -> Result<(), String> {
    let store = {
        let guard = state.store.lock().unwrap();
        guard.as_ref().cloned()
    };

    if let Some(store) = store {
        store.index_document(&id, &text).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Vector store not initialized".to_string())
    }
}

#[tauri::command]
pub async fn search_documents(
    state: State<'_, VectorStoreState>,
    query: String
) -> Result<Vec<crate::vector_store::SearchResult>, String> {
    let store = {
        let guard = state.store.lock().unwrap();
        guard.as_ref().cloned()
    };

    if let Some(store) = store {
        store.search(&query).await.map_err(|e| e.to_string())
    } else {
        Err("Vector store not initialized".to_string())
    }
}

// SQL Commands

#[tauri::command]
pub async fn get_all_students(state: State<'_, DbState>) -> Result<Vec<Student>, String> {
    let pool = &state.db;

    // Fetch all students
    let mut students = sqlx::query_as::<_, Student>("SELECT * FROM students")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Fetch all grades
    let grades = sqlx::query_as::<_, Grade>("SELECT * FROM grades")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    // Group grades by student_id
    use std::collections::HashMap;
    let mut grades_map: HashMap<String, Vec<Grade>> = HashMap::new();
    for grade in grades {
        grades_map.entry(grade.student_id.clone()).or_default().push(grade);
    }

    // Attach grades to students
    for student in &mut students {
        if let Some(student_grades) = grades_map.remove(&student.id) {
             student.grades = Some(student_grades);
        }
    }
    
    Ok(students)
}

#[tauri::command]
pub async fn get_student_details(state: State<'_, DbState>, id: String) -> Result<Option<Student>, String> {
    let pool = &state.db;

    let mut student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(ref mut s) = student {
        // Fetch grades
        let grades = sqlx::query_as::<_, Grade>("SELECT * FROM grades WHERE student_id = ?")
            .bind(&id)
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;
            
        // Assign grades
        s.grades = Some(grades);
    }

    Ok(student)
}

#[tauri::command]
pub async fn create_student(state: State<'_, DbState>, student: Student) -> Result<(), String> {
    let pool = &state.db;
    
    sqlx::query(
        "INSERT INTO students (
            id, first_name, last_name, cohort, status, clinical_hours_completed, clinical_hours_required,
            skills_completed, nclex_predictor_score, win_probability, remediation_status, remediation_topic,
            email, phone, dob, gpa, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&student.id)
    .bind(&student.first_name)
    .bind(&student.last_name)
    .bind(&student.cohort)
    .bind(&student.status)
    .bind(&student.clinical_hours_completed)
    .bind(&student.clinical_hours_required)
    .bind(&student.skills_completed) // This works because of Json<Vec<String>>? No, student.skills_completed is Json type?
    // In `models.rs`, `skills_completed` is `Json<Vec<String>>`.
    // SQLx's `bind` handles `Json` type by serializing it to the DB JSON column logic.
    .bind(&student.nclex_predictor_score)
    .bind(&student.win_probability)
    .bind(&student.remediation_status)
    .bind(&student.remediation_topic)
    .bind(&student.email)
    .bind(&student.phone)
    .bind(&student.dob)
    .bind(&student.gpa)
    .bind(&student.notes)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Also insert grades if any?
    // The previous `enrollStudent` in `lib/db.ts` only inserted into `students`.
    // So sticking to that.

    Ok(())
}

#[tauri::command]
pub async fn update_student_notes(state: State<'_, DbState>, id: String, notes: String) -> Result<(), String> {
    sqlx::query("UPDATE students SET notes = ? WHERE id = ?")
        .bind(notes)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_clinical_log(state: State<'_, DbState>, log: ClinicalLog) -> Result<(), String> {
     sqlx::query(
        "INSERT INTO clinical_logs (
            id, student_id, date, site_name, patient_diagnosis, mapped_competencies, status, instructor_feedback
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&log.id)
    .bind(log.student_id)
    .bind(log.date)
    .bind(log.site_name)
    .bind(log.patient_diagnosis)
    .bind(log.mapped_competencies)
    .bind(log.status)
    .bind(log.instructor_feedback)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_clinical_logs(state: State<'_, DbState>, student_id: String) -> Result<Vec<ClinicalLog>, String> {
    sqlx::query_as::<_, ClinicalLog>("SELECT * FROM clinical_logs WHERE student_id = ?")
        .bind(student_id)
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_student_skills(state: State<'_, DbState>, id: String, skills: Vec<String>) -> Result<(), String> {
    // Convert skills to JSON string for storage
    let skills_json = serde_json::to_string(&skills).map_err(|e| e.to_string())?;
    
    sqlx::query("UPDATE students SET skills_completed = ? WHERE id = ?")
        .bind(skills_json)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_student_skills(state: State<'_, DbState>, id: String) -> Result<Vec<String>, String> {
    let row: Option<(String,)> = sqlx::query_as("SELECT skills_completed FROM students WHERE id = ?")
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    match row {
        Some((skills_json,)) => {
            let skills: Vec<String> = serde_json::from_str(&skills_json).unwrap_or_default();
            Ok(skills)
        }
        None => Ok(vec![])
    }
}

#[tauri::command]
pub async fn update_student(state: State<'_, DbState>, student: Student) -> Result<(), String> {
    let pool = &state.db;

    sqlx::query(
        "UPDATE students SET
            first_name = ?,
            last_name = ?,
            cohort = ?,
            status = ?,
            clinical_hours_completed = ?,
            clinical_hours_required = ?,
            skills_completed = ?,
            nclex_predictor_score = ?,
            win_probability = ?,
            remediation_status = ?,
            remediation_topic = ?,
            email = ?,
            phone = ?,
            dob = ?,
            gpa = ?,
            notes = ?
        WHERE id = ?"
    )
    .bind(&student.first_name)
    .bind(&student.last_name)
    .bind(&student.cohort)
    .bind(&student.status)
    .bind(&student.clinical_hours_completed)
    .bind(&student.clinical_hours_required)
    .bind(&student.skills_completed)
    .bind(&student.nclex_predictor_score)
    .bind(&student.win_probability)
    .bind(&student.remediation_status)
    .bind(&student.remediation_topic)
    .bind(&student.email)
    .bind(&student.phone)
    .bind(&student.dob)
    .bind(&student.gpa)
    .bind(&student.notes)
    .bind(&student.id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn approve_clinical_log(state: State<'_, DbState>, log_id: String) -> Result<(), String> {
    sqlx::query("UPDATE clinical_logs SET status = 'Approved' WHERE id = ?")
        .bind(log_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
