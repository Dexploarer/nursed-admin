import type { Student } from '@/types';

interface CSVRow {
  [key: string]: string;
}

/**
 * Parse CSV file and convert to Student objects
 */
export async function parseStudentCSV(file: File): Promise<Student[]> {
  const text = await file.text();
  const lines = text.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file must contain headers and at least one data row');
  }

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  // Required headers
  const requiredHeaders = ['firstname', 'lastname', 'email'];
  const missing = requiredHeaders.filter(h => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`Missing required headers: ${missing.join(', ')}`);
  }

  // Parse rows
  const students: Student[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: CSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Parse and validate status
    const statusValue = row.status || 'Active';
    const validStatus = ['Active', 'At Risk', 'Graduated'].includes(statusValue)
      ? statusValue as 'Active' | 'At Risk' | 'Graduated'
      : 'Active';

    // Create student object
    const student: Student = {
      id: row.id || `LPN-${Math.floor(Math.random() * 9000) + 1000}`,
      firstName: row.firstname || row['first name'] || '',
      lastName: row.lastname || row['last name'] || '',
      email: row.email || '',
      dob: row.dob || row['date of birth'] || '',
      phone: row.phone || '',
      cohort: row.cohort || 'Fall 2025',
      status: validStatus,
      clinicalHoursCompleted: parseFloat(row.clinicalhours || row['clinical hours'] || '0'),
      clinicalHoursRequired: 400,
      skillsCompleted: row.skills ? row.skills.split(';') : [],
      gpa: row.gpa ? parseFloat(row.gpa) : undefined,
      nclexPredictorScore: row.nclex ? parseFloat(row.nclex) : undefined,
      winProbability: row.winprobability ? parseFloat(row.winprobability) : 50,
      remediationStatus: (['None', 'Assigned', 'In Progress', 'Validated'].includes(row.remediation || 'None')
        ? row.remediation
        : 'None') as 'None' | 'Assigned' | 'In Progress' | 'Validated' | undefined,
      remediationTopic: row.remediationtopic || '',
      notes: row.notes || '',
      grades: []
    };

    // Validate required fields
    if (!student.firstName || !student.lastName) {
      console.warn(`Skipping row ${i + 1}: Missing firstName or lastName`);
      continue;
    }

    students.push(student);
  }

  return students;
}

/**
 * Generate CSV template for student import
 */
export function downloadCSVTemplate() {
  const headers = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'dob',
    'cohort',
    'status',
    'clinicalHours',
    'gpa',
    'nclex',
    'skills'
  ];

  const exampleRow = [
    'John',
    'Doe',
    'john.doe@example.edu',
    '555-0123',
    '1998-05-15',
    'Fall 2025',
    'Active',
    '120',
    '3.5',
    '75',
    'Med Admin;Vital Signs'
  ];

  const csv = [headers.join(','), exampleRow.join(',')].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'student_import_template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Validate student data before import
 */
export function validateStudents(students: Student[]): { valid: Student[]; errors: string[] } {
  const valid: Student[] = [];
  const errors: string[] = [];

  students.forEach((student, index) => {
    const rowNum = index + 2; // +2 because index 0 is row 2 (after headers)

    // Email validation
    if (student.email && !isValidEmail(student.email)) {
      errors.push(`Row ${rowNum}: Invalid email format for ${student.firstName} ${student.lastName}`);
      return;
    }

    // Clinical hours validation
    if (student.clinicalHoursCompleted > student.clinicalHoursRequired) {
      errors.push(`Row ${rowNum}: Clinical hours completed (${student.clinicalHoursCompleted}) exceeds required (${student.clinicalHoursRequired})`);
    }

    // GPA validation
    if (student.gpa !== undefined && (student.gpa < 0 || student.gpa > 4.0)) {
      errors.push(`Row ${rowNum}: GPA must be between 0 and 4.0`);
      return;
    }

    valid.push(student);
  });

  return { valid, errors };
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
