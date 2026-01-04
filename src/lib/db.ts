import { invoke } from '@tauri-apps/api/core';
import {
  Student, ClinicalLog, Grade, CalendarEvent,
  Course, LessonPlan, LessonPlanWithMaterials, TeachingMaterial,
  Attendance, AttendanceSummary, StudentCertification, CertificationAlert,
  PreceptorEvaluation, Deadline, SkillValidation, StudentHoursSummary, StudentFlags,
  MakeupHours, MakeupHoursSummary,
  Preceptor, PreceptorWithDetails, PreceptorVerificationAlert,
  ClinicalSite, ClinicalSiteUsageStats,
  ClinicalAssignment, ClinicalAssignmentWithDetails,
  VrScenario, StudentVrCompletion, StudentVrSummary,
  StudentHourSubmission, StudentHourSubmissionWithStudent,
  InstructorCertification, InstructorCertificationAlert,
  CompHoursEarned, CompHoursUsed, CompHoursSummary, CompHoursExpirationWarning,
  VBONRegulation, VBONMapping, VBONRegulationWithMapping, VBONComplianceSummary
} from '@/types';
import { seedStudents, seedLogs, seedEvents } from './data';

export const loadStudents = async (): Promise<Student[]> => {
    const students = await invoke<Student[]>('get_all_students');
    return students;
};

// Separate function for initial database seeding (call manually if needed)
export const seedDatabase = async (): Promise<void> => {
    const students = await invoke<Student[]>('get_all_students');
    
    if (students.length === 0) {
        console.log('Seeding database...');
        // Seed Students
        for (const s of seedStudents) {
            await invoke('create_student', { student: s });
        }
        // Seed Logs
        for (const log of seedLogs) {
             await invoke('add_clinical_log', { log });
        }
        // Seed Events
        for (const event of seedEvents) {
            await invoke('add_event', { event: {
                id: event.id.toString(),
                date: event.date.toISOString(),
                title: event.title,
                event_type: event.type,
                location: event.location,
                proctor: event.proctor,
                status: event.status
            }});
        }
    }
};

export const enrollStudent = async (student: Student) => {
    await invoke('create_student', { student });
};

export const getStudent = async (id: string): Promise<Student | null> => {
    return await invoke<Student | null>('get_student_details', { id });
};

export const updateStudentNotes = async (id: string, notes: string) => {
    await invoke('update_student_notes', { id, notes });
};

export const getClinicalLogs = async (studentId: string): Promise<ClinicalLog[]> => {
    return await invoke<ClinicalLog[]>('get_clinical_logs', { studentId });
};

export const indexDocument = async (id: string, text: string, _metadata: Record<string, unknown> = {}) => {
    // Note: metadata handling is simplified here as the rust command might need specific structure
    // We invoke the command with just id and text for now
    await invoke('index_document', { id, text });
};

export const searchDocuments = async (query: string): Promise<string[]> => {
    return await invoke<string[]>('search_documents', { query });
};

export const updateStudentSkills = async (id: string, skills: string[]) => {
    await invoke('update_student_skills', { id, skills });
};

export const getStudentSkills = async (id: string): Promise<string[]> => {
    return await invoke<string[]>('get_student_skills', { id });
};

export const updateStudent = async (student: Student) => {
    await invoke('update_student', { student });
};

export const approveClinicalLog = async (logId: string) => {
    await invoke('approve_clinical_log', { logId });
};

export const addClinicalLog = async (log: ClinicalLog) => {
    await invoke('add_clinical_log', { log });
};

export const addGrade = async (grade: Grade) => {
    await invoke('add_grade', { grade });
};

export const addEvent = async (event: CalendarEvent) => {
    await invoke('add_event', { event: {
        id: event.id.toString(),
        date: event.date.toISOString(),
        title: event.title,
        event_type: event.type,
        location: event.location,
        proctor: event.proctor,
        status: event.status,
        description: event.description
    }});
};

export const getEvents = async (): Promise<CalendarEvent[]> => {
    const events = await invoke<any[]>('get_all_events');
    return events.map(e => ({
        ...e,
        id: parseInt(e.id) || Date.now(),
        date: new Date(e.date),
        type: e.event_type
    }));
};

export const updateEvent = async (event: CalendarEvent) => {
    await invoke('update_event', { event: {
        id: event.id.toString(),
        date: event.date.toISOString(),
        title: event.title,
        event_type: event.type,
        location: event.location,
        proctor: event.proctor,
        status: event.status,
        description: event.description
    }});
};

export const deleteEvent = async (id: string) => {
    await invoke('delete_event', { id: id.toString() });
};

export const deleteStudent = async (id: string) => {
    await invoke('delete_student', { id });
};

export const updateClinicalLog = async (log: ClinicalLog) => {
    await invoke('update_clinical_log', { log });
};

export const deleteClinicalLog = async (logId: string) => {
    await invoke('delete_clinical_log', { logId });
};

export const updateGrade = async (grade: Grade) => {
    await invoke('update_grade', { grade });
};

export const deleteGrade = async (gradeId: string) => {
    await invoke('delete_grade', { gradeId });
};

// ==================== LESSON PLANS ====================

export const getTodaysLessonPlan = async (date: string): Promise<LessonPlanWithMaterials | null> => {
    return await invoke<LessonPlanWithMaterials | null>('get_todays_lesson_plan', { date });
};

export const getAllLessonPlans = async (): Promise<LessonPlan[]> => {
    return await invoke<LessonPlan[]>('get_all_lesson_plans');
};

export const createLessonPlan = async (lessonPlan: LessonPlan) => {
    await invoke('create_lesson_plan', { lessonPlan });
};

export const updateLessonPlan = async (lessonPlan: LessonPlan) => {
    await invoke('update_lesson_plan', { lessonPlan });
};

export const deleteLessonPlan = async (id: string) => {
    await invoke('delete_lesson_plan', { id });
};

// ==================== TEACHING MATERIALS ====================

export const addTeachingMaterial = async (material: TeachingMaterial) => {
    await invoke('add_teaching_material', { material });
};

export const updateTeachingMaterial = async (material: TeachingMaterial) => {
    await invoke('update_teaching_material', { material });
};

export const deleteTeachingMaterial = async (id: string) => {
    await invoke('delete_teaching_material', { id });
};

export const getMaterialsForLesson = async (lessonPlanId: string): Promise<TeachingMaterial[]> => {
    return await invoke<TeachingMaterial[]>('get_materials_for_lesson', { lessonPlanId });
};

// ==================== ATTENDANCE ====================

export const recordAttendance = async (attendance: Attendance) => {
    await invoke('record_attendance', { attendance });
};

export const bulkRecordAttendance = async (records: Attendance[]) => {
    await invoke('bulk_record_attendance', { records });
};

export const getAttendanceForDate = async (date: string): Promise<Attendance[]> => {
    return await invoke<Attendance[]>('get_attendance_for_date', { date });
};

export const getStudentAttendance = async (studentId: string): Promise<Attendance[]> => {
    return await invoke<Attendance[]>('get_student_attendance', { studentId });
};

export const getStudentsWithAttendanceIssues = async (minAbsences: number = 2): Promise<AttendanceSummary[]> => {
    return await invoke<AttendanceSummary[]>('get_students_with_attendance_issues', { minAbsences });
};

export const getStudentAttendanceDetail = async (studentId: string): Promise<Attendance[]> => {
    return await invoke<Attendance[]>('get_student_attendance_detail', { studentId });
};

// ==================== MAKEUP HOURS ====================

export const addMakeupHours = async (record: MakeupHours) => {
    await invoke('add_makeup_hours', { record });
};

export const updateMakeupHours = async (record: MakeupHours) => {
    await invoke('update_makeup_hours', { record });
};

export const getStudentMakeupHours = async (studentId: string): Promise<MakeupHours[]> => {
    return await invoke<MakeupHours[]>('get_student_makeup_hours', { studentId });
};

export const getAllMakeupHoursSummaries = async (): Promise<MakeupHoursSummary[]> => {
    return await invoke<MakeupHoursSummary[]>('get_all_makeup_hours_summaries');
};

export const deleteMakeupHours = async (id: string) => {
    await invoke('delete_makeup_hours', { id });
};

export const autoCreateMakeupHours = async (
    attendanceId: string,
    studentId: string,
    hoursMissed: number,
    reason?: string
): Promise<MakeupHours> => {
    return await invoke<MakeupHours>('auto_create_makeup_hours', {
        attendanceId,
        studentId,
        hoursMissed,
        reason
    });
};

// ==================== CERTIFICATIONS ====================

export const addCertification = async (cert: StudentCertification) => {
    await invoke('add_certification', { cert });
};

export const updateCertification = async (cert: StudentCertification) => {
    await invoke('update_certification', { cert });
};

export const deleteCertification = async (id: string) => {
    await invoke('delete_certification', { id });
};

export const getStudentCertifications = async (studentId: string): Promise<StudentCertification[]> => {
    return await invoke<StudentCertification[]>('get_student_certifications', { studentId });
};

export const getExpiringCertifications = async (daysAhead: number = 30): Promise<CertificationAlert[]> => {
    return await invoke<CertificationAlert[]>('get_expiring_certifications', { daysAhead });
};

// ==================== PRECEPTOR EVALUATIONS ====================

export const addPreceptorEvaluation = async (evaluation: PreceptorEvaluation) => {
    await invoke('add_preceptor_evaluation', { eval: evaluation });
};

export const updatePreceptorEvaluation = async (evaluation: PreceptorEvaluation) => {
    await invoke('update_preceptor_evaluation', { eval: evaluation });
};

export const getPendingEvaluations = async (): Promise<PreceptorEvaluation[]> => {
    return await invoke<PreceptorEvaluation[]>('get_pending_evaluations');
};

export const getStudentEvaluations = async (studentId: string): Promise<PreceptorEvaluation[]> => {
    return await invoke<PreceptorEvaluation[]>('get_student_evaluations', { studentId });
};

export const reviewEvaluation = async (id: string, status: string) => {
    await invoke('review_evaluation', { id, status });
};

// ==================== DEADLINES ====================

export const addDeadline = async (deadline: Deadline) => {
    await invoke('add_deadline', { deadline });
};

export const updateDeadline = async (deadline: Deadline) => {
    await invoke('update_deadline', { deadline });
};

export const deleteDeadline = async (id: string) => {
    await invoke('delete_deadline', { id });
};

export const getUpcomingDeadlines = async (daysAhead: number = 14): Promise<Deadline[]> => {
    return await invoke<Deadline[]>('get_upcoming_deadlines', { daysAhead });
};

export const getAllDeadlines = async (): Promise<Deadline[]> => {
    return await invoke<Deadline[]>('get_all_deadlines');
};

export const completeDeadline = async (id: string) => {
    await invoke('complete_deadline', { id });
};

// ==================== CLINICAL HOURS ====================

export const getStudentHoursSummary = async (studentId: string): Promise<StudentHoursSummary> => {
    return await invoke<StudentHoursSummary>('get_student_hours_summary', { studentId });
};

export const getStudentHoursBySite = async (studentId: string) => {
    return await invoke('get_student_hours_by_site', { studentId });
};

// ==================== SKILL VALIDATIONS ====================

export const saveSkillValidation = async (validation: SkillValidation): Promise<void> => {
    await invoke('save_skill_validation', { validation });
};

export const getSkillValidations = async (studentId: string): Promise<SkillValidation[]> => {
    return await invoke<SkillValidation[]>('get_skill_validations', { studentId });
};

// ==================== STUDENT FLAGS ====================

export const getStudentFlags = async (studentId: string): Promise<StudentFlags> => {
    return await invoke<StudentFlags>('get_student_flags', { studentId });
};

// ==================== PRECEPTOR MANAGEMENT ====================

export const addPreceptor = async (preceptor: Preceptor) => {
    await invoke('add_preceptor', { preceptor });
};

export const getAllPreceptors = async (): Promise<Preceptor[]> => {
    return await invoke<Preceptor[]>('get_all_preceptors');
};

export const getPreceptorById = async (id: string): Promise<Preceptor | null> => {
    return await invoke<Preceptor | null>('get_preceptor_by_id', { id });
};

export const getPreceptorsBysite = async (siteId: string): Promise<Preceptor[]> => {
    return await invoke<Preceptor[]>('get_preceptors_by_site', { siteId });
};

export const updatePreceptor = async (preceptor: Preceptor) => {
    await invoke('update_preceptor', { preceptor });
};

export const deletePreceptor = async (id: string) => {
    await invoke('delete_preceptor', { id });
};

export const verifyPreceptorLicense = async (id: string) => {
    await invoke('verify_preceptor_license', { id });
};

export const getPreceptorsWithDetails = async (): Promise<PreceptorWithDetails[]> => {
    return await invoke<PreceptorWithDetails[]>('get_preceptors_with_details');
};

export const getPreceptorsNeedingVerification = async (daysAhead: number = 60): Promise<PreceptorVerificationAlert[]> => {
    return await invoke<PreceptorVerificationAlert[]>('get_preceptors_needing_verification', { daysAhead });
};

// ==================== CLINICAL SITES ====================

export const addClinicalSite = async (site: ClinicalSite) => {
    await invoke('add_clinical_site', { site });
};

export const getAllClinicalSites = async (): Promise<ClinicalSite[]> => {
    return await invoke<ClinicalSite[]>('get_all_clinical_sites');
};

export const updateClinicalSite = async (site: ClinicalSite) => {
    await invoke('update_clinical_site', { site });
};

export const deleteClinicalSite = async (id: string) => {
    await invoke('delete_clinical_site', { id });
};

export const getSitesWithExpiringContracts = async (daysThreshold: number = 90): Promise<ClinicalSite[]> => {
    return await invoke<ClinicalSite[]>('get_sites_with_expiring_contracts', { daysThreshold });
};

export const getSiteUsageStats = async (siteId: string): Promise<ClinicalSiteUsageStats> => {
    return await invoke<ClinicalSiteUsageStats>('get_site_usage_stats', { siteId });
};

export const updateSiteLastUsed = async (siteId: string) => {
    await invoke('update_site_last_used', { siteId });
};

// ==================== CLINICAL ASSIGNMENTS ====================

export const createClinicalAssignment = async (assignment: ClinicalAssignment) => {
    await invoke('create_clinical_assignment', { assignment });
};

export const bulkCreateAssignments = async (assignments: ClinicalAssignment[]) => {
    await invoke('bulk_create_assignments', { assignments });
};

export const getAssignmentsForDate = async (date: string): Promise<ClinicalAssignmentWithDetails[]> => {
    return await invoke<ClinicalAssignmentWithDetails[]>('get_assignments_for_date', { date });
};

export const getAssignmentsForWeek = async (startDate: string, endDate: string): Promise<ClinicalAssignmentWithDetails[]> => {
    return await invoke<ClinicalAssignmentWithDetails[]>('get_assignments_for_week', { startDate, endDate });
};

export const getStudentAssignments = async (studentId: string): Promise<ClinicalAssignmentWithDetails[]> => {
    return await invoke<ClinicalAssignmentWithDetails[]>('get_student_assignments', { studentId });
};

export const updateAssignment = async (assignment: ClinicalAssignment) => {
    await invoke('update_assignment', { assignment });
};

export const cancelAssignment = async (id: string, reason?: string) => {
    await invoke('cancel_assignment', { id, reason });
};

export const completeAssignment = async (id: string) => {
    await invoke('complete_assignment', { id });
};

// ==================== VR SCENARIOS ====================

export const addVrScenario = async (scenario: VrScenario) => {
    await invoke('add_vr_scenario', { scenario });
};

export const getAllVrScenarios = async (): Promise<VrScenario[]> => {
    return await invoke<VrScenario[]>('get_all_vr_scenarios');
};

export const updateVrScenario = async (scenario: VrScenario) => {
    await invoke('update_vr_scenario', { scenario });
};

export const deleteVrScenario = async (id: string) => {
    await invoke('delete_vr_scenario', { id });
};

// ==================== VR COMPLETIONS ====================

export const saveVrCompletion = async (completion: StudentVrCompletion) => {
    await invoke('save_vr_completion', { completion });
};

export const getStudentVrCompletions = async (studentId: string): Promise<StudentVrCompletion[]> => {
    return await invoke<StudentVrCompletion[]>('get_student_vr_completions', { studentId });
};

export const getStudentVrSummary = async (studentId: string): Promise<StudentVrSummary> => {
    return await invoke<StudentVrSummary>('get_student_vr_summary', { studentId });
};

// ==================== STUDENT HOUR SUBMISSIONS ====================

export const submitHours = async (submission: StudentHourSubmission) => {
    await invoke('submit_hours', { submission });
};

export const getPendingSubmissions = async (): Promise<StudentHourSubmissionWithStudent[]> => {
    return await invoke<StudentHourSubmissionWithStudent[]>('get_pending_submissions');
};

export const getStudentSubmissions = async (studentId: string): Promise<StudentHourSubmission[]> => {
    return await invoke<StudentHourSubmission[]>('get_student_submissions', { studentId });
};

export const approveSubmission = async (id: string, feedback?: string) => {
    await invoke('approve_submission', { id, feedback });
};

export const rejectSubmission = async (id: string, feedback: string) => {
    await invoke('reject_submission', { id, feedback });
};

// ==================== INSTRUCTOR CERTIFICATIONS ====================

export const addInstructorCertification = async (cert: InstructorCertification) => {
    await invoke('add_instructor_certification', { cert });
};

export const updateInstructorCertification = async (cert: InstructorCertification) => {
    await invoke('update_instructor_certification', { cert });
};

export const deleteInstructorCertification = async (id: string) => {
    await invoke('delete_instructor_certification', { id });
};

export const getAllInstructorCertifications = async (): Promise<InstructorCertification[]> => {
    return await invoke<InstructorCertification[]>('get_all_instructor_certifications');
};

export const getInstructorCertificationAlerts = async (): Promise<InstructorCertificationAlert[]> => {
    return await invoke<InstructorCertificationAlert[]>('get_instructor_certification_alerts');
};

// ==================== COMP HOURS ====================

export const addCompHoursEarned = async (entry: CompHoursEarned) => {
    await invoke('add_comp_hours_earned', { entry });
};

export const getAllCompHoursEarned = async (): Promise<CompHoursEarned[]> => {
    return await invoke<CompHoursEarned[]>('get_all_comp_hours_earned');
};

export const deleteCompHoursEarned = async (id: string) => {
    await invoke('delete_comp_hours_earned', { id });
};

export const addCompHoursUsed = async (entry: CompHoursUsed) => {
    await invoke('add_comp_hours_used', { entry });
};

export const getAllCompHoursUsed = async (): Promise<CompHoursUsed[]> => {
    return await invoke<CompHoursUsed[]>('get_all_comp_hours_used');
};

export const deleteCompHoursUsed = async (id: string) => {
    await invoke('delete_comp_hours_used', { id });
};

export const getCompHoursSummary = async (): Promise<CompHoursSummary> => {
    return await invoke<CompHoursSummary>('get_comp_hours_summary');
};

export const getCompHoursExpirationWarnings = async (): Promise<CompHoursExpirationWarning[]> => {
    return await invoke<CompHoursExpirationWarning[]>('get_comp_hours_expiration_warnings');
};

// ==================== COURSES ====================

export const addCourse = async (course: Course) => {
    await invoke('add_course', { course });
};

export const getAllCourses = async (): Promise<Course[]> => {
    return await invoke<Course[]>('get_all_courses');
};

export const getCourseById = async (id: string): Promise<Course | null> => {
    return await invoke<Course | null>('get_course_by_id', { id });
};

export const updateCourse = async (course: Course) => {
    await invoke('update_course', { course });
};

export const deleteCourse = async (id: string) => {
    await invoke('delete_course', { id });
};

export const getLessonPlansByCourse = async (courseId: string): Promise<LessonPlan[]> => {
    return await invoke<LessonPlan[]>('get_lesson_plans_by_course', { courseId });
};

export const getLessonPlansByWeek = async (startDate: string, endDate: string): Promise<LessonPlanWithMaterials[]> => {
    return await invoke<LessonPlanWithMaterials[]>('get_lesson_plans_by_week', { startDate, endDate });
};

export const getLessonPlanWithMaterials = async (id: string): Promise<LessonPlanWithMaterials | null> => {
    return await invoke<LessonPlanWithMaterials | null>('get_lesson_plan_with_materials', { id });
};

// ==================== VBON COMPLIANCE MAPPING ====================

export const getAllVBONRegulations = async (): Promise<VBONRegulation[]> => {
    return await invoke<VBONRegulation[]>('get_all_vbon_regulations');
};

export const addVBONRegulation = async (regulation: VBONRegulation) => {
    await invoke('add_vbon_regulation', { regulation });
};

export const seedVBONRegulations = async (regulations: VBONRegulation[]) => {
    await invoke('seed_vbon_regulations', { regulations });
};

export const getVBONRegulationsWithMappings = async (): Promise<VBONRegulationWithMapping[]> => {
    return await invoke<VBONRegulationWithMapping[]>('get_vbon_regulations_with_mappings');
};

export const getVBONMapping = async (regulationId: string): Promise<VBONMapping | null> => {
    return await invoke<VBONMapping | null>('get_vbon_mapping', { regulationId });
};

export const upsertVBONMapping = async (mapping: VBONMapping) => {
    await invoke('upsert_vbon_mapping', { mapping });
};

export const getVBONComplianceSummary = async (): Promise<VBONComplianceSummary> => {
    return await invoke<VBONComplianceSummary>('get_vbon_compliance_summary');
};

export const deleteVBONMapping = async (regulationId: string) => {
    await invoke('delete_vbon_mapping', { regulationId });
};

// ==================== FILE MANAGEMENT ====================

export interface FileUploadResult {
    filePath: string;
}

export type FileResourceType = 'student_photos' | 'student_certs' | 'instructor_certs';

/**
 * Save a file to the app's local storage
 * @param file - File object from input/drag-drop
 * @param resourceType - Type of resource (student_photos, student_certs, instructor_certs)
 * @param resourceId - ID of the associated record (studentId, certId, etc.)
 * @returns The saved file path
 */
export const saveFile = async (
    file: File,
    resourceType: FileResourceType,
    resourceId: string
): Promise<string> => {
    // Convert File to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const fileData = Array.from(new Uint8Array(arrayBuffer));

    return await invoke<string>('save_file', {
        fileData,
        resourceType,
        resourceId,
        filename: file.name
    });
};

/**
 * Delete a file from app's local storage
 * @param filePath - Full path to the file
 */
export const deleteFile = async (filePath: string): Promise<void> => {
    await invoke('delete_file', { filePath });
};

/**
 * List all files for a resource
 * @param resourceType - Type of resource
 * @param resourceId - ID of the associated record
 * @returns Array of file paths
 */
export const listFiles = async (
    resourceType: FileResourceType,
    resourceId: string
): Promise<string[]> => {
    return await invoke<string[]>('list_files', { resourceType, resourceId });
};

/**
 * Get file contents as base64 string (useful for displaying images)
 * @param filePath - Full path to the file
 * @returns Base64 encoded file contents
 */
export const getFileAsBase64 = async (filePath: string): Promise<string> => {
    return await invoke<string>('get_file_as_base64', { filePath });
};

/**
 * Convert a local file path to a data URL for display
 * @param filePath - Full path to the file
 * @param mimeType - MIME type of the file (e.g., 'image/jpeg')
 * @returns Data URL string
 */
export const getFileAsDataUrl = async (filePath: string, mimeType: string): Promise<string> => {
    const base64 = await getFileAsBase64(filePath);
    return `data:${mimeType};base64,${base64}`;
};

// ==================== BULK IMPORT ====================

export interface ImportResult {
    imported: number;
    failed: number;
    errors: string[];
}

/**
 * Bulk import preceptor evaluations from CSV data
 * @param evaluations - Array of PreceptorEvaluation objects
 * @returns Import result with success/failure counts
 */
export const importPreceptorEvaluations = async (
    evaluations: PreceptorEvaluation[]
): Promise<ImportResult> => {
    return await invoke<ImportResult>('import_preceptor_evaluations', { evaluations });
};
