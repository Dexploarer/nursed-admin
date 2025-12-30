import type { Student, ClinicalLog } from '@/types';

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
 */
export function exportSkillsMatrixToCSV(students: Student[], filename: string = 'skills-matrix.csv') {
  if (students.length === 0) {
    alert('No students to export');
    return;
  }

  const skillIds = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
  const skillNames = [
    'Medication Administration',
    'Trach Care/Suctioning',
    'Foley Catheterization',
    'NG Tube Placement',
    'Wound Care (Stage 3+)',
    'Directing CNAs/Staff',
  ];

  const headers = ['Student ID', 'Student Name', ...skillNames];

  const csvRows = [
    headers.join(','),
    ...students.map(s => [
      s.id,
      `${s.firstName} ${s.lastName}`,
      ...skillIds.map(skillId =>
        s.skillsCompleted?.includes(skillId) ? 'Completed' : 'Not Completed'
      ),
    ].map(field => `"${field}"`).join(','))
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
