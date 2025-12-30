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
}

export interface CourseModule {
  id: string;
  week: number;
  title: string;
  description: string;
  mappedNclexCategories: string[]; // IDs of NCLEX categories
}
