use tauri::{AppHandle, Manager, State};
use crate::vector_store::VectorStore;
use crate::models::{
    Student, Grade, ClinicalLog, CalendarEvent,
    LessonPlan, TeachingMaterial, Attendance, StudentCertification,
    PreceptorEvaluation, Deadline, LessonPlanWithMaterials, AttendanceSummary, CertificationAlert,
    SkillValidation, StudentHoursBySite, StudentSimulationSummary, StudentFlag,
    MakeupHours, MakeupHoursSummary,
    InstructorCertification, InstructorCertificationAlert,
    CompHoursEarned, CompHoursUsed, CompHoursSummary, CompHoursExpirationWarning,
    Course,
    VBONRegulation, VBONMapping, VBONRegulationWithMapping, VBONComplianceSummary, VBONCategoryStats
};
use crate::db::DbState;
use std::collections::HashMap;

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
            email, phone, dob, gpa, notes, emergency_contact_name, emergency_contact_phone, photo_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&student.id)
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
    .bind(&student.emergency_contact_name)
    .bind(&student.emergency_contact_phone)
    .bind(&student.photo_url)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

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
            id, student_id, date, site_name, patient_diagnosis, mapped_competencies, status, instructor_feedback,
            hours, is_simulation, is_makeup
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&log.id)
    .bind(&log.student_id)
    .bind(&log.date)
    .bind(&log.site_name)
    .bind(&log.patient_diagnosis)
    .bind(&log.mapped_competencies)
    .bind(&log.status)
    .bind(&log.instructor_feedback)
    .bind(&log.hours.unwrap_or(8.0))
    .bind(&log.is_simulation.unwrap_or(0))
    .bind(&log.is_makeup.unwrap_or(0))
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
            notes = ?,
            emergency_contact_name = ?,
            emergency_contact_phone = ?,
            photo_url = ?
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
    .bind(&student.emergency_contact_name)
    .bind(&student.emergency_contact_phone)
    .bind(&student.photo_url)
    .bind(&student.id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Update grades if provided
    if let Some(ref grades) = student.grades {
        // Delete existing grades for this student
        sqlx::query("DELETE FROM grades WHERE student_id = ?")
            .bind(&student.id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;

        // Insert new grades
        for grade in grades {
            sqlx::query(
                "INSERT INTO grades (id, student_id, course_id, course_name, grade, semester) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&grade.id)
            .bind(&grade.student_id)
            .bind(&grade.course_id)
            .bind(&grade.course_name)
            .bind(&grade.grade)
            .bind(&grade.semester)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        }
    }

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

#[tauri::command]
pub async fn add_grade(state: State<'_, DbState>, grade: Grade) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO grades (id, student_id, course_id, course_name, grade, semester)
        VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&grade.id)
    .bind(&grade.student_id)
    .bind(&grade.course_id)
    .bind(&grade.course_name)
    .bind(&grade.grade)
    .bind(&grade.semester)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_event(state: State<'_, DbState>, event: CalendarEvent) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO calendar_events (id, date, title, event_type, location, proctor, status, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&event.id)
    .bind(&event.date)
    .bind(&event.title)
    .bind(&event.event_type)
    .bind(&event.location)
    .bind(&event.proctor)
    .bind(&event.status)
    .bind(&event.description)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_events(state: State<'_, DbState>) -> Result<Vec<CalendarEvent>, String> {
    sqlx::query_as::<_, CalendarEvent>("SELECT * FROM calendar_events ORDER BY date ASC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_event(state: State<'_, DbState>, event: CalendarEvent) -> Result<(), String> {
    sqlx::query(
        "UPDATE calendar_events SET
        date = ?, title = ?, event_type = ?, location = ?, proctor = ?, status = ?, description = ?
        WHERE id = ?"
    )
    .bind(&event.date)
    .bind(&event.title)
    .bind(&event.event_type)
    .bind(&event.location)
    .bind(&event.proctor)
    .bind(&event.status)
    .bind(&event.description)
    .bind(&event.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_event(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM calendar_events WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_student(state: State<'_, DbState>, id: String) -> Result<(), String> {
    // Delete associated grades first (foreign key constraint)
    sqlx::query("DELETE FROM grades WHERE student_id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    // Delete associated clinical logs
    sqlx::query("DELETE FROM clinical_logs WHERE student_id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    
    // Delete student
    sqlx::query("DELETE FROM students WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_clinical_log(state: State<'_, DbState>, log_id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM clinical_logs WHERE id = ?")
        .bind(log_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_clinical_log(state: State<'_, DbState>, log: ClinicalLog) -> Result<(), String> {
    sqlx::query(
        "UPDATE clinical_logs SET
        student_id = ?, date = ?, site_name = ?, patient_diagnosis = ?, mapped_competencies = ?, status = ?, instructor_feedback = ?,
        hours = ?, is_simulation = ?, is_makeup = ?
        WHERE id = ?"
    )
    .bind(&log.student_id)
    .bind(&log.date)
    .bind(&log.site_name)
    .bind(&log.patient_diagnosis)
    .bind(&log.mapped_competencies)
    .bind(&log.status)
    .bind(&log.instructor_feedback)
    .bind(&log.hours.unwrap_or(8.0))
    .bind(&log.is_simulation.unwrap_or(0))
    .bind(&log.is_makeup.unwrap_or(0))
    .bind(&log.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_grade(state: State<'_, DbState>, grade_id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM grades WHERE id = ?")
        .bind(grade_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_grade(state: State<'_, DbState>, grade: Grade) -> Result<(), String> {
    sqlx::query(
        "UPDATE grades SET
        student_id = ?, course_id = ?, course_name = ?, grade = ?, semester = ?
        WHERE id = ?"
    )
    .bind(&grade.student_id)
    .bind(&grade.course_id)
    .bind(&grade.course_name)
    .bind(&grade.grade)
    .bind(&grade.semester)
    .bind(&grade.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== LESSON PLANS ====================

#[tauri::command]
pub async fn get_todays_lesson_plan(state: State<'_, DbState>, date: String) -> Result<Option<LessonPlanWithMaterials>, String> {
    let pool = &state.db;

    let lesson = sqlx::query_as::<_, LessonPlan>(
        "SELECT * FROM lesson_plans WHERE date = ? LIMIT 1"
    )
    .bind(&date)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    if let Some(plan) = lesson {
        let materials = sqlx::query_as::<_, TeachingMaterial>(
            "SELECT * FROM teaching_materials WHERE lesson_plan_id = ? ORDER BY sort_order ASC"
        )
        .bind(&plan.id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        // Fetch course details if course_id is set
        let course = if let Some(ref course_id) = plan.course_id {
            sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = ?")
                .bind(course_id)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };

        Ok(Some(LessonPlanWithMaterials {
            plan,
            materials,
            course,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn get_all_lesson_plans(state: State<'_, DbState>) -> Result<Vec<LessonPlan>, String> {
    sqlx::query_as::<_, LessonPlan>("SELECT * FROM lesson_plans ORDER BY date DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_lesson_plan(state: State<'_, DbState>, lesson_plan: LessonPlan) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO lesson_plans (id, date, course_id, course_name, week_number, chapter, topic, topics_covered, assessment_method, vbon_tags, notes, last_taught_notes, notes_for_next_time, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&lesson_plan.id)
    .bind(&lesson_plan.date)
    .bind(&lesson_plan.course_id)
    .bind(&lesson_plan.course_name)
    .bind(&lesson_plan.week_number)
    .bind(&lesson_plan.chapter)
    .bind(&lesson_plan.topic)
    .bind(&lesson_plan.topics_covered)
    .bind(&lesson_plan.assessment_method)
    .bind(&lesson_plan.vbon_tags)
    .bind(&lesson_plan.notes)
    .bind(&lesson_plan.last_taught_notes)
    .bind(&lesson_plan.notes_for_next_time)
    .bind(&lesson_plan.created_at)
    .bind(&lesson_plan.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_lesson_plan(state: State<'_, DbState>, lesson_plan: LessonPlan) -> Result<(), String> {
    sqlx::query(
        "UPDATE lesson_plans SET
        date = ?, course_id = ?, course_name = ?, week_number = ?, chapter = ?, topic = ?, topics_covered = ?, assessment_method = ?, vbon_tags = ?, notes = ?, last_taught_notes = ?, notes_for_next_time = ?, updated_at = ?
        WHERE id = ?"
    )
    .bind(&lesson_plan.date)
    .bind(&lesson_plan.course_id)
    .bind(&lesson_plan.course_name)
    .bind(&lesson_plan.week_number)
    .bind(&lesson_plan.chapter)
    .bind(&lesson_plan.topic)
    .bind(&lesson_plan.topics_covered)
    .bind(&lesson_plan.assessment_method)
    .bind(&lesson_plan.vbon_tags)
    .bind(&lesson_plan.notes)
    .bind(&lesson_plan.last_taught_notes)
    .bind(&lesson_plan.notes_for_next_time)
    .bind(&lesson_plan.updated_at)
    .bind(&lesson_plan.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_lesson_plan(state: State<'_, DbState>, id: String) -> Result<(), String> {
    // Delete associated materials first
    sqlx::query("DELETE FROM teaching_materials WHERE lesson_plan_id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query("DELETE FROM lesson_plans WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== TEACHING MATERIALS ====================

#[tauri::command]
pub async fn add_teaching_material(state: State<'_, DbState>, material: TeachingMaterial) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO teaching_materials (id, lesson_plan_id, material_type, title, url, description, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&material.id)
    .bind(&material.lesson_plan_id)
    .bind(&material.material_type)
    .bind(&material.title)
    .bind(&material.url)
    .bind(&material.description)
    .bind(&material.sort_order)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_teaching_material(state: State<'_, DbState>, material: TeachingMaterial) -> Result<(), String> {
    sqlx::query(
        "UPDATE teaching_materials SET
        lesson_plan_id = ?, material_type = ?, title = ?, url = ?, description = ?, sort_order = ?
        WHERE id = ?"
    )
    .bind(&material.lesson_plan_id)
    .bind(&material.material_type)
    .bind(&material.title)
    .bind(&material.url)
    .bind(&material.description)
    .bind(&material.sort_order)
    .bind(&material.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_teaching_material(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM teaching_materials WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_materials_for_lesson(state: State<'_, DbState>, lesson_plan_id: String) -> Result<Vec<TeachingMaterial>, String> {
    sqlx::query_as::<_, TeachingMaterial>(
        "SELECT * FROM teaching_materials WHERE lesson_plan_id = ? ORDER BY sort_order ASC"
    )
    .bind(lesson_plan_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

// ==================== ATTENDANCE ====================

#[tauri::command]
pub async fn record_attendance(state: State<'_, DbState>, attendance: Attendance) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO attendance (id, student_id, date, status, notes, recorded_at, attendance_type, hours_attended, hours_required)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&attendance.id)
    .bind(&attendance.student_id)
    .bind(&attendance.date)
    .bind(&attendance.status)
    .bind(&attendance.notes)
    .bind(&attendance.recorded_at)
    .bind(&attendance.attendance_type.as_deref().unwrap_or("classroom"))
    .bind(&attendance.hours_attended)
    .bind(&attendance.hours_required.unwrap_or(8.0))
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn bulk_record_attendance(state: State<'_, DbState>, records: Vec<Attendance>) -> Result<(), String> {
    for record in records {
        sqlx::query(
            "INSERT OR REPLACE INTO attendance (id, student_id, date, status, notes, recorded_at, attendance_type, hours_attended, hours_required)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&record.id)
        .bind(&record.student_id)
        .bind(&record.date)
        .bind(&record.status)
        .bind(&record.notes)
        .bind(&record.recorded_at)
        .bind(&record.attendance_type.as_deref().unwrap_or("classroom"))
        .bind(&record.hours_attended)
        .bind(&record.hours_required.unwrap_or(8.0))
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_attendance_for_date(state: State<'_, DbState>, date: String) -> Result<Vec<Attendance>, String> {
    sqlx::query_as::<_, Attendance>(
        "SELECT * FROM attendance WHERE date = ?"
    )
    .bind(date)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_student_attendance(state: State<'_, DbState>, student_id: String) -> Result<Vec<Attendance>, String> {
    sqlx::query_as::<_, Attendance>(
        "SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_students_with_attendance_issues(state: State<'_, DbState>, min_absences: i32) -> Result<Vec<AttendanceSummary>, String> {
    let pool = &state.db;

    // Get all students first
    let students = sqlx::query_as::<_, Student>("SELECT * FROM students")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();

    for student in students {
        let absences: (i32,) = sqlx::query_as(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND status = 'Absent'"
        )
        .bind(&student.id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        let tardies: (i32,) = sqlx::query_as(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND status = 'Tardy'"
        )
        .bind(&student.id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        let present: (i32,) = sqlx::query_as(
            "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND status = 'Present'"
        )
        .bind(&student.id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        if absences.0 >= min_absences {
            summaries.push(AttendanceSummary {
                student_id: student.id.clone(),
                student_name: format!("{} {}", student.first_name, student.last_name),
                total_absences: absences.0,
                total_tardies: tardies.0,
                total_present: present.0,
            });
        }
    }

    // Sort by total_absences descending
    summaries.sort_by(|a, b| b.total_absences.cmp(&a.total_absences));

    Ok(summaries)
}

#[tauri::command]
pub async fn get_student_attendance_detail(state: State<'_, DbState>, student_id: String) -> Result<Vec<Attendance>, String> {
    sqlx::query_as::<_, Attendance>(
        "SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

// ==================== MAKEUP HOURS ====================

#[tauri::command]
pub async fn add_makeup_hours(state: State<'_, DbState>, record: MakeupHours) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO makeup_hours (id, student_id, original_absence_id, hours_owed, hours_completed, reason, due_date, completion_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&record.id)
    .bind(&record.student_id)
    .bind(&record.original_absence_id)
    .bind(&record.hours_owed)
    .bind(&record.hours_completed)
    .bind(&record.reason)
    .bind(&record.due_date)
    .bind(&record.completion_date)
    .bind(&record.status)
    .bind(&record.notes)
    .bind(&record.created_at)
    .bind(&record.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_makeup_hours(state: State<'_, DbState>, record: MakeupHours) -> Result<(), String> {
    sqlx::query(
        "UPDATE makeup_hours SET
        hours_completed = ?, completion_date = ?, status = ?, notes = ?, updated_at = ?
        WHERE id = ?"
    )
    .bind(&record.hours_completed)
    .bind(&record.completion_date)
    .bind(&record.status)
    .bind(&record.notes)
    .bind(&record.updated_at)
    .bind(&record.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_student_makeup_hours(state: State<'_, DbState>, student_id: String) -> Result<Vec<MakeupHours>, String> {
    sqlx::query_as::<_, MakeupHours>(
        "SELECT * FROM makeup_hours WHERE student_id = ? ORDER BY created_at DESC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_makeup_hours_summaries(state: State<'_, DbState>) -> Result<Vec<MakeupHoursSummary>, String> {
    let pool = &state.db;

    // Get all students with makeup hours
    let students = sqlx::query_as::<_, Student>("SELECT * FROM students")
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut summaries = Vec::new();

    for student in students {
        let records = sqlx::query_as::<_, MakeupHours>(
            "SELECT * FROM makeup_hours WHERE student_id = ? ORDER BY created_at DESC"
        )
        .bind(&student.id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        if !records.is_empty() {
            let total_owed: f64 = records.iter().map(|r| r.hours_owed).sum();
            let total_completed: f64 = records.iter().map(|r| r.hours_completed).sum();

            summaries.push(MakeupHoursSummary {
                student_id: student.id.clone(),
                student_name: format!("{} {}", student.first_name, student.last_name),
                total_hours_owed: total_owed,
                total_hours_completed: total_completed,
                balance_remaining: total_owed - total_completed,
                records,
            });
        }
    }

    // Sort by balance_remaining descending (most hours owed first)
    summaries.sort_by(|a, b| b.balance_remaining.partial_cmp(&a.balance_remaining).unwrap_or(std::cmp::Ordering::Equal));

    Ok(summaries)
}

#[tauri::command]
pub async fn delete_makeup_hours(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM makeup_hours WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn auto_create_makeup_hours(
    state: State<'_, DbState>,
    attendance_id: String,
    student_id: String,
    hours_missed: f64,
    reason: Option<String>
) -> Result<MakeupHours, String> {
    let now = chrono::Utc::now().to_rfc3339();
    let id = format!("MKP-{}", uuid::Uuid::new_v4().to_string());

    // Default due date is 30 days from now
    let due_date = chrono::Utc::now()
        .checked_add_signed(chrono::TimeDelta::try_days(30).unwrap())
        .map(|d| d.format("%Y-%m-%d").to_string());

    let record = MakeupHours {
        id: id.clone(),
        student_id: student_id.clone(),
        original_absence_id: Some(attendance_id),
        hours_owed: hours_missed,
        hours_completed: 0.0,
        reason,
        due_date,
        completion_date: None,
        status: "pending".to_string(),
        notes: None,
        created_at: now.clone(),
        updated_at: now,
    };

    sqlx::query(
        "INSERT INTO makeup_hours (id, student_id, original_absence_id, hours_owed, hours_completed, reason, due_date, completion_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&record.id)
    .bind(&record.student_id)
    .bind(&record.original_absence_id)
    .bind(&record.hours_owed)
    .bind(&record.hours_completed)
    .bind(&record.reason)
    .bind(&record.due_date)
    .bind(&record.completion_date)
    .bind(&record.status)
    .bind(&record.notes)
    .bind(&record.created_at)
    .bind(&record.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    Ok(record)
}

// ==================== CERTIFICATIONS ====================

#[tauri::command]
pub async fn add_certification(state: State<'_, DbState>, cert: StudentCertification) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO student_certifications (id, student_id, certification_type, certification_name, issue_date, expiry_date, status, document_url, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&cert.id)
    .bind(&cert.student_id)
    .bind(&cert.certification_type)
    .bind(&cert.certification_name)
    .bind(&cert.issue_date)
    .bind(&cert.expiry_date)
    .bind(&cert.status)
    .bind(&cert.document_url)
    .bind(&cert.notes)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_certification(state: State<'_, DbState>, cert: StudentCertification) -> Result<(), String> {
    sqlx::query(
        "UPDATE student_certifications SET
        student_id = ?, certification_type = ?, certification_name = ?, issue_date = ?, expiry_date = ?, status = ?, document_url = ?, notes = ?
        WHERE id = ?"
    )
    .bind(&cert.student_id)
    .bind(&cert.certification_type)
    .bind(&cert.certification_name)
    .bind(&cert.issue_date)
    .bind(&cert.expiry_date)
    .bind(&cert.status)
    .bind(&cert.document_url)
    .bind(&cert.notes)
    .bind(&cert.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_certification(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM student_certifications WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_student_certifications(state: State<'_, DbState>, student_id: String) -> Result<Vec<StudentCertification>, String> {
    sqlx::query_as::<_, StudentCertification>(
        "SELECT * FROM student_certifications WHERE student_id = ? ORDER BY expiry_date ASC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_expiring_certifications(state: State<'_, DbState>, days_ahead: i32) -> Result<Vec<CertificationAlert>, String> {
    let pool = &state.db;

    // Get current date in ISO format
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // Calculate date X days from now
    let future_date = chrono::Utc::now()
        .checked_add_signed(chrono::TimeDelta::try_days(days_ahead as i64).unwrap())
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();

    let certs = sqlx::query_as::<_, StudentCertification>(
        "SELECT * FROM student_certifications
         WHERE expiry_date >= ? AND expiry_date <= ?
         ORDER BY expiry_date ASC"
    )
    .bind(&today)
    .bind(&future_date)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut alerts = Vec::new();

    for cert in certs {
        // Get student name
        let student: Option<Student> = sqlx::query_as(
            "SELECT * FROM students WHERE id = ?"
        )
        .bind(&cert.student_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        if let Some(s) = student {
            // Calculate days until expiry
            let expiry = chrono::NaiveDate::parse_from_str(&cert.expiry_date, "%Y-%m-%d")
                .unwrap_or_else(|_| chrono::Utc::now().date_naive());
            let today_date = chrono::Utc::now().date_naive();
            let days_until = (expiry - today_date).num_days() as i32;

            alerts.push(CertificationAlert {
                certification: cert,
                student_name: format!("{} {}", s.first_name, s.last_name),
                days_until_expiry: days_until,
            });
        }
    }

    Ok(alerts)
}

// ==================== PRECEPTOR EVALUATIONS ====================

#[tauri::command]
pub async fn add_preceptor_evaluation(state: State<'_, DbState>, eval: PreceptorEvaluation) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO preceptor_evaluations (id, student_id, clinical_log_id, preceptor_name, evaluation_date, overall_rating, clinical_skills_rating, professionalism_rating, communication_rating, comments, areas_for_improvement, strengths, status, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&eval.id)
    .bind(&eval.student_id)
    .bind(&eval.clinical_log_id)
    .bind(&eval.preceptor_name)
    .bind(&eval.evaluation_date)
    .bind(&eval.overall_rating)
    .bind(&eval.clinical_skills_rating)
    .bind(&eval.professionalism_rating)
    .bind(&eval.communication_rating)
    .bind(&eval.comments)
    .bind(&eval.areas_for_improvement)
    .bind(&eval.strengths)
    .bind(&eval.status)
    .bind(&eval.submitted_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_preceptor_evaluation(state: State<'_, DbState>, eval: PreceptorEvaluation) -> Result<(), String> {
    sqlx::query(
        "UPDATE preceptor_evaluations SET
        student_id = ?, clinical_log_id = ?, preceptor_name = ?, evaluation_date = ?, overall_rating = ?, clinical_skills_rating = ?, professionalism_rating = ?, communication_rating = ?, comments = ?, areas_for_improvement = ?, strengths = ?, status = ?
        WHERE id = ?"
    )
    .bind(&eval.student_id)
    .bind(&eval.clinical_log_id)
    .bind(&eval.preceptor_name)
    .bind(&eval.evaluation_date)
    .bind(&eval.overall_rating)
    .bind(&eval.clinical_skills_rating)
    .bind(&eval.professionalism_rating)
    .bind(&eval.communication_rating)
    .bind(&eval.comments)
    .bind(&eval.areas_for_improvement)
    .bind(&eval.strengths)
    .bind(&eval.status)
    .bind(&eval.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_pending_evaluations(state: State<'_, DbState>) -> Result<Vec<PreceptorEvaluation>, String> {
    sqlx::query_as::<_, PreceptorEvaluation>(
        "SELECT * FROM preceptor_evaluations WHERE status = 'Pending' ORDER BY submitted_at DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_student_evaluations(state: State<'_, DbState>, student_id: String) -> Result<Vec<PreceptorEvaluation>, String> {
    sqlx::query_as::<_, PreceptorEvaluation>(
        "SELECT * FROM preceptor_evaluations WHERE student_id = ? ORDER BY evaluation_date DESC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn review_evaluation(state: State<'_, DbState>, id: String, status: String) -> Result<(), String> {
    sqlx::query("UPDATE preceptor_evaluations SET status = ? WHERE id = ?")
        .bind(status)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== DEADLINES ====================

#[tauri::command]
pub async fn add_deadline(state: State<'_, DbState>, deadline: Deadline) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO deadlines (id, title, description, due_date, deadline_type, related_student_id, status, priority, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&deadline.id)
    .bind(&deadline.title)
    .bind(&deadline.description)
    .bind(&deadline.due_date)
    .bind(&deadline.deadline_type)
    .bind(&deadline.related_student_id)
    .bind(&deadline.status)
    .bind(&deadline.priority)
    .bind(&deadline.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_deadline(state: State<'_, DbState>, deadline: Deadline) -> Result<(), String> {
    sqlx::query(
        "UPDATE deadlines SET
        title = ?, description = ?, due_date = ?, deadline_type = ?, related_student_id = ?, status = ?, priority = ?
        WHERE id = ?"
    )
    .bind(&deadline.title)
    .bind(&deadline.description)
    .bind(&deadline.due_date)
    .bind(&deadline.deadline_type)
    .bind(&deadline.related_student_id)
    .bind(&deadline.status)
    .bind(&deadline.priority)
    .bind(&deadline.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_deadline(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM deadlines WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_upcoming_deadlines(state: State<'_, DbState>, days_ahead: i32) -> Result<Vec<Deadline>, String> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let future_date = chrono::Utc::now()
        .checked_add_signed(chrono::TimeDelta::try_days(days_ahead as i64).unwrap())
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();

    sqlx::query_as::<_, Deadline>(
        "SELECT * FROM deadlines
         WHERE due_date >= ? AND due_date <= ? AND status != 'Completed'
         ORDER BY due_date ASC, priority DESC"
    )
    .bind(today)
    .bind(future_date)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_deadlines(state: State<'_, DbState>) -> Result<Vec<Deadline>, String> {
    sqlx::query_as::<_, Deadline>("SELECT * FROM deadlines ORDER BY due_date ASC")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn complete_deadline(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("UPDATE deadlines SET status = 'Completed' WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== SKILL VALIDATIONS ====================

#[tauri::command]
pub async fn save_skill_validation(state: State<'_, DbState>, validation: SkillValidation) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO skill_validations (
            id, student_id, skill_id, proficiency, validated_date, validated_location, validated_by, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&validation.id)
    .bind(&validation.student_id)
    .bind(&validation.skill_id)
    .bind(&validation.proficiency)
    .bind(&validation.validated_date)
    .bind(&validation.validated_location)
    .bind(&validation.validated_by)
    .bind(&validation.notes)
    .bind(&validation.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_skill_validations(state: State<'_, DbState>, student_id: String) -> Result<Vec<SkillValidation>, String> {
    sqlx::query_as::<_, SkillValidation>(
        "SELECT * FROM skill_validations WHERE student_id = ? ORDER BY validated_date DESC"
    )
    .bind(student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

// ==================== STUDENT HOURS SUMMARIES ====================

#[tauri::command]
pub async fn get_student_hours_by_site(state: State<'_, DbState>, student_id: String) -> Result<Vec<StudentHoursBySite>, String> {
    let pool = &state.db;

    // Get all approved clinical logs for the student
    let logs = sqlx::query_as::<_, ClinicalLog>(
        "SELECT * FROM clinical_logs WHERE student_id = ? AND status = 'Approved'"
    )
    .bind(&student_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Group hours by site
    let mut site_hours: HashMap<String, (f64, f64)> = HashMap::new(); // (direct_hours, sim_hours)

    for log in logs {
        let hours = log.hours.unwrap_or(8.0);
        let is_sim = log.is_simulation.unwrap_or(0) == 1;
        let entry = site_hours.entry(log.site_name.clone()).or_insert((0.0, 0.0));

        if is_sim {
            entry.1 += hours;
        } else {
            entry.0 += hours;
        }
    }

    // Convert to result format
    let result: Vec<StudentHoursBySite> = site_hours
        .into_iter()
        .map(|(site_name, (direct_hours, sim_hours))| StudentHoursBySite {
            site_name,
            direct_hours,
            sim_hours,
            total_hours: direct_hours + sim_hours,
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub async fn get_student_simulation_summary(state: State<'_, DbState>, student_id: String) -> Result<StudentSimulationSummary, String> {
    let pool = &state.db;

    // Get all approved clinical logs for the student
    let logs = sqlx::query_as::<_, ClinicalLog>(
        "SELECT * FROM clinical_logs WHERE student_id = ? AND status = 'Approved'"
    )
    .bind(&student_id)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut total_hours = 0.0;
    let mut sim_hours = 0.0;
    let mut direct_hours = 0.0;

    for log in logs {
        let hours = log.hours.unwrap_or(8.0);
        let is_sim = log.is_simulation.unwrap_or(0) == 1;

        total_hours += hours;
        if is_sim {
            sim_hours += hours;
        } else {
            direct_hours += hours;
        }
    }

    let sim_percentage = if total_hours > 0.0 {
        (sim_hours / total_hours) * 100.0
    } else {
        0.0
    };

    // Compliance check: simulation hours should not exceed 50% of total clinical hours
    let is_compliant = sim_percentage <= 50.0;

    Ok(StudentSimulationSummary {
        total_hours,
        sim_hours,
        direct_hours,
        sim_percentage,
        is_compliant,
    })
}

// ==================== STUDENT FLAGS (COMPLIANCE ISSUES) ====================

#[tauri::command]
pub async fn get_student_flags(state: State<'_, DbState>, student_id: String) -> Result<Vec<StudentFlag>, String> {
    let pool = &state.db;
    let mut flags: Vec<StudentFlag> = Vec::new();

    // Get student details
    let student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
        .bind(&student_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    let student = match student {
        Some(s) => s,
        None => return Err("Student not found".to_string()),
    };

    // Check clinical hours progress
    let hours_remaining = student.clinical_hours_required - student.clinical_hours_completed;
    if hours_remaining > 0.0 && student.clinical_hours_completed < student.clinical_hours_required * 0.25 {
        flags.push(StudentFlag {
            flag_type: "clinical_hours".to_string(),
            message: format!("Clinical hours behind schedule: {:.1}/{:.1} hours completed",
                student.clinical_hours_completed, student.clinical_hours_required),
            severity: "warning".to_string(),
            related_id: None,
        });
    }

    // Check simulation compliance
    let sim_summary = get_student_simulation_summary(state.clone(), student_id.clone()).await?;
    if !sim_summary.is_compliant {
        flags.push(StudentFlag {
            flag_type: "simulation_compliance".to_string(),
            message: format!("Simulation hours exceed 50% of total: {:.1}%", sim_summary.sim_percentage),
            severity: "error".to_string(),
            related_id: None,
        });
    }

    // Check GPA
    if let Some(gpa) = student.gpa {
        if gpa < 2.5 {
            flags.push(StudentFlag {
                flag_type: "gpa".to_string(),
                message: format!("GPA below minimum requirement: {:.2}", gpa),
                severity: "error".to_string(),
                related_id: None,
            });
        } else if gpa < 3.0 {
            flags.push(StudentFlag {
                flag_type: "gpa".to_string(),
                message: format!("GPA approaching minimum requirement: {:.2}", gpa),
                severity: "warning".to_string(),
                related_id: None,
            });
        }
    }

    // Check NCLEX predictor score
    if let Some(nclex_score) = student.nclex_predictor_score {
        if nclex_score < 60.0 {
            flags.push(StudentFlag {
                flag_type: "nclex_predictor".to_string(),
                message: format!("NCLEX predictor score below threshold: {:.1}%", nclex_score),
                severity: "error".to_string(),
                related_id: None,
            });
        } else if nclex_score < 70.0 {
            flags.push(StudentFlag {
                flag_type: "nclex_predictor".to_string(),
                message: format!("NCLEX predictor score needs improvement: {:.1}%", nclex_score),
                severity: "warning".to_string(),
                related_id: None,
            });
        }
    }

    // Check remediation status
    if let Some(ref status) = student.remediation_status {
        if status == "Required" || status == "In Progress" {
            flags.push(StudentFlag {
                flag_type: "remediation".to_string(),
                message: format!("Remediation {}: {}", status.to_lowercase(),
                    student.remediation_topic.as_deref().unwrap_or("Unknown topic")),
                severity: if status == "Required" { "error" } else { "warning" }.to_string(),
                related_id: None,
            });
        }
    }

    // Check attendance issues
    let absences: (i32,) = sqlx::query_as(
        "SELECT COUNT(*) FROM attendance WHERE student_id = ? AND status = 'Absent'"
    )
    .bind(&student_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    if absences.0 >= 5 {
        flags.push(StudentFlag {
            flag_type: "attendance".to_string(),
            message: format!("Excessive absences: {} absences recorded", absences.0),
            severity: "error".to_string(),
            related_id: None,
        });
    } else if absences.0 >= 3 {
        flags.push(StudentFlag {
            flag_type: "attendance".to_string(),
            message: format!("Multiple absences: {} absences recorded", absences.0),
            severity: "warning".to_string(),
            related_id: None,
        });
    }

    // Check for expiring certifications (within 30 days)
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let future_date = chrono::Utc::now()
        .checked_add_signed(chrono::TimeDelta::try_days(30).unwrap())
        .unwrap()
        .format("%Y-%m-%d")
        .to_string();

    let expiring_certs = sqlx::query_as::<_, StudentCertification>(
        "SELECT * FROM student_certifications
         WHERE student_id = ? AND expiry_date >= ? AND expiry_date <= ?"
    )
    .bind(&student_id)
    .bind(&today)
    .bind(&future_date)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    for cert in expiring_certs {
        let expiry = chrono::NaiveDate::parse_from_str(&cert.expiry_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Utc::now().date_naive());
        let today_date = chrono::Utc::now().date_naive();
        let days_until = (expiry - today_date).num_days();

        flags.push(StudentFlag {
            flag_type: "certification".to_string(),
            message: format!("{} expires in {} days", cert.certification_name, days_until),
            severity: if days_until <= 7 { "error" } else { "warning" }.to_string(),
            related_id: Some(cert.id),
        });
    }

    // Check for expired certifications
    let expired_certs = sqlx::query_as::<_, StudentCertification>(
        "SELECT * FROM student_certifications
         WHERE student_id = ? AND expiry_date < ?"
    )
    .bind(&student_id)
    .bind(&today)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    for cert in expired_certs {
        flags.push(StudentFlag {
            flag_type: "certification".to_string(),
            message: format!("{} has expired", cert.certification_name),
            severity: "error".to_string(),
            related_id: Some(cert.id),
        });
    }

    Ok(flags)
}

// ==================== CLINICAL TRACKING SYSTEM ====================

// Clinical Sites Commands

#[tauri::command]
pub async fn add_clinical_site(state: State<'_, DbState>, site: crate::models::ClinicalSite) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO clinical_sites (
            id, name, address, contact_name, contact_phone, contact_email,
            site_type, is_active, notes, created_at,
            unit_name, contact_title, accrediting_body, last_accreditation_date,
            contract_start_date, contract_expiration_date, last_used_date,
            max_students_per_day, parking_info, dress_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&site.id)
    .bind(&site.name)
    .bind(&site.address)
    .bind(&site.contact_name)
    .bind(&site.contact_phone)
    .bind(&site.contact_email)
    .bind(&site.site_type)
    .bind(site.is_active.unwrap_or(1))
    .bind(&site.notes)
    .bind(&site.created_at)
    .bind(&site.unit_name)
    .bind(&site.contact_title)
    .bind(&site.accrediting_body)
    .bind(&site.last_accreditation_date)
    .bind(&site.contract_start_date)
    .bind(&site.contract_expiration_date)
    .bind(&site.last_used_date)
    .bind(site.max_students_per_day.unwrap_or(4))
    .bind(&site.parking_info)
    .bind(&site.dress_code)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_clinical_sites(state: State<'_, DbState>) -> Result<Vec<crate::models::ClinicalSite>, String> {
    sqlx::query_as::<_, crate::models::ClinicalSite>(
        "SELECT * FROM clinical_sites WHERE is_active = 1 ORDER BY name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_clinical_site(state: State<'_, DbState>, site: crate::models::ClinicalSite) -> Result<(), String> {
    sqlx::query(
        "UPDATE clinical_sites SET
            name = ?, address = ?, contact_name = ?, contact_phone = ?,
            contact_email = ?, site_type = ?, is_active = ?, notes = ?,
            unit_name = ?, contact_title = ?, accrediting_body = ?, last_accreditation_date = ?,
            contract_start_date = ?, contract_expiration_date = ?, last_used_date = ?,
            max_students_per_day = ?, parking_info = ?, dress_code = ?
        WHERE id = ?"
    )
    .bind(&site.name)
    .bind(&site.address)
    .bind(&site.contact_name)
    .bind(&site.contact_phone)
    .bind(&site.contact_email)
    .bind(&site.site_type)
    .bind(site.is_active.unwrap_or(1))
    .bind(&site.notes)
    .bind(&site.unit_name)
    .bind(&site.contact_title)
    .bind(&site.accrediting_body)
    .bind(&site.last_accreditation_date)
    .bind(&site.contract_start_date)
    .bind(&site.contract_expiration_date)
    .bind(&site.last_used_date)
    .bind(site.max_students_per_day.unwrap_or(4))
    .bind(&site.parking_info)
    .bind(&site.dress_code)
    .bind(&site.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_clinical_site(state: State<'_, DbState>, id: String) -> Result<(), String> {
    // Soft delete by setting is_active to 0
    sqlx::query("UPDATE clinical_sites SET is_active = 0 WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_sites_with_expiring_contracts(state: State<'_, DbState>, days_threshold: i32) -> Result<Vec<crate::models::ClinicalSite>, String> {
    // Get sites with contracts expiring within the threshold (default 90 days)
    sqlx::query_as::<_, crate::models::ClinicalSite>(
        "SELECT * FROM clinical_sites
         WHERE is_active = 1
         AND contract_expiration_date IS NOT NULL
         AND contract_expiration_date != ''
         AND date(contract_expiration_date) <= date('now', '+' || ? || ' days')
         ORDER BY contract_expiration_date ASC"
    )
    .bind(days_threshold)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_site_usage_stats(state: State<'_, DbState>, site_id: String) -> Result<serde_json::Value, String> {
    // Get usage statistics for a specific site
    let student_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT student_id) FROM clinical_assignments WHERE site_id = ?"
    )
    .bind(&site_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or((0,));

    let total_hours: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM clinical_logs WHERE site_name = (SELECT name FROM clinical_sites WHERE id = ?)"
    )
    .bind(&site_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or((0.0,));

    let last_used: Option<(String,)> = sqlx::query_as(
        "SELECT MAX(date) FROM clinical_logs WHERE site_name = (SELECT name FROM clinical_sites WHERE id = ?)"
    )
    .bind(&site_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    Ok(serde_json::json!({
        "siteId": site_id,
        "studentsAssigned": student_count.0,
        "totalHoursLogged": total_hours.0,
        "lastUsedDate": last_used.map(|d| d.0)
    }))
}

#[tauri::command]
pub async fn update_site_last_used(state: State<'_, DbState>, site_id: String) -> Result<(), String> {
    // Update the last_used_date for a site
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();
    sqlx::query("UPDATE clinical_sites SET last_used_date = ? WHERE id = ?")
        .bind(&today)
        .bind(&site_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Preceptors Commands

#[tauri::command]
pub async fn add_preceptor(state: State<'_, DbState>, preceptor: crate::models::Preceptor) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO preceptors (
            id, first_name, last_name, credentials, email, phone,
            site_id, is_active, notes, created_at,
            license_number, license_state, license_expiration_date,
            last_verification_date, next_verification_due, specialties
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&preceptor.id)
    .bind(&preceptor.first_name)
    .bind(&preceptor.last_name)
    .bind(&preceptor.credentials)
    .bind(&preceptor.email)
    .bind(&preceptor.phone)
    .bind(&preceptor.site_id)
    .bind(preceptor.is_active.unwrap_or(1))
    .bind(&preceptor.notes)
    .bind(&preceptor.created_at)
    .bind(&preceptor.license_number)
    .bind(&preceptor.license_state)
    .bind(&preceptor.license_expiration_date)
    .bind(&preceptor.last_verification_date)
    .bind(&preceptor.next_verification_due)
    .bind(&preceptor.specialties)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_preceptors(state: State<'_, DbState>) -> Result<Vec<crate::models::Preceptor>, String> {
    sqlx::query_as::<_, crate::models::Preceptor>(
        "SELECT * FROM preceptors WHERE is_active = 1 ORDER BY last_name, first_name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_preceptors_by_site(state: State<'_, DbState>, site_id: String) -> Result<Vec<crate::models::Preceptor>, String> {
    sqlx::query_as::<_, crate::models::Preceptor>(
        "SELECT * FROM preceptors WHERE site_id = ? AND is_active = 1 ORDER BY last_name, first_name"
    )
    .bind(&site_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_preceptor(state: State<'_, DbState>, preceptor: crate::models::Preceptor) -> Result<(), String> {
    sqlx::query(
        "UPDATE preceptors SET
            first_name = ?, last_name = ?, credentials = ?, email = ?,
            phone = ?, site_id = ?, is_active = ?, notes = ?,
            license_number = ?, license_state = ?, license_expiration_date = ?,
            last_verification_date = ?, next_verification_due = ?, specialties = ?
        WHERE id = ?"
    )
    .bind(&preceptor.first_name)
    .bind(&preceptor.last_name)
    .bind(&preceptor.credentials)
    .bind(&preceptor.email)
    .bind(&preceptor.phone)
    .bind(&preceptor.site_id)
    .bind(preceptor.is_active.unwrap_or(1))
    .bind(&preceptor.notes)
    .bind(&preceptor.license_number)
    .bind(&preceptor.license_state)
    .bind(&preceptor.license_expiration_date)
    .bind(&preceptor.last_verification_date)
    .bind(&preceptor.next_verification_due)
    .bind(&preceptor.specialties)
    .bind(&preceptor.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_preceptor(state: State<'_, DbState>, id: String) -> Result<(), String> {
    // Soft delete by setting is_active to 0
    sqlx::query("UPDATE preceptors SET is_active = 0 WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn verify_preceptor_license(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let now = chrono::Utc::now();
    let verification_date = now.format("%Y-%m-%d").to_string();
    // Next verification due is 1 year from now
    let next_due = now.checked_add_signed(chrono::TimeDelta::try_days(365).unwrap())
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_default();

    sqlx::query(
        "UPDATE preceptors SET last_verification_date = ?, next_verification_due = ? WHERE id = ?"
    )
    .bind(&verification_date)
    .bind(&next_due)
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_preceptors_with_details(state: State<'_, DbState>) -> Result<Vec<crate::models::PreceptorWithDetails>, String> {
    let pool = &state.db;

    let preceptors = sqlx::query_as::<_, crate::models::Preceptor>(
        "SELECT * FROM preceptors WHERE is_active = 1 ORDER BY last_name, first_name"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    for preceptor in preceptors {
        // Get site name
        let site_name = if let Some(ref sid) = preceptor.site_id {
            sqlx::query_as::<_, crate::models::ClinicalSite>("SELECT * FROM clinical_sites WHERE id = ?")
                .bind(sid)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
                .map(|s| s.name)
        } else {
            None
        };

        // Get assigned students count (active clinical assignments)
        let assigned_count: (i32,) = sqlx::query_as(
            "SELECT COUNT(DISTINCT student_id) FROM clinical_assignments WHERE preceptor_id = ? AND status IN ('scheduled', 'in_progress')"
        )
        .bind(&preceptor.id)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;

        // Calculate verification status
        let (verification_status, days_until_due) = if let Some(ref next_due) = preceptor.next_verification_due {
            if let (Ok(due_date), Ok(today_date)) = (
                chrono::NaiveDate::parse_from_str(next_due, "%Y-%m-%d"),
                chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d")
            ) {
                let days = (due_date - today_date).num_days() as i32;
                let status = if days < 0 {
                    "overdue"
                } else if days <= 30 {
                    "due_soon"
                } else {
                    "verified"
                };
                (status.to_string(), Some(days))
            } else {
                ("not_verified".to_string(), None)
            }
        } else {
            ("not_verified".to_string(), None)
        };

        results.push(crate::models::PreceptorWithDetails {
            preceptor,
            site_name,
            assigned_students_count: assigned_count.0,
            verification_status,
            days_until_due,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_preceptors_needing_verification(state: State<'_, DbState>, days_ahead: i32) -> Result<Vec<crate::models::PreceptorVerificationAlert>, String> {
    let pool = &state.db;

    let preceptors = sqlx::query_as::<_, crate::models::Preceptor>(
        "SELECT * FROM preceptors WHERE is_active = 1"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut alerts = Vec::new();
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let today_date = chrono::NaiveDate::parse_from_str(&today, "%Y-%m-%d")
        .map_err(|e| e.to_string())?;

    for preceptor in preceptors {
        let days_until_due = if let Some(ref next_due) = preceptor.next_verification_due {
            if let Ok(due_date) = chrono::NaiveDate::parse_from_str(next_due, "%Y-%m-%d") {
                (due_date - today_date).num_days() as i32
            } else {
                -999 // Will be flagged as needing verification
            }
        } else {
            -999 // No verification date set, needs verification
        };

        // Include if overdue or within the specified days_ahead window
        if days_until_due <= days_ahead {
            // Get site name
            let site_name = if let Some(ref sid) = preceptor.site_id {
                sqlx::query_as::<_, crate::models::ClinicalSite>("SELECT * FROM clinical_sites WHERE id = ?")
                    .bind(sid)
                    .fetch_optional(pool)
                    .await
                    .map_err(|e| e.to_string())?
                    .map(|s| s.name)
            } else {
                None
            };

            let alert_level = if days_until_due < 0 {
                "overdue"
            } else if days_until_due <= 30 {
                "critical"
            } else {
                "warning"
            };

            alerts.push(crate::models::PreceptorVerificationAlert {
                preceptor_id: preceptor.id,
                preceptor_name: format!("{} {}", preceptor.first_name, preceptor.last_name),
                site_name,
                license_number: preceptor.license_number,
                next_verification_due: preceptor.next_verification_due,
                days_until_due,
                alert_level: alert_level.to_string(),
            });
        }
    }

    // Sort by days_until_due (most urgent first)
    alerts.sort_by_key(|a| a.days_until_due);

    Ok(alerts)
}

#[tauri::command]
pub async fn get_preceptor_by_id(state: State<'_, DbState>, id: String) -> Result<Option<crate::models::Preceptor>, String> {
    sqlx::query_as::<_, crate::models::Preceptor>(
        "SELECT * FROM preceptors WHERE id = ?"
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())
}

// Clinical Assignments Commands

#[tauri::command]
pub async fn create_clinical_assignment(
    state: State<'_, DbState>,
    assignment: crate::models::ClinicalAssignment
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO clinical_assignments (
            id, student_id, site_id, preceptor_id, date, start_time, end_time,
            hours, objectives, patient_assignment, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&assignment.id)
    .bind(&assignment.student_id)
    .bind(&assignment.site_id)
    .bind(&assignment.preceptor_id)
    .bind(&assignment.date)
    .bind(&assignment.start_time)
    .bind(&assignment.end_time)
    .bind(assignment.hours.unwrap_or(8.0))
    .bind(&assignment.objectives)
    .bind(&assignment.patient_assignment)
    .bind(&assignment.status)
    .bind(&assignment.notes)
    .bind(&assignment.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn bulk_create_assignments(
    state: State<'_, DbState>,
    assignments: Vec<crate::models::ClinicalAssignment>
) -> Result<(), String> {
    for assignment in assignments {
        create_clinical_assignment(state.clone(), assignment).await?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_assignments_for_date(
    state: State<'_, DbState>,
    date: String
) -> Result<Vec<crate::models::ClinicalAssignmentWithDetails>, String> {
    let pool = &state.db;

    let assignments = sqlx::query_as::<_, crate::models::ClinicalAssignment>(
        "SELECT * FROM clinical_assignments WHERE date = ? ORDER BY start_time"
    )
    .bind(&date)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for assignment in assignments {
        let student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
            .bind(&assignment.student_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

        let site = sqlx::query_as::<_, crate::models::ClinicalSite>("SELECT * FROM clinical_sites WHERE id = ?")
            .bind(&assignment.site_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

        let preceptor_name = if let Some(ref pid) = assignment.preceptor_id {
            sqlx::query_as::<_, crate::models::Preceptor>("SELECT * FROM preceptors WHERE id = ?")
                .bind(pid)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
                .map(|p| format!("{} {}", p.first_name, p.last_name))
        } else {
            None
        };

        results.push(crate::models::ClinicalAssignmentWithDetails {
            student_name: student.map(|s| format!("{} {}", s.first_name, s.last_name)).unwrap_or_default(),
            site_name: site.map(|s| s.name).unwrap_or_default(),
            preceptor_name,
            assignment,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_assignments_for_week(
    state: State<'_, DbState>,
    start_date: String,
    end_date: String
) -> Result<Vec<crate::models::ClinicalAssignmentWithDetails>, String> {
    let pool = &state.db;

    let assignments = sqlx::query_as::<_, crate::models::ClinicalAssignment>(
        "SELECT * FROM clinical_assignments WHERE date >= ? AND date <= ? ORDER BY date, start_time"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for assignment in assignments {
        let student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
            .bind(&assignment.student_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

        let site = sqlx::query_as::<_, crate::models::ClinicalSite>("SELECT * FROM clinical_sites WHERE id = ?")
            .bind(&assignment.site_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

        let preceptor_name = if let Some(ref pid) = assignment.preceptor_id {
            sqlx::query_as::<_, crate::models::Preceptor>("SELECT * FROM preceptors WHERE id = ?")
                .bind(pid)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
                .map(|p| format!("{} {}", p.first_name, p.last_name))
        } else {
            None
        };

        results.push(crate::models::ClinicalAssignmentWithDetails {
            student_name: student.map(|s| format!("{} {}", s.first_name, s.last_name)).unwrap_or_default(),
            site_name: site.map(|s| s.name).unwrap_or_default(),
            preceptor_name,
            assignment,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_student_assignments(
    state: State<'_, DbState>,
    student_id: String
) -> Result<Vec<crate::models::ClinicalAssignment>, String> {
    sqlx::query_as::<_, crate::models::ClinicalAssignment>(
        "SELECT * FROM clinical_assignments WHERE student_id = ? ORDER BY date DESC"
    )
    .bind(&student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_assignment(
    state: State<'_, DbState>,
    assignment: crate::models::ClinicalAssignment
) -> Result<(), String> {
    sqlx::query(
        "UPDATE clinical_assignments SET
            site_id = ?, preceptor_id = ?, date = ?, start_time = ?, end_time = ?,
            hours = ?, objectives = ?, patient_assignment = ?, status = ?, notes = ?
        WHERE id = ?"
    )
    .bind(&assignment.site_id)
    .bind(&assignment.preceptor_id)
    .bind(&assignment.date)
    .bind(&assignment.start_time)
    .bind(&assignment.end_time)
    .bind(assignment.hours.unwrap_or(8.0))
    .bind(&assignment.objectives)
    .bind(&assignment.patient_assignment)
    .bind(&assignment.status)
    .bind(&assignment.notes)
    .bind(&assignment.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn cancel_assignment(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("UPDATE clinical_assignments SET status = 'cancelled' WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn complete_assignment(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("UPDATE clinical_assignments SET status = 'completed' WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// VR Scenarios Commands

#[tauri::command]
pub async fn add_vr_scenario(state: State<'_, DbState>, scenario: crate::models::VrScenario) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO vr_scenarios (
            id, name, description, category, default_hours, is_required,
            course_id, sort_order, is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&scenario.id)
    .bind(&scenario.name)
    .bind(&scenario.description)
    .bind(&scenario.category)
    .bind(scenario.default_hours.unwrap_or(1.0))
    .bind(scenario.is_required.unwrap_or(1))
    .bind(&scenario.course_id)
    .bind(scenario.sort_order.unwrap_or(0))
    .bind(scenario.is_active.unwrap_or(1))
    .bind(&scenario.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_vr_scenarios(state: State<'_, DbState>) -> Result<Vec<crate::models::VrScenario>, String> {
    sqlx::query_as::<_, crate::models::VrScenario>(
        "SELECT * FROM vr_scenarios WHERE is_active = 1 ORDER BY sort_order, name"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_vr_scenario(state: State<'_, DbState>, scenario: crate::models::VrScenario) -> Result<(), String> {
    sqlx::query(
        "UPDATE vr_scenarios SET
            name = ?, description = ?, category = ?, default_hours = ?,
            is_required = ?, course_id = ?, sort_order = ?, is_active = ?
        WHERE id = ?"
    )
    .bind(&scenario.name)
    .bind(&scenario.description)
    .bind(&scenario.category)
    .bind(scenario.default_hours.unwrap_or(1.0))
    .bind(scenario.is_required.unwrap_or(1))
    .bind(&scenario.course_id)
    .bind(scenario.sort_order.unwrap_or(0))
    .bind(scenario.is_active.unwrap_or(1))
    .bind(&scenario.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_vr_scenario(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("UPDATE vr_scenarios SET is_active = 0 WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// Student VR Completions Commands

#[tauri::command]
pub async fn save_vr_completion(
    state: State<'_, DbState>,
    completion: crate::models::StudentVrCompletion
) -> Result<(), String> {
    sqlx::query(
        "INSERT OR REPLACE INTO student_vr_completions (
            id, student_id, scenario_id, completion_date, hours, score,
            attempts, notes, verified_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&completion.id)
    .bind(&completion.student_id)
    .bind(&completion.scenario_id)
    .bind(&completion.completion_date)
    .bind(&completion.hours)
    .bind(&completion.score)
    .bind(completion.attempts.unwrap_or(1))
    .bind(&completion.notes)
    .bind(&completion.verified_by)
    .bind(&completion.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_student_vr_completions(
    state: State<'_, DbState>,
    student_id: String
) -> Result<Vec<crate::models::StudentVrCompletion>, String> {
    sqlx::query_as::<_, crate::models::StudentVrCompletion>(
        "SELECT * FROM student_vr_completions WHERE student_id = ? ORDER BY completion_date DESC"
    )
    .bind(&student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_student_vr_summary(
    state: State<'_, DbState>,
    student_id: String
) -> Result<crate::models::StudentVrSummary, String> {
    let pool = &state.db;

    // Get student name
    let student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
        .bind(&student_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    let student_name = student
        .map(|s| format!("{} {}", s.first_name, s.last_name))
        .unwrap_or_default();

    // Get total VR hours
    let total_hours: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM student_vr_completions WHERE student_id = ?"
    )
    .bind(&student_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get completed scenarios count
    let completed_count: (i32,) = sqlx::query_as(
        "SELECT COUNT(*) FROM student_vr_completions WHERE student_id = ?"
    )
    .bind(&student_id)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get total scenarios count
    let total_scenarios: (i32,) = sqlx::query_as(
        "SELECT COUNT(*) FROM vr_scenarios WHERE is_active = 1"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    let max_allowed_hours = 100.0; // VBON limit
    let percentage_used = (total_hours.0 / max_allowed_hours) * 100.0;
    let is_compliant = total_hours.0 <= max_allowed_hours;

    let alert_level = if total_hours.0 > max_allowed_hours {
        "over_cap".to_string()
    } else if total_hours.0 >= 80.0 {
        "warning".to_string()
    } else {
        "safe".to_string()
    };

    Ok(crate::models::StudentVrSummary {
        student_id,
        student_name,
        total_vr_hours: total_hours.0,
        max_allowed_hours,
        percentage_used,
        is_compliant,
        alert_level,
        completed_scenarios: completed_count.0,
        total_scenarios: total_scenarios.0,
    })
}

// Student Hour Submissions Commands

#[tauri::command]
pub async fn submit_hours(
    state: State<'_, DbState>,
    submission: crate::models::StudentHourSubmission
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO student_hour_submissions (
            id, student_id, assignment_id, date, site_name, start_time, end_time,
            hours, activities, skills_practiced, reflection, status,
            reviewer_feedback, reviewed_at, reviewed_by, submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&submission.id)
    .bind(&submission.student_id)
    .bind(&submission.assignment_id)
    .bind(&submission.date)
    .bind(&submission.site_name)
    .bind(&submission.start_time)
    .bind(&submission.end_time)
    .bind(&submission.hours)
    .bind(&submission.activities)
    .bind(&submission.skills_practiced)
    .bind(&submission.reflection)
    .bind(&submission.status)
    .bind(&submission.reviewer_feedback)
    .bind(&submission.reviewed_at)
    .bind(&submission.reviewed_by)
    .bind(&submission.submitted_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_pending_submissions(
    state: State<'_, DbState>
) -> Result<Vec<crate::models::StudentHourSubmissionWithStudent>, String> {
    let pool = &state.db;

    let submissions = sqlx::query_as::<_, crate::models::StudentHourSubmission>(
        "SELECT * FROM student_hour_submissions WHERE status = 'pending' ORDER BY submitted_at DESC"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for submission in submissions {
        let student = sqlx::query_as::<_, Student>("SELECT * FROM students WHERE id = ?")
            .bind(&submission.student_id)
            .fetch_optional(pool)
            .await
            .map_err(|e| e.to_string())?;

        results.push(crate::models::StudentHourSubmissionWithStudent {
            student_name: student.map(|s| format!("{} {}", s.first_name, s.last_name)).unwrap_or_default(),
            submission,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_student_submissions(
    state: State<'_, DbState>,
    student_id: String
) -> Result<Vec<crate::models::StudentHourSubmission>, String> {
    sqlx::query_as::<_, crate::models::StudentHourSubmission>(
        "SELECT * FROM student_hour_submissions WHERE student_id = ? ORDER BY submitted_at DESC"
    )
    .bind(&student_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn approve_submission(
    state: State<'_, DbState>,
    id: String,
    feedback: Option<String>,
    reviewed_by: String
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    sqlx::query(
        "UPDATE student_hour_submissions SET
            status = 'approved', reviewer_feedback = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?"
    )
    .bind(&feedback)
    .bind(&now)
    .bind(&reviewed_by)
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn reject_submission(
    state: State<'_, DbState>,
    id: String,
    feedback: String,
    reviewed_by: String
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    sqlx::query(
        "UPDATE student_hour_submissions SET
            status = 'rejected', reviewer_feedback = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?"
    )
    .bind(&feedback)
    .bind(&now)
    .bind(&reviewed_by)
    .bind(&id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== INSTRUCTOR CREDENTIALS & COMP HOURS ====================

// Instructor Certifications Commands

#[tauri::command]
pub async fn add_instructor_certification(
    state: State<'_, DbState>,
    cert: InstructorCertification
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO instructor_certifications (
            id, certification_type, certification_name, license_number,
            issuing_authority, issue_date, expiry_date, alert_days,
            status, document_path, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&cert.id)
    .bind(&cert.certification_type)
    .bind(&cert.certification_name)
    .bind(&cert.license_number)
    .bind(&cert.issuing_authority)
    .bind(&cert.issue_date)
    .bind(&cert.expiry_date)
    .bind(cert.alert_days)
    .bind(&cert.status)
    .bind(&cert.document_path)
    .bind(&cert.notes)
    .bind(&cert.created_at)
    .bind(&cert.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_instructor_certification(
    state: State<'_, DbState>,
    cert: InstructorCertification
) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    sqlx::query(
        "UPDATE instructor_certifications SET
            certification_type = ?, certification_name = ?, license_number = ?,
            issuing_authority = ?, issue_date = ?, expiry_date = ?, alert_days = ?,
            status = ?, document_path = ?, notes = ?, updated_at = ?
        WHERE id = ?"
    )
    .bind(&cert.certification_type)
    .bind(&cert.certification_name)
    .bind(&cert.license_number)
    .bind(&cert.issuing_authority)
    .bind(&cert.issue_date)
    .bind(&cert.expiry_date)
    .bind(cert.alert_days)
    .bind(&cert.status)
    .bind(&cert.document_path)
    .bind(&cert.notes)
    .bind(&now)
    .bind(&cert.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_instructor_certification(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM instructor_certifications WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_instructor_certifications(
    state: State<'_, DbState>
) -> Result<Vec<InstructorCertification>, String> {
    sqlx::query_as::<_, InstructorCertification>(
        "SELECT * FROM instructor_certifications ORDER BY expiry_date"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_instructor_certification_alerts(
    state: State<'_, DbState>
) -> Result<Vec<InstructorCertificationAlert>, String> {
    let pool = &state.db;

    let certs = sqlx::query_as::<_, InstructorCertification>(
        "SELECT * FROM instructor_certifications ORDER BY expiry_date"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let today = chrono::Utc::now().date_naive();
    let mut alerts = Vec::new();

    for cert in certs {
        if let Ok(expiry) = chrono::NaiveDate::parse_from_str(&cert.expiry_date, "%Y-%m-%d") {
            let days_until = (expiry - today).num_days() as i32;

            // Only include if within alert window or expired
            if days_until <= cert.alert_days {
                let alert_level = if days_until < 0 {
                    "expired"
                } else if days_until <= 30 {
                    "critical"
                } else {
                    "warning"
                };

                alerts.push(InstructorCertificationAlert {
                    certification: cert,
                    days_until_expiry: days_until,
                    alert_level: alert_level.to_string(),
                });
            }
        }
    }

    // Sort by days until expiry (most urgent first)
    alerts.sort_by_key(|a| a.days_until_expiry);

    Ok(alerts)
}

// Comp Hours Commands

#[tauri::command]
pub async fn add_comp_hours_earned(
    state: State<'_, DbState>,
    entry: CompHoursEarned
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO comp_hours_earned (
            id, date, activity_type, hours, notes, expiration_date, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&entry.id)
    .bind(&entry.date)
    .bind(&entry.activity_type)
    .bind(entry.hours)
    .bind(&entry.notes)
    .bind(&entry.expiration_date)
    .bind(&entry.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_comp_hours_earned(state: State<'_, DbState>) -> Result<Vec<CompHoursEarned>, String> {
    sqlx::query_as::<_, CompHoursEarned>(
        "SELECT * FROM comp_hours_earned ORDER BY date DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_comp_hours_earned(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM comp_hours_earned WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn add_comp_hours_used(
    state: State<'_, DbState>,
    entry: CompHoursUsed
) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO comp_hours_used (
            id, date, hours, reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&entry.id)
    .bind(&entry.date)
    .bind(entry.hours)
    .bind(&entry.reason)
    .bind(&entry.notes)
    .bind(&entry.created_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_comp_hours_used(state: State<'_, DbState>) -> Result<Vec<CompHoursUsed>, String> {
    sqlx::query_as::<_, CompHoursUsed>(
        "SELECT * FROM comp_hours_used ORDER BY date DESC"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_comp_hours_used(state: State<'_, DbState>, id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM comp_hours_used WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_comp_hours_summary(state: State<'_, DbState>) -> Result<CompHoursSummary, String> {
    let pool = &state.db;

    // Get total earned
    let total_earned: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM comp_hours_earned"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get total used
    let total_used: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM comp_hours_used"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get earned this year
    let year_start = chrono::Utc::now().format("%Y-01-01").to_string();
    let earned_this_year: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM comp_hours_earned WHERE date >= ?"
    )
    .bind(&year_start)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get used this year
    let used_this_year: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM comp_hours_used WHERE date >= ?"
    )
    .bind(&year_start)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Calculate hours expiring within 6 months
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let six_months = chrono::Utc::now()
        .checked_add_signed(chrono::TimeDelta::try_days(180).unwrap())
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_default();

    let expiring: (f64,) = sqlx::query_as(
        "SELECT COALESCE(SUM(hours), 0) FROM comp_hours_earned
         WHERE expiration_date IS NOT NULL AND expiration_date >= ? AND expiration_date <= ?"
    )
    .bind(&today)
    .bind(&six_months)
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get nearest expiration date
    let nearest_expiry: Option<(String,)> = sqlx::query_as(
        "SELECT expiration_date FROM comp_hours_earned
         WHERE expiration_date IS NOT NULL AND expiration_date >= ?
         ORDER BY expiration_date LIMIT 1"
    )
    .bind(&today)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;

    let (expiring_date, days_until_expiry) = if let Some((date,)) = nearest_expiry {
        let today_date = chrono::Utc::now().date_naive();
        if let Ok(exp_date) = chrono::NaiveDate::parse_from_str(&date, "%Y-%m-%d") {
            let days = (exp_date - today_date).num_days() as i32;
            (Some(date), Some(days))
        } else {
            (Some(date), None)
        }
    } else {
        (None, None)
    };

    Ok(CompHoursSummary {
        total_earned: total_earned.0,
        total_used: total_used.0,
        balance: total_earned.0 - total_used.0,
        earned_this_year: earned_this_year.0,
        used_this_year: used_this_year.0,
        expiring_soon: expiring.0,
        expiring_date,
        days_until_expiry,
    })
}

#[tauri::command]
pub async fn get_comp_hours_expiration_warnings(
    state: State<'_, DbState>
) -> Result<Vec<CompHoursExpirationWarning>, String> {
    let pool = &state.db;

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let today_date = chrono::Utc::now().date_naive();

    // Get all entries with expiration dates in the future
    let entries = sqlx::query_as::<_, CompHoursEarned>(
        "SELECT * FROM comp_hours_earned
         WHERE expiration_date IS NOT NULL AND expiration_date >= ?
         ORDER BY expiration_date"
    )
    .bind(&today)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Group by expiration date and calculate totals
    let mut warnings: HashMap<String, f64> = HashMap::new();
    for entry in entries {
        if let Some(exp_date) = entry.expiration_date {
            *warnings.entry(exp_date).or_insert(0.0) += entry.hours;
        }
    }

    let mut result = Vec::new();
    for (exp_date, hours) in warnings {
        if let Ok(expiry) = chrono::NaiveDate::parse_from_str(&exp_date, "%Y-%m-%d") {
            let days = (expiry - today_date).num_days() as i32;

            let alert_level = if days <= 90 {
                "red" // < 3 months
            } else if days <= 180 {
                "yellow" // 3-6 months
            } else {
                "green" // > 6 months
            };

            result.push(CompHoursExpirationWarning {
                hours,
                expiration_date: exp_date,
                days_until_expiry: days,
                alert_level: alert_level.to_string(),
            });
        }
    }

    // Sort by days until expiry
    result.sort_by_key(|w| w.days_until_expiry);

    Ok(result)
}

// ==================== COURSES ====================

#[tauri::command]
pub async fn add_course(state: State<'_, DbState>, course: Course) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO courses (
            id, code, name, description, syllabus_url, content_outline_url,
            clinical_manual_url, semester, year, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&course.id)
    .bind(&course.code)
    .bind(&course.name)
    .bind(&course.description)
    .bind(&course.syllabus_url)
    .bind(&course.content_outline_url)
    .bind(&course.clinical_manual_url)
    .bind(&course.semester)
    .bind(&course.year)
    .bind(course.is_active.unwrap_or(1))
    .bind(&course.created_at)
    .bind(&course.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_all_courses(state: State<'_, DbState>) -> Result<Vec<Course>, String> {
    sqlx::query_as::<_, Course>(
        "SELECT * FROM courses WHERE is_active = 1 ORDER BY code"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_course_by_id(state: State<'_, DbState>, id: String) -> Result<Option<Course>, String> {
    sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = ?")
        .bind(&id)
        .fetch_optional(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_course(state: State<'_, DbState>, course: Course) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    sqlx::query(
        "UPDATE courses SET
            code = ?, name = ?, description = ?, syllabus_url = ?,
            content_outline_url = ?, clinical_manual_url = ?, semester = ?,
            year = ?, is_active = ?, updated_at = ?
        WHERE id = ?"
    )
    .bind(&course.code)
    .bind(&course.name)
    .bind(&course.description)
    .bind(&course.syllabus_url)
    .bind(&course.content_outline_url)
    .bind(&course.clinical_manual_url)
    .bind(&course.semester)
    .bind(&course.year)
    .bind(course.is_active.unwrap_or(1))
    .bind(&now)
    .bind(&course.id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_course(state: State<'_, DbState>, id: String) -> Result<(), String> {
    // Soft delete by setting is_active to 0
    sqlx::query("UPDATE courses SET is_active = 0 WHERE id = ?")
        .bind(&id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_lesson_plans_by_course(state: State<'_, DbState>, course_id: String) -> Result<Vec<LessonPlan>, String> {
    sqlx::query_as::<_, LessonPlan>(
        "SELECT * FROM lesson_plans WHERE course_id = ? ORDER BY week_number, date"
    )
    .bind(&course_id)
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_lesson_plans_by_week(
    state: State<'_, DbState>,
    start_date: String,
    end_date: String
) -> Result<Vec<LessonPlanWithMaterials>, String> {
    let pool = &state.db;

    let plans = sqlx::query_as::<_, LessonPlan>(
        "SELECT * FROM lesson_plans WHERE date >= ? AND date <= ? ORDER BY date, course_name"
    )
    .bind(&start_date)
    .bind(&end_date)
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for plan in plans {
        let materials = sqlx::query_as::<_, TeachingMaterial>(
            "SELECT * FROM teaching_materials WHERE lesson_plan_id = ? ORDER BY sort_order ASC"
        )
        .bind(&plan.id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        let course = if let Some(ref course_id) = plan.course_id {
            sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = ?")
                .bind(course_id)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };

        results.push(LessonPlanWithMaterials {
            plan,
            materials,
            course,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_lesson_plan_with_materials(
    state: State<'_, DbState>,
    id: String
) -> Result<Option<LessonPlanWithMaterials>, String> {
    let pool = &state.db;

    let plan = sqlx::query_as::<_, LessonPlan>("SELECT * FROM lesson_plans WHERE id = ?")
        .bind(&id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(plan) = plan {
        let materials = sqlx::query_as::<_, TeachingMaterial>(
            "SELECT * FROM teaching_materials WHERE lesson_plan_id = ? ORDER BY sort_order ASC"
        )
        .bind(&plan.id)
        .fetch_all(pool)
        .await
        .map_err(|e| e.to_string())?;

        let course = if let Some(ref course_id) = plan.course_id {
            sqlx::query_as::<_, Course>("SELECT * FROM courses WHERE id = ?")
                .bind(course_id)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?
        } else {
            None
        };

        Ok(Some(LessonPlanWithMaterials {
            plan,
            materials,
            course,
        }))
    } else {
        Ok(None)
    }
}


// ==================== VBON COMPLIANCE MAPPING ====================

#[tauri::command]
pub async fn get_all_vbon_regulations(state: State<'_, DbState>) -> Result<Vec<VBONRegulation>, String> {
    sqlx::query_as::<_, VBONRegulation>(
        "SELECT * FROM vbon_regulations WHERE is_active = 1 ORDER BY sort_order"
    )
    .fetch_all(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_vbon_regulation(state: State<'_, DbState>, regulation: VBONRegulation) -> Result<(), String> {
    sqlx::query(
        "INSERT INTO vbon_regulations (
            id, code, section, category, title, description, sort_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&regulation.id)
    .bind(&regulation.code)
    .bind(&regulation.section)
    .bind(&regulation.category)
    .bind(&regulation.title)
    .bind(&regulation.description)
    .bind(&regulation.sort_order)
    .bind(&regulation.is_active)
    .bind(&regulation.created_at)
    .bind(&regulation.updated_at)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn seed_vbon_regulations(state: State<'_, DbState>, regulations: Vec<VBONRegulation>) -> Result<(), String> {
    for regulation in regulations {
        // Use INSERT OR REPLACE to handle existing regulations
        sqlx::query(
            "INSERT OR REPLACE INTO vbon_regulations (
                id, code, section, category, title, description, sort_order, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&regulation.id)
        .bind(&regulation.code)
        .bind(&regulation.section)
        .bind(&regulation.category)
        .bind(&regulation.title)
        .bind(&regulation.description)
        .bind(&regulation.sort_order)
        .bind(&regulation.is_active)
        .bind(&regulation.created_at)
        .bind(&regulation.updated_at)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_vbon_regulations_with_mappings(state: State<'_, DbState>) -> Result<Vec<VBONRegulationWithMapping>, String> {
    let pool = &state.db;

    let regulations = sqlx::query_as::<_, VBONRegulation>(
        "SELECT * FROM vbon_regulations WHERE is_active = 1 ORDER BY sort_order"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    let mut results = Vec::new();
    for reg in regulations {
        let mapping = sqlx::query_as::<_, VBONMapping>(
            "SELECT * FROM vbon_mappings WHERE regulation_id = ?"
        )
        .bind(&reg.id)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?;

        results.push(VBONRegulationWithMapping {
            regulation: reg,
            mapping,
        });
    }

    Ok(results)
}

#[tauri::command]
pub async fn get_vbon_mapping(state: State<'_, DbState>, regulation_id: String) -> Result<Option<VBONMapping>, String> {
    sqlx::query_as::<_, VBONMapping>(
        "SELECT * FROM vbon_mappings WHERE regulation_id = ?"
    )
    .bind(&regulation_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upsert_vbon_mapping(state: State<'_, DbState>, mapping: VBONMapping) -> Result<(), String> {
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%S").to_string();

    // Try to update first, then insert if not exists
    let result = sqlx::query(
        "UPDATE vbon_mappings SET
            syllabus_reference = ?, lesson_plan_ids = ?, material_links = ?,
            assessment_method = ?, clinical_experience = ?, notes = ?,
            coverage_status = ?, last_reviewed_date = ?, reviewed_by = ?, updated_at = ?
        WHERE regulation_id = ?"
    )
    .bind(&mapping.syllabus_reference)
    .bind(&mapping.lesson_plan_ids)
    .bind(&mapping.material_links)
    .bind(&mapping.assessment_method)
    .bind(&mapping.clinical_experience)
    .bind(&mapping.notes)
    .bind(&mapping.coverage_status)
    .bind(&mapping.last_reviewed_date)
    .bind(&mapping.reviewed_by)
    .bind(&now)
    .bind(&mapping.regulation_id)
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if result.rows_affected() == 0 {
        // Insert new mapping
        sqlx::query(
            "INSERT INTO vbon_mappings (
                id, regulation_id, syllabus_reference, lesson_plan_ids, material_links,
                assessment_method, clinical_experience, notes, coverage_status,
                last_reviewed_date, reviewed_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&mapping.id)
        .bind(&mapping.regulation_id)
        .bind(&mapping.syllabus_reference)
        .bind(&mapping.lesson_plan_ids)
        .bind(&mapping.material_links)
        .bind(&mapping.assessment_method)
        .bind(&mapping.clinical_experience)
        .bind(&mapping.notes)
        .bind(&mapping.coverage_status)
        .bind(&mapping.last_reviewed_date)
        .bind(&mapping.reviewed_by)
        .bind(&now)
        .bind(&now)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_vbon_compliance_summary(state: State<'_, DbState>) -> Result<VBONComplianceSummary, String> {
    let pool = &state.db;

    // Get all regulations
    let regulations = sqlx::query_as::<_, VBONRegulation>(
        "SELECT * FROM vbon_regulations WHERE is_active = 1"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Get all mappings
    let mappings = sqlx::query_as::<_, VBONMapping>(
        "SELECT * FROM vbon_mappings"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Create a map of regulation_id to mapping
    let mapping_map: HashMap<String, VBONMapping> = mappings
        .into_iter()
        .map(|m| (m.regulation_id.clone(), m))
        .collect();

    // Calculate stats
    let total_regulations = regulations.len() as i32;
    let mut covered_count = 0;
    let mut partial_count = 0;
    let mut not_covered_count = 0;

    // Group by category
    let mut category_map: HashMap<String, VBONCategoryStats> = HashMap::new();

    for reg in &regulations {
        let status = mapping_map.get(&reg.id)
            .map(|m| m.coverage_status.as_str())
            .unwrap_or("not_covered");

        match status {
            "covered" => covered_count += 1,
            "partial" => partial_count += 1,
            _ => not_covered_count += 1,
        }

        // Update category stats
        let category_stat = category_map
            .entry(reg.category.clone())
            .or_insert_with(|| VBONCategoryStats {
                category: reg.category.clone(),
                total: 0,
                covered: 0,
                partial: 0,
                not_covered: 0,
            });

        category_stat.total += 1;
        match status {
            "covered" => category_stat.covered += 1,
            "partial" => category_stat.partial += 1,
            _ => category_stat.not_covered += 1,
        }
    }

    // Calculate percentage (count covered as 100%, partial as 50%)
    let percentage_complete = if total_regulations > 0 {
        ((covered_count as f64 * 100.0) + (partial_count as f64 * 50.0)) / (total_regulations as f64)
    } else {
        0.0
    };

    // Get last audit date (most recent last_reviewed_date from mappings)
    let last_audit_date: Option<String> = sqlx::query_scalar(
        "SELECT MAX(last_reviewed_date) FROM vbon_mappings WHERE last_reviewed_date IS NOT NULL"
    )
    .fetch_one(pool)
    .await
    .map_err(|e| e.to_string())?;

    // Convert category map to vec
    let mut regulations_by_category: Vec<VBONCategoryStats> = category_map.into_values().collect();
    regulations_by_category.sort_by(|a, b| a.category.cmp(&b.category));

    Ok(VBONComplianceSummary {
        total_regulations,
        covered_count,
        partial_count,
        not_covered_count,
        percentage_complete,
        last_audit_date,
        regulations_by_category,
    })
}

#[tauri::command]
pub async fn delete_vbon_mapping(state: State<'_, DbState>, regulation_id: String) -> Result<(), String> {
    sqlx::query("DELETE FROM vbon_mappings WHERE regulation_id = ?")
        .bind(&regulation_id)
        .execute(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ============ FILE MANAGEMENT COMMANDS ============

#[tauri::command]
pub async fn save_file(
    app: AppHandle,
    file_data: Vec<u8>,
    resource_type: String,
    resource_id: String,
    filename: String
) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;

    // Validate resource_type
    let valid_types = ["student_photos", "student_certs", "instructor_certs"];
    if !valid_types.contains(&resource_type.as_str()) {
        return Err(format!("Invalid resource type: {}", resource_type));
    }

    // Get app data directory
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    // Generate UUID-based filename to prevent conflicts
    let extension = PathBuf::from(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bin")
        .to_string();
    let uuid_filename = format!("{}.{}", uuid::Uuid::new_v4(), extension);

    // Construct file path: {app_data}/files/{resource_type}/{resource_id}/{uuid_filename}
    let file_dir = app_dir
        .join("files")
        .join(&resource_type)
        .join(&resource_id);

    // Ensure directory exists
    fs::create_dir_all(&file_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    let file_path = file_dir.join(&uuid_filename);

    // Validate path doesn't escape app directory (security)
    if !file_path.starts_with(&app_dir) {
        return Err("Invalid file path: path traversal detected".to_string());
    }

    // Write file
    fs::write(&file_path, &file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    // Return the file path as string
    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn delete_file(app: AppHandle, file_path: String) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;

    let path = PathBuf::from(&file_path);

    // Security check: ensure file is within app data directory
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !path.starts_with(&app_dir) {
        return Err("Cannot delete files outside app data directory".to_string());
    }

    // Check if file exists
    if !path.exists() {
        return Ok(()); // File already deleted, that's fine
    }

    // Delete the file
    fs::remove_file(&path)
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn list_files(
    app: AppHandle,
    resource_type: String,
    resource_id: String
) -> Result<Vec<String>, String> {
    use std::fs;

    // Validate resource_type
    let valid_types = ["student_photos", "student_certs", "instructor_certs"];
    if !valid_types.contains(&resource_type.as_str()) {
        return Err(format!("Invalid resource type: {}", resource_type));
    }

    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_dir = app_dir
        .join("files")
        .join(&resource_type)
        .join(&resource_id);

    // If directory doesn't exist, return empty list
    if !file_dir.exists() {
        return Ok(vec![]);
    }

    // List files in directory
    let entries = fs::read_dir(&file_dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let files: Vec<String> = entries
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                if e.path().is_file() {
                    Some(e.path().to_string_lossy().to_string())
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(files)
}

#[tauri::command]
pub async fn get_file_as_base64(app: AppHandle, file_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    let path = PathBuf::from(&file_path);

    // Security check: ensure file is within app data directory
    let app_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !path.starts_with(&app_dir) {
        return Err("Cannot read files outside app data directory".to_string());
    }

    // Read file
    let data = fs::read(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Encode as base64
    Ok(STANDARD.encode(&data))
}

// ============ BULK IMPORT COMMANDS ============

#[derive(serde::Deserialize, serde::Serialize)]
pub struct ImportResult {
    pub imported: i32,
    pub failed: i32,
    pub errors: Vec<String>,
}

#[tauri::command]
pub async fn import_preceptor_evaluations(
    state: State<'_, DbState>,
    evaluations: Vec<PreceptorEvaluation>
) -> Result<ImportResult, String> {
    let mut imported = 0;
    let mut failed = 0;
    let mut errors: Vec<String> = vec![];

    for eval in evaluations {
        let result = sqlx::query(
            "INSERT INTO preceptor_evaluations (id, student_id, clinical_log_id, preceptor_name, evaluation_date, overall_rating, clinical_skills_rating, professionalism_rating, communication_rating, comments, areas_for_improvement, strengths, status, submitted_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&eval.id)
        .bind(&eval.student_id)
        .bind(&eval.clinical_log_id)
        .bind(&eval.preceptor_name)
        .bind(&eval.evaluation_date)
        .bind(&eval.overall_rating)
        .bind(&eval.clinical_skills_rating)
        .bind(&eval.professionalism_rating)
        .bind(&eval.communication_rating)
        .bind(&eval.comments)
        .bind(&eval.areas_for_improvement)
        .bind(&eval.strengths)
        .bind(&eval.status)
        .bind(&eval.submitted_at)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => imported += 1,
            Err(e) => {
                failed += 1;
                errors.push(format!("Failed to import evaluation for {}: {}", eval.preceptor_name, e));
            }
        }
    }

    Ok(ImportResult { imported, failed, errors })
}
