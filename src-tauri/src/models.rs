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
    pub emergency_contact_name: Option<String>,
    pub emergency_contact_phone: Option<String>,
    pub photo_url: Option<String>,
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
    pub hours: Option<f64>,
    pub is_simulation: Option<i32>,
    pub is_makeup: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub date: String,
    pub title: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub location: Option<String>,
    pub proctor: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
}

// Course for curriculum organization
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Course {
    pub id: String,
    pub code: String, // e.g., "NUR 101"
    pub name: String, // e.g., "Fundamentals of Nursing"
    pub description: Option<String>,
    pub syllabus_url: Option<String>,
    pub content_outline_url: Option<String>,
    pub clinical_manual_url: Option<String>,
    pub semester: Option<String>, // e.g., "Fall", "Spring"
    pub year: Option<i32>,
    pub is_active: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct LessonPlan {
    pub id: String,
    pub date: String,
    pub course_id: Option<String>,
    pub course_name: String,
    pub week_number: Option<i32>,
    pub chapter: Option<String>,
    pub topic: String,
    pub topics_covered: Option<String>, // Comma-separated or JSON
    pub assessment_method: Option<String>, // e.g., "Quiz on Schoology", "Skills check-off"
    pub vbon_tags: Option<String>, // JSON array of VBON regulation IDs
    pub notes: Option<String>,
    pub last_taught_notes: Option<String>,
    pub notes_for_next_time: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LessonPlanWithMaterials {
    #[serde(flatten)]
    pub plan: LessonPlan,
    pub materials: Vec<TeachingMaterial>,
    pub course: Option<Course>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TeachingMaterial {
    pub id: String,
    pub lesson_plan_id: String,
    pub material_type: String,
    pub title: String,
    pub url: String,
    pub description: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Attendance {
    pub id: String,
    pub student_id: String,
    pub date: String,
    pub status: String,
    pub notes: Option<String>,
    pub recorded_at: String,
    pub attendance_type: Option<String>,
    pub hours_attended: Option<f64>,
    pub hours_required: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct MakeupHours {
    pub id: String,
    pub student_id: String,
    pub original_absence_id: Option<String>,
    pub hours_owed: f64,
    pub hours_completed: f64,
    pub reason: Option<String>,
    pub due_date: Option<String>,
    pub completion_date: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MakeupHoursSummary {
    pub student_id: String,
    pub student_name: String,
    pub total_hours_owed: f64,
    pub total_hours_completed: f64,
    pub balance_remaining: f64,
    pub records: Vec<MakeupHours>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StudentCertification {
    pub id: String,
    pub student_id: String,
    pub certification_type: String,
    pub certification_name: String,
    pub issue_date: Option<String>,
    pub expiry_date: String,
    pub status: String,
    pub document_url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct PreceptorEvaluation {
    pub id: String,
    pub student_id: String,
    pub clinical_log_id: Option<String>,
    pub preceptor_name: String,
    pub evaluation_date: String,
    pub overall_rating: Option<i32>,
    pub clinical_skills_rating: Option<i32>,
    pub professionalism_rating: Option<i32>,
    pub communication_rating: Option<i32>,
    pub comments: Option<String>,
    pub areas_for_improvement: Option<String>,
    pub strengths: Option<String>,
    pub status: String,
    pub submitted_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Deadline {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub due_date: String,
    pub deadline_type: String,
    pub related_student_id: Option<String>,
    pub status: String,
    pub priority: String,
    pub created_at: String,
}

// Combined response types for dashboard

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AttendanceSummary {
    pub student_id: String,
    pub student_name: String,
    pub total_absences: i32,
    pub total_tardies: i32,
    pub total_present: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CertificationAlert {
    pub certification: StudentCertification,
    pub student_name: String,
    pub days_until_expiry: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct SkillValidation {
    pub id: String,
    pub student_id: String,
    pub skill_id: String,
    pub proficiency: String,
    pub validated_date: String,
    pub validated_location: Option<String>,
    pub validated_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudentHoursBySite {
    pub site_name: String,
    pub direct_hours: f64,
    pub sim_hours: f64,
    pub total_hours: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudentSimulationSummary {
    pub total_hours: f64,
    pub sim_hours: f64,
    pub direct_hours: f64,
    pub sim_percentage: f64,
    pub is_compliant: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudentFlag {
    pub flag_type: String,
    pub message: String,
    pub severity: String,
    pub related_id: Option<String>,
}

// ==================== CLINICAL TRACKING SYSTEM ====================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalSite {
    pub id: String,
    pub name: String,
    pub address: Option<String>,
    pub contact_name: Option<String>,
    pub contact_phone: Option<String>,
    pub contact_email: Option<String>,
    pub site_type: String,
    pub is_active: Option<i32>,
    pub notes: Option<String>,
    pub created_at: String,
    // VBON-required fields
    pub unit_name: Option<String>,
    pub contact_title: Option<String>,
    pub accrediting_body: Option<String>,
    pub last_accreditation_date: Option<String>,
    pub contract_start_date: Option<String>,
    pub contract_expiration_date: Option<String>,
    pub last_used_date: Option<String>,
    pub max_students_per_day: Option<i32>,
    pub parking_info: Option<String>,
    pub dress_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Preceptor {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub credentials: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub site_id: Option<String>,
    pub is_active: Option<i32>,
    pub notes: Option<String>,
    pub created_at: String,
    pub license_number: Option<String>,
    pub license_state: Option<String>,
    pub license_expiration_date: Option<String>,
    pub last_verification_date: Option<String>,
    pub next_verification_due: Option<String>,
    pub specialties: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PreceptorWithDetails {
    #[serde(flatten)]
    pub preceptor: Preceptor,
    pub site_name: Option<String>,
    pub assigned_students_count: i32,
    pub verification_status: String, // "verified" | "due_soon" | "overdue" | "not_verified"
    pub days_until_due: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PreceptorVerificationAlert {
    pub preceptor_id: String,
    pub preceptor_name: String,
    pub site_name: Option<String>,
    pub license_number: Option<String>,
    pub next_verification_due: Option<String>,
    pub days_until_due: i32,
    pub alert_level: String, // "warning" (30-60 days) | "critical" (< 30 days) | "overdue" (< 0 days)
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalAssignment {
    pub id: String,
    pub student_id: String,
    pub site_id: String,
    pub preceptor_id: Option<String>,
    pub date: String,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub hours: Option<f64>,
    pub objectives: Option<String>,
    pub patient_assignment: Option<String>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClinicalAssignmentWithDetails {
    #[serde(flatten)]
    pub assignment: ClinicalAssignment,
    pub student_name: String,
    pub site_name: String,
    pub preceptor_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VrScenario {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub default_hours: Option<f64>,
    pub is_required: Option<i32>,
    pub course_id: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<i32>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StudentVrCompletion {
    pub id: String,
    pub student_id: String,
    pub scenario_id: String,
    pub completion_date: String,
    pub hours: f64,
    pub score: Option<f64>,
    pub attempts: Option<i32>,
    pub notes: Option<String>,
    pub verified_by: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudentVrSummary {
    pub student_id: String,
    pub student_name: String,
    pub total_vr_hours: f64,
    pub max_allowed_hours: f64,
    pub percentage_used: f64,
    pub is_compliant: bool,
    pub alert_level: String, // "safe" | "warning" | "over_cap"
    pub completed_scenarios: i32,
    pub total_scenarios: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct StudentHourSubmission {
    pub id: String,
    pub student_id: String,
    pub assignment_id: Option<String>,
    pub date: String,
    pub site_name: String,
    pub start_time: String,
    pub end_time: String,
    pub hours: f64,
    pub activities: String,
    pub skills_practiced: Option<String>,
    pub reflection: Option<String>,
    pub status: String,
    pub reviewer_feedback: Option<String>,
    pub reviewed_at: Option<String>,
    pub reviewed_by: Option<String>,
    pub submitted_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StudentHourSubmissionWithStudent {
    #[serde(flatten)]
    pub submission: StudentHourSubmission,
    pub student_name: String,
}

// ==================== INSTRUCTOR CREDENTIALS & COMP HOURS ====================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct InstructorCertification {
    pub id: String,
    pub certification_type: String, // "BLS" | "RN_LICENSE" | "CPR" | "OTHER"
    pub certification_name: String,
    pub license_number: Option<String>,
    pub issuing_authority: Option<String>,
    pub issue_date: Option<String>,
    pub expiry_date: String,
    pub alert_days: i32, // Days before expiry to show alert (60 for BLS, 90 for RN)
    pub status: String, // "Active" | "Expiring Soon" | "Expired"
    pub document_path: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InstructorCertificationAlert {
    pub certification: InstructorCertification,
    pub days_until_expiry: i32,
    pub alert_level: String, // "warning" | "critical" | "expired"
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CompHoursEarned {
    pub id: String,
    pub date: String,
    pub activity_type: String, // "Curriculum planning" | "Parent meeting" | "Weekend training" | etc.
    pub hours: f64,
    pub notes: Option<String>,
    pub expiration_date: Option<String>, // When these hours expire (e.g., end of fiscal year)
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct CompHoursUsed {
    pub id: String,
    pub date: String,
    pub hours: f64,
    pub reason: String, // "Left early" | "Sick day" | "Personal day" | etc.
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompHoursSummary {
    pub total_earned: f64,
    pub total_used: f64,
    pub balance: f64,
    pub earned_this_year: f64,
    pub used_this_year: f64,
    pub expiring_soon: f64, // Hours expiring within 6 months
    pub expiring_date: Option<String>, // Nearest expiration date
    pub days_until_expiry: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompHoursExpirationWarning {
    pub hours: f64,
    pub expiration_date: String,
    pub days_until_expiry: i32,
    pub alert_level: String, // "green" (> 6 months) | "yellow" (3-6 months) | "red" (< 3 months)
}

// ==================== VBON COMPLIANCE MAPPING ====================

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VBONRegulation {
    pub id: String,
    pub code: String, // e.g., "B.1", "B.2", "B.6"
    pub section: String, // e.g., "18VAC90-27-100"
    pub category: String, // e.g., "Curriculum Content", "Clinical Requirements"
    pub title: String, // Short title
    pub description: String, // Full description of the requirement
    pub sort_order: i32,
    pub is_active: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct VBONMapping {
    pub id: String,
    pub regulation_id: String,
    pub syllabus_reference: Option<String>, // Page number or section
    pub lesson_plan_ids: Option<String>, // JSON array of lesson plan IDs
    pub material_links: Option<String>, // JSON array of { title, url, slideNumbers }
    pub assessment_method: Option<String>, // How students were tested
    pub clinical_experience: Option<String>, // Which sites/hours cover this
    pub notes: Option<String>,
    pub coverage_status: String, // "not_covered" | "partial" | "covered"
    pub last_reviewed_date: Option<String>,
    pub reviewed_by: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VBONRegulationWithMapping {
    #[serde(flatten)]
    pub regulation: VBONRegulation,
    pub mapping: Option<VBONMapping>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VBONCategoryStats {
    pub category: String,
    pub total: i32,
    pub covered: i32,
    pub partial: i32,
    pub not_covered: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VBONComplianceSummary {
    pub total_regulations: i32,
    pub covered_count: i32,
    pub partial_count: i32,
    pub not_covered_count: i32,
    pub percentage_complete: f64,
    pub last_audit_date: Option<String>,
    pub regulations_by_category: Vec<VBONCategoryStats>,
}
