use serde::{Deserialize, Serialize};
use sqlx::types::Json;
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Student {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub cohort: String,
    pub status: String,
    pub clinical_hours_completed: f64,
    pub clinical_hours_required: f64,
    pub skills_completed: Json<Vec<String>>,
    pub nclex_predictor_score: Option<f64>,
    pub win_probability: Option<f64>,
    pub remediation_status: Option<String>,
    pub remediation_topic: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub dob: Option<String>,
    pub gpa: Option<f64>,
    pub notes: Option<String>,
    #[sqlx(skip)]
    pub grades: Option<Vec<Grade>>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Grade {
    pub id: String,
    pub student_id: String,
    pub course_id: String,
    pub course_name: String,
    pub grade: f64,
    pub semester: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalLog {
    pub id: String,
    pub student_id: String,
    pub date: String,
    pub site_name: String,
    pub patient_diagnosis: String,
    pub mapped_competencies: Json<Vec<String>>,
    pub status: String,
    pub instructor_feedback: Option<String>,
}
