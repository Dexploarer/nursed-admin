export interface CompetencyStandard {
  id: string;
  code: string;
  category: "VBON" | "NCLEX_PN" | "NCLEX_RN";
  description: string;
  effectiveDate: string;
}

export interface Grade {
  id: string;
  studentId: string;
  courseId: string;
  courseName: string;
  grade: number;
  semester: string;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  cohort: string;
  status: "Active" | "At Risk" | "Graduated";
  clinicalHoursCompleted: number;
  clinicalHoursRequired: number;
  skillsCompleted: string[]; // IDs of competencies
  nclexPredictorScore?: number; // e.g. 850 (HESI) or 72 (ATI)
  winProbability?: number; // e.g. 92%
  remediationStatus?: 'None' | 'Assigned' | 'In Progress' | 'Validated';
  remediationTopic?: string;
  email?: string;
  phone?: string;
  dob?: string;
  gpa?: number;
  notes?: string;
  grades?: Grade[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
}

export interface ClinicalLog {
  id: string;
  studentId: string;
  date: string;
  siteName: string;
  patientDiagnosis: string; // HIPPA compliant (generic)
  mappedCompetencies: string[]; // IDs of standards
  status: "Pending" | "Approved" | "Rejected";
  instructorFeedback?: string;
  hours: number;
  isSimulation: boolean;
  isMakeup: boolean;
}

export interface CourseModule {
  id: string;
  week: number;
  title: string;
  description: string;
  mappedNclexCategories: string[]; // IDs of NCLEX categories
}

// Course for curriculum organization
export interface Course {
  id: string;
  code: string; // e.g., "NUR 101"
  name: string; // e.g., "Fundamentals of Nursing"
  description?: string;
  syllabusUrl?: string;
  contentOutlineUrl?: string;
  clinicalManualUrl?: string;
  semester?: string; // e.g., "Fall", "Spring"
  year?: number;
  isActive?: number; // SQLite boolean
  createdAt: string;
  updatedAt: string;
}

// Lesson Plans for Today's Teaching View
export interface LessonPlan {
  id: string;
  date: string;
  courseId?: string;
  courseName: string;
  weekNumber?: number;
  chapter?: string;
  topic: string;
  topicsCovered?: string; // Comma-separated or JSON
  assessmentMethod?: string; // e.g., "Quiz on Schoology", "Skills check-off"
  vbonTags?: string; // JSON array of VBON regulation IDs
  notes?: string;
  lastTaughtNotes?: string;
  notesForNextTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingMaterial {
  id: string;
  lessonPlanId: string;
  materialType: 'powerpoint' | 'worksheet' | 'video' | 'ati' | 'link' | 'pdf';
  title: string;
  url: string;
  description?: string;
  sortOrder: number;
}

export interface LessonPlanWithMaterials {
  plan: LessonPlan;
  materials: TeachingMaterial[];
  course?: Course;
}

// Attendance Tracking
export interface Attendance {
  id: string;
  studentId: string;
  date: string;
  status: 'Present' | 'Absent' | 'Tardy' | 'Excused' | 'Partial';
  notes?: string;
  recordedAt: string;
  attendanceType: 'classroom' | 'clinical';
  hoursAttended?: number;
  hoursRequired?: number;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalAbsences: number;
  totalTardies: number;
  totalPresent: number;
  classroomAbsences?: number;
  classroomTardies?: number;
  clinicalAbsences?: number;
  clinicalTardies?: number;
}

// Makeup Hours Tracking
export interface MakeupHours {
  id: string;
  studentId: string;
  originalAbsenceId?: string;
  hoursOwed: number;
  hoursCompleted: number;
  reason?: string;
  dueDate?: string;
  completionDate?: string;
  status: 'pending' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MakeupHoursSummary {
  studentId: string;
  studentName: string;
  totalHoursOwed: number;
  totalHoursCompleted: number;
  balanceRemaining: number;
  records: MakeupHours[];
}

// Student Certifications (BLS, immunizations, etc.)
export interface StudentCertification {
  id: string;
  studentId: string;
  certificationType: 'BLS' | 'CPR' | 'Immunization' | 'Background Check' | 'Drug Screen' | 'Other';
  certificationName: string;
  issueDate?: string;
  expiryDate: string;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Pending';
  documentUrl?: string;
  notes?: string;
}

export interface CertificationAlert {
  certification: StudentCertification;
  studentName: string;
  daysUntilExpiry: number;
}

// Preceptor Evaluations
export interface PreceptorEvaluation {
  id: string;
  studentId: string;
  clinicalLogId?: string;
  preceptorName: string;
  evaluationDate: string;
  overallRating?: number;
  clinicalSkillsRating?: number;
  professionalismRating?: number;
  communicationRating?: number;
  comments?: string;
  areasForImprovement?: string;
  strengths?: string;
  status: 'Pending' | 'Reviewed' | 'Acknowledged';
  submittedAt: string;
}

// Deadlines
export interface Deadline {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  deadlineType: 'clinical_eval' | 'skills_assessment' | 'certification' | 'paperwork' | 'exam' | 'other';
  relatedStudentId?: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
}

// Calendar Event (matches backend)
export interface CalendarEvent {
  id: number;
  date: Date;
  title: string;
  type: 'clinical' | 'exam' | 'school';
  location?: string;
  proctor?: string;
  status?: string;
  description?: string;
}

// Skill Validations
export interface SkillValidation {
  id: string;
  studentId: string;
  skillId: string;
  proficiency: 'not-started' | 'beginner' | 'competent' | 'proficient' | 'expert';
  validatedDate: string;
  validatedLocation?: string;
  validatedBy?: string;
  notes?: string;
  createdAt: string;
}

// Student Hours Summary
export interface StudentHoursSummary {
  totalHours: number;
  directHours: number;
  simHours: number;
  simPercentage: number;
  isCompliant: boolean;
  hoursBySite: Array<{
    siteName: string;
    directHours: number;
    simHours: number;
    totalHours: number;
  }>;
}

// Student Flags
export interface StudentFlags {
  studentId: string;
  flags: Array<{
    type: 'clinical_behind' | 'simulation_over' | 'attendance' | 'certification_expiring' | 'at_risk';
    severity: 'warning' | 'critical';
    message: string;
    details?: string;
  }>;
}

// Preceptor Management
export interface Preceptor {
  id: string;
  firstName: string;
  lastName: string;
  credentials?: string;
  email?: string;
  phone?: string;
  siteId?: string;
  isActive?: number;
  notes?: string;
  createdAt: string;
  licenseNumber?: string;
  licenseState?: string;
  licenseExpirationDate?: string;
  lastVerificationDate?: string;
  nextVerificationDue?: string;
  specialties?: string;
}

export interface PreceptorWithDetails extends Preceptor {
  siteName?: string;
  assignedStudentsCount: number;
  verificationStatus: 'verified' | 'due_soon' | 'overdue' | 'not_verified';
  daysUntilDue?: number;
}

export interface PreceptorVerificationAlert {
  preceptorId: string;
  preceptorName: string;
  siteName?: string;
  licenseNumber?: string;
  nextVerificationDue?: string;
  daysUntilDue: number;
  alertLevel: 'warning' | 'critical' | 'overdue';
}

// Clinical Sites
export interface ClinicalSite {
  id: string;
  name: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  siteType: string;
  isActive?: number;
  notes?: string;
  createdAt: string;
  // VBON-required fields
  unitName?: string;
  contactTitle?: string;
  accreditingBody?: string;
  lastAccreditationDate?: string;
  contractStartDate?: string;
  contractExpirationDate?: string;
  lastUsedDate?: string;
  maxStudentsPerDay?: number;
  parkingInfo?: string;
  dressCode?: string;
}

// Clinical Site Contract Alert
export interface ClinicalSiteContractAlert {
  site: ClinicalSite;
  daysUntilExpiry: number;
  alertLevel: 'warning' | 'critical' | 'expired';
}

// Clinical Site Usage Statistics
export interface ClinicalSiteUsageStats {
  siteId: string;
  studentsAssigned: number;
  totalHoursLogged: number;
  lastUsedDate?: string;
}

// Clinical Assignments (scheduled rotations)
export interface ClinicalAssignment {
  id: string;
  studentId: string;
  siteId: string;
  preceptorId?: string;
  date: string;
  startTime?: string; // '07:00'
  endTime?: string; // '15:00'
  hours?: number;
  objectives?: string;
  patientAssignment?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface ClinicalAssignmentWithDetails extends ClinicalAssignment {
  studentName: string;
  siteName: string;
  preceptorName?: string;
}

// VR Scenarios (configurable list of required VR simulations)
export interface VrScenario {
  id: string;
  name: string;
  description?: string;
  category?: string; // 'cardiac' | 'respiratory' | 'emergency' | 'pediatric' | etc.
  defaultHours?: number;
  isRequired?: number; // SQLite boolean
  courseId?: string;
  sortOrder?: number;
  isActive?: number; // SQLite boolean
  createdAt: string;
}

// Student VR Completions
export interface StudentVrCompletion {
  id: string;
  studentId: string;
  scenarioId: string;
  completionDate: string;
  hours: number;
  score?: number; // Optional: 0-100 score
  attempts?: number;
  notes?: string;
  verifiedBy?: string;
  createdAt: string;
}

// Student VR Summary (for tracking compliance)
export interface StudentVrSummary {
  studentId: string;
  studentName: string;
  totalVrHours: number;
  maxAllowedHours: number; // 100h per VBON
  percentageUsed: number;
  isCompliant: boolean;
  alertLevel: 'safe' | 'warning' | 'over_cap'; // safe (<80h), warning (80-100h), over_cap (>100h)
  completedScenarios: number;
  totalScenarios: number;
}

// Student Hour Submissions (for approval workflow)
export interface StudentHourSubmission {
  id: string;
  studentId: string;
  assignmentId?: string; // Links to clinical_assignment if scheduled
  date: string;
  siteName: string;
  startTime: string;
  endTime: string;
  hours: number;
  activities: string;
  skillsPracticed?: string; // JSON array
  reflection?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerFeedback?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  submittedAt: string;
}

export interface StudentHourSubmissionWithStudent extends StudentHourSubmission {
  studentName: string;
}

// ==================== INSTRUCTOR CREDENTIALS & COMP HOURS ====================

// Instructor Certifications (BLS, RN License, etc.)
export interface InstructorCertification {
  id: string;
  certificationType: 'BLS' | 'RN_LICENSE' | 'CPR' | 'OTHER';
  certificationName: string;
  licenseNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate: string;
  alertDays: number; // Days before expiry to show alert (60 for BLS, 90 for RN)
  status: 'Active' | 'Expiring Soon' | 'Expired';
  documentPath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstructorCertificationAlert {
  certification: InstructorCertification;
  daysUntilExpiry: number;
  alertLevel: 'warning' | 'critical' | 'expired';
}

// Comp Hours Tracking
export interface CompHoursEarned {
  id: string;
  date: string;
  activityType: string; // "Curriculum planning" | "Parent meeting" | "Weekend training" | etc.
  hours: number;
  notes?: string;
  expirationDate?: string; // When these hours expire (e.g., end of fiscal year)
  createdAt: string;
}

export interface CompHoursUsed {
  id: string;
  date: string;
  hours: number;
  reason: string; // "Left early" | "Sick day" | "Personal day" | etc.
  notes?: string;
  createdAt: string;
}

export interface CompHoursSummary {
  totalEarned: number;
  totalUsed: number;
  balance: number;
  earnedThisYear: number;
  usedThisYear: number;
  expiringSoon: number; // Hours expiring within 6 months
  expiringDate?: string; // Nearest expiration date
  daysUntilExpiry?: number;
}

export interface CompHoursExpirationWarning {
  hours: number;
  expirationDate: string;
  daysUntilExpiry: number;
  alertLevel: 'green' | 'yellow' | 'red'; // green (> 6 months) | yellow (3-6 months) | red (< 3 months)
}

// ==================== VBON COMPLIANCE MAPPING ====================

// VBON Regulation from Virginia Board of Nursing
export interface VBONRegulation {
  id: string;
  code: string; // e.g., "B.1", "B.2", "B.6"
  section: string; // e.g., "18VAC90-27-100", main section reference
  category: string; // e.g., "Curriculum Content", "Clinical Requirements", "Faculty Requirements"
  title: string; // Short title, e.g., "Adult Medical/Surgical Nursing"
  description: string; // Full description of the requirement
  sortOrder: number;
  isActive: number; // SQLite boolean
  createdAt: string;
  updatedAt: string;
}

// VBON Mapping - How a regulation is covered
export interface VBONMapping {
  id: string;
  regulationId: string;
  syllabusReference?: string; // Page number or section, e.g., "Page 12, Section 3.2"
  lessonPlanIds?: string; // JSON array of lesson plan IDs
  materialLinks?: string; // JSON array of { title: string, url: string, slideNumbers?: string }
  assessmentMethod?: string; // How students were tested, e.g., "Unit 3 Exam, Clinical Skills Check-off"
  clinicalExperience?: string; // Which sites/hours cover this, e.g., "Med-Surg rotation at Memorial Hospital (40 hrs)"
  notes?: string;
  coverageStatus: 'not_covered' | 'partial' | 'covered';
  lastReviewedDate?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Combined view for display
export interface VBONRegulationWithMapping extends VBONRegulation {
  mapping?: VBONMapping;
  linkedLessonPlans?: LessonPlan[];
  materialLinksParsed?: Array<{ title: string; url: string; slideNumbers?: string }>;
}

// VBON Compliance Summary
export interface VBONComplianceSummary {
  totalRegulations: number;
  coveredCount: number;
  partialCount: number;
  notCoveredCount: number;
  percentageComplete: number;
  lastAuditDate?: string;
  regulationsByCategory: Array<{
    category: string;
    total: number;
    covered: number;
    partial: number;
    notCovered: number;
  }>;
}
