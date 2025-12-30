import { invoke } from '@tauri-apps/api/core';
import { Student, ClinicalLog } from '@/types';
import { seedStudents, seedLogs } from './data';

export const loadStudents = async (): Promise<Student[]> => {
    let students = await invoke<Student[]>('get_all_students');
    
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
        students = await invoke<Student[]>('get_all_students');
    }
    return students;
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
