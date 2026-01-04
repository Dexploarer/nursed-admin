import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Student } from '@/types';
import {
  loadStudents,
  deleteStudent as deleteStudentDb,
  updateStudent as updateStudentDb,
  enrollStudent
} from '@/lib/db';

interface StudentDataContextValue {
  students: Student[];
  loading: boolean;
  error: string | null;
  refreshStudents: () => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteStudents: (ids: string[]) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  addStudent: (student: Student) => Promise<void>;
}

const StudentDataContext = createContext<StudentDataContextValue | null>(null);

interface StudentDataProviderProps {
  children: ReactNode;
}

export function StudentDataProvider({ children }: StudentDataProviderProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students:', err);
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshStudents();
  }, [refreshStudents]);

  const deleteStudent = useCallback(async (id: string) => {
    await deleteStudentDb(id);
    await refreshStudents();
  }, [refreshStudents]);

  const deleteStudents = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      await deleteStudentDb(id);
    }
    await refreshStudents();
  }, [refreshStudents]);

  const updateStudent = useCallback(async (student: Student) => {
    await updateStudentDb(student);
    await refreshStudents();
  }, [refreshStudents]);

  const addStudent = useCallback(async (student: Student) => {
    await enrollStudent(student);
    await refreshStudents();
  }, [refreshStudents]);

  const value: StudentDataContextValue = {
    students,
    loading,
    error,
    refreshStudents,
    deleteStudent,
    deleteStudents,
    updateStudent,
    addStudent,
  };

  return (
    <StudentDataContext.Provider value={value}>
      {children}
    </StudentDataContext.Provider>
  );
}

export function useStudentData() {
  const context = useContext(StudentDataContext);
  if (!context) {
    throw new Error('useStudentData must be used within a StudentDataProvider');
  }
  return context;
}
