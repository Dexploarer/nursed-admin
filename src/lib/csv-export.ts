import type { Student, ClinicalLog, SkillValidation } from '@/types';

/**
 * Export students to CSV file
 */
export function exportStudentsToCSV(students: Student[], filename: string = 'students.csv') {
  if (students.length === 0) {
    alert('No students to export');
    return;
  }

  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'DOB',
    'Status',
    'Cohort',
    'GPA',
    'NCLEX Predictor Score',
    'Win Probability',
    'Clinical Hours Completed',
    'Clinical Hours Required',
    'Skills Completed',
  ];

  const csvRows = [
    headers.join(','),
    ...students.map(s => [
      s.id,
      s.firstName,
      s.lastName,
      s.email,
      s.phone,
      s.dob,
      s.status,
      s.cohort,
      s.gpa || '',
      s.nclexPredictorScore || '',
      s.winProbability || '',
      s.clinicalHoursCompleted,
      s.clinicalHoursRequired,
      s.skillsCompleted?.length || 0,
    ].map(field => `"${field}"`).join(','))
  ];

  const csvContent = csvRows.join('\n');
  downloadCSV(csvContent, filename);
}

/**
 * Export clinical logs to CSV file
 */
export function exportClinicalLogsToCSV(logs: ClinicalLog[], students: Student[], filename: string = 'clinical-logs.csv') {
  if (logs.length === 0) {
    alert('No clinical logs to export');
    return;
  }

  const headers = [
    'Log ID',
    'Student ID',
    'Student Name',
    'Date',
    'Site Name',
    'Patient Diagnosis',
    'Status',
    'Instructor Feedback',
    'Mapped Competencies',
  ];

  const csvRows = [
    headers.join(','),
    ...logs.map(log => {
      const student = students.find(s => s.id === log.studentId);
      return [
        log.id,
        log.studentId,
        student ? `${student.firstName} ${student.lastName}` : '',
        log.date,
        log.siteName,
        log.patientDiagnosis,
        log.status,
        log.instructorFeedback || '',
        (log.mappedCompetencies || []).join('; '),
      ].map(field => `"${field}"`).join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  downloadCSV(csvContent, filename);
}

/**
 * Export skills completion matrix to CSV
 * Optionally includes validation metadata (date, location, validated by) when validations map is provided
 */
export function exportSkillsMatrixToCSV(
  students: Student[],
  filename: string = 'skills-matrix.csv',
  validations?: Map<string, SkillValidation>
) {
  if (students.length === 0) {
    return;
  }

  // Use the actual CORE_SKILLS from Skills Matrix page
  const skillIds = [
    'vitals', 'handwashing', 'bedmaking', 'catheter', 'injection-im', 'injection-subq',
    'iv-insertion', 'wound-care', 'ng-tube', 'trach-care', 'cpr', 'med-calc', 'glucose', 'ekg', 'ostomy'
  ];
  const skillNames = [
    'Vital Signs Assessment',
    'Hand Hygiene & PPE',
    'Bed Making (Occupied/Unoccupied)',
    'Urinary Catheterization',
    'IM Injection',
    'SubQ Injection',
    'Peripheral IV Insertion',
    'Sterile Dressing Change',
    'NG Tube Insertion & Care',
    'Tracheostomy Care',
    'CPR & Emergency Response',
    'Medication Dosage Calculation',
    'Blood Glucose Monitoring',
    'ECG/EKG Application',
    'Ostomy Care',
  ];

  // Build headers - if validations are provided, add metadata columns for each skill
  let headers: string[];
  if (validations && validations.size > 0) {
    // For each skill, add: Proficiency, Date, Location, Validated By
    const skillHeaders = skillNames.flatMap(name => [
      `${name} - Status`,
      `${name} - Date`,
      `${name} - Location`,
      `${name} - Validated By`
    ]);
    headers = ['Student ID', 'Student Name', 'Cohort', ...skillHeaders, 'Total Completed'];
  } else {
    headers = ['Student ID', 'Student Name', 'Cohort', ...skillNames, 'Total Completed'];
  }

  const csvRows = [
    headers.join(','),
    ...students.map(s => {
      const completedCount = s.skillsCompleted?.length || 0;

      let skillData: string[];
      if (validations && validations.size > 0) {
        // Include validation metadata for each skill
        skillData = skillIds.flatMap(skillId => {
          const validation = validations.get(`${s.id}-${skillId}`);
          if (validation) {
            return [
              validation.proficiency.replace('-', ' '),
              validation.validatedDate ? new Date(validation.validatedDate).toLocaleDateString() : '',
              validation.validatedLocation || '',
              validation.validatedBy || ''
            ];
          } else if (s.skillsCompleted?.includes(skillId)) {
            return ['proficient', '', '', ''];
          } else {
            return ['not started', '', '', ''];
          }
        });
      } else {
        // Simple status only
        skillData = skillIds.map(skillId =>
          s.skillsCompleted?.includes(skillId) ? 'Completed' : 'Not Started'
        );
      }

      return [
        `"${s.id}"`,
        `"${s.firstName} ${s.lastName}"`,
        `"${s.cohort}"`,
        ...skillData.map(field => `"${field}"`),
        completedCount.toString(),
      ].join(',');
    })
  ];

  const csvContent = csvRows.join('\n');
  downloadCSV(csvContent, filename);
}

/**
 * Helper function to trigger CSV download
 */
function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
