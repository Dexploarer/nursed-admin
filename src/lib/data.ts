import { CompetencyStandard, Student, ClinicalLog, CourseModule } from '@/types';

export const seedStudents: Student[] = [
  {
    id: 'S001',
    firstName: 'Sarah',
    lastName: 'Miller',
    cohort: 'Fall 2025',
    status: 'Active',
    clinicalHoursCompleted: 120,
    clinicalHoursRequired: 400,
    skillsCompleted: ['C001', 'C002'],
    nclexPredictorScore: 92,
    winProbability: 95,
    remediationStatus: 'Validated',
    remediationTopic: 'Phlebotomy',
    email: 'sarah.miller@pctc.edu',
    phone: '(540) 555-0123',
    dob: '2004-05-12',
    gpa: 3.8,
    notes: 'Exemplary clinical judgment. Aspires to work in ICU.',
    grades: [
      { id: 'GR1', studentId: 'S001', courseId: 'N101', courseName: 'Foundations of Nursing', grade: 94, semester: 'Fall 2024' },
      { id: 'GR2', studentId: 'S001', courseId: 'N102', courseName: 'Pharmacology I', grade: 88, semester: 'Fall 2024' },
    ]
  },
  {
    id: 'S002',
    firstName: 'James',
    lastName: 'Rodriguez',
    cohort: 'Fall 2025',
    status: 'At Risk',
    clinicalHoursCompleted: 90,
    clinicalHoursRequired: 400,
    skillsCompleted: ['C001'],
    nclexPredictorScore: 68,
    winProbability: 45,
    remediationStatus: 'Assigned',
    remediationTopic: 'Pharmacology Dosage Calc',
    email: 'j.rodriguez@pctc.edu',
    phone: '(540) 555-0145',
    dob: '2003-11-20',
    gpa: 2.7,
    notes: 'Struggling with dosage calculations. Needs more lab time.',
    grades: [
      { id: 'GR3', studentId: 'S002', courseId: 'N101', courseName: 'Foundations of Nursing', grade: 78, semester: 'Fall 2024' },
      { id: 'GR4', studentId: 'S002', courseId: 'N102', courseName: 'Pharmacology I', grade: 65, semester: 'Spring 2025' },
    ]
  },
  {
    id: 'S003',
    firstName: 'Emily',
    lastName: 'Chen',
    cohort: 'Fall 2025',
    status: 'Active',
    clinicalHoursCompleted: 135,
    clinicalHoursRequired: 400,
    skillsCompleted: ['C001', 'C002', 'C003'],
    nclexPredictorScore: 88,
    winProbability: 89,
    remediationStatus: 'None',
    email: 'emily.chen@pctc.edu',
    phone: '(540) 555-0167',
    dob: '2005-02-28',
    gpa: 3.5,
    notes: 'Strong interpersonal skills. Patient feedback is consistently positive.',
    grades: [
      { id: 'GR5', studentId: 'S003', courseId: 'N101', courseName: 'Foundations of Nursing', grade: 87, semester: 'Fall 2024' },
      { id: 'GR6', studentId: 'S003', courseId: 'N102', courseName: 'Pharmacology I', grade: 91, semester: 'Fall 2024' },
    ]
  },
];

export const seedStandards: CompetencyStandard[] = [
  {
    id: 'C001',
    code: 'VBON-18VAC90-27-100',
    category: 'VBON',
    description: 'Demonstrates safety in medication administration',
    effectiveDate: '2025-07-16',
  },
  {
    id: 'C002',
    code: 'NCLEX-PN-SE-1',
    category: 'NCLEX_PN',
    description: 'Safe and Effective Care Environment: Coordinated Care',
    effectiveDate: '2023-04-01',
  },
  {
    id: 'C003',
    code: 'NCLEX-PN-HP-2',
    category: 'NCLEX_PN',
    description: 'Health Promotion and Maintenance: Aging Process',
    effectiveDate: '2023-04-01',
  },
];

export const seedLogs: ClinicalLog[] = [
  {
    id: 'L001',
    studentId: 'S001',
    date: '2025-10-15',
    siteName: 'Page Memorial Hospital',
    patientDiagnosis: 'Congestive Heart Failure',
    mappedCompetencies: ['C001', 'C003'],
    status: 'Approved',
  },
  {
    id: 'L002',
    studentId: 'S002',
    date: '2025-10-15',
    siteName: 'Page Memorial Hospital',
    patientDiagnosis: 'Pneumonia',
    mappedCompetencies: ['C001'],
    status: 'Pending',
    instructorFeedback: 'Please provide more detail on respiratory assessment.',
  },
];

export const seedModules: CourseModule[] = [
  {
    id: 'M01',
    week: 1,
    title: 'Foundations of Nursing',
    description: 'Introduction to nursing roles, legal/ethical standards, and basic care.',
    mappedNclexCategories: ['C002'],
  },
  {
    id: 'M04',
    week: 4,
    title: 'Cardiovascular System',
    description: 'Anatomy, physiology, and common disorders of the heart.',
    mappedNclexCategories: ['C001'], // Simplified mapping
  },
];

export const seedEvents = [
  { id: 1, date: new Date(), title: 'Clinical Rotation: Med-Surg', type: 'clinical', location: 'Memorial Hospital - 3 South', proctor: 'Sarah Jenkins, RN', status: 'packet-sent' },
  { id: 2, date: new Date(), title: 'Pharm Exam 2', type: 'exam', location: 'Room 304', proctor: 'Dr. Smith', status: 'scheduled' },
  { id: 3, date: new Date(new Date().setDate(new Date().getDate() + 2)), title: 'Sim Lab: Cardiac', type: 'school', location: 'Simulation Center', proctor: 'Staff', status: 'scheduled' },
];
