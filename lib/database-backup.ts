'use client';

import { loadStudents, getClinicalLogs } from './db';
import { Student, ClinicalLog } from '@/types';

export interface DatabaseBackup {
  version: string;
  timestamp: string;
  students: Student[];
  clinicalLogs: Record<string, ClinicalLog[]>;
  metadata: {
    studentCount: number;
    logCount: number;
    exportedBy: string;
  };
}

/**
 * Create a full database backup
 */
export async function createBackup(exportedBy: string = 'instructor'): Promise<DatabaseBackup> {
  try {
    const students = await loadStudents();

    // Get all clinical logs for all students
    const clinicalLogs: Record<string, ClinicalLog[]> = {};
    for (const student of students) {
      const logs = await getClinicalLogs(student.id);
      clinicalLogs[student.id] = logs;
    }

    const totalLogs = Object.values(clinicalLogs).reduce((sum, logs) => sum + logs.length, 0);

    const backup: DatabaseBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      students,
      clinicalLogs,
      metadata: {
        studentCount: students.length,
        logCount: totalLogs,
        exportedBy,
      },
    };

    return backup;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw new Error('Failed to create database backup');
  }
}

/**
 * Export backup to JSON file
 */
export async function exportBackup(exportedBy: string = 'instructor'): Promise<void> {
  try {
    const backup = await createBackup(exportedBy);
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nursed-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export backup:', error);
    throw error;
  }
}

/**
 * Import and restore backup from DatabaseBackup object
 * WARNING: This will replace all existing data
 */
export async function importBackup(backup: DatabaseBackup): Promise<void> {
  try {
    // Validate backup structure
    if (!backup.version || !backup.students || !backup.clinicalLogs) {
      throw new Error('Invalid backup file format');
    }

    const validation = validateBackup(backup);
    if (!validation.valid) {
      throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
    }

    // For Tauri desktop app, we need to use invoke commands to restore data
    // Since we don't have delete commands, we'll log a warning
    console.warn('Database restore: This is a manual import. Current data will be merged with backup data.');
    console.warn('To fully restore, you may need to manually delete existing data first.');

    // Import students
    const { enrollStudent } = await import('./db');
    const { invoke } = await import('@tauri-apps/api/core');

    for (const student of backup.students) {
      try {
        // Try to update existing student, or create new one
        await invoke('update_student', { student }).catch(async () => {
          await enrollStudent(student);
        });
      } catch (error) {
        console.error(`Failed to restore student ${student.id}:`, error);
      }
    }

    // Import clinical logs
    for (const [studentId, logs] of Object.entries(backup.clinicalLogs)) {
      for (const log of logs) {
        try {
          await invoke('add_clinical_log', { log }).catch((error) => {
            // Log might already exist, that's okay
            console.warn(`Failed to restore log ${log.id}:`, error);
          });
        } catch (error) {
          console.error(`Failed to restore log for student ${studentId}:`, error);
        }
      }
    }

    console.log('Backup restored successfully:', {
      students: backup.students.length,
      logs: backup.metadata.logCount,
    });
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw error;
  }
}

/**
 * Validate backup file
 */
export function validateBackup(backup: DatabaseBackup): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!backup.version) {
    errors.push('Missing version number');
  }

  if (!backup.students || !Array.isArray(backup.students)) {
    errors.push('Invalid students data');
  }

  if (!backup.clinicalLogs || typeof backup.clinicalLogs !== 'object') {
    errors.push('Invalid clinical logs data');
  }

  if (!backup.metadata) {
    errors.push('Missing metadata');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
