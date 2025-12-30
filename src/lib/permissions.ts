export type Role = 'admin' | 'instructor' | 'assistant' | 'readonly';

export interface Permission {
  canViewStudents: boolean;
  canEditStudents: boolean;
  canDeleteStudents: boolean;
  canViewGrades: boolean;
  canEditGrades: boolean;
  canViewClinicalLogs: boolean;
  canEditClinicalLogs: boolean;
  canApproveClinicalLogs: boolean;
  canExportReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  permissions: Permission;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

/**
 * Default permissions for each role
 */
export const DEFAULT_PERMISSIONS: Record<Role, Permission> = {
  admin: {
    canViewStudents: true,
    canEditStudents: true,
    canDeleteStudents: true,
    canViewGrades: true,
    canEditGrades: true,
    canViewClinicalLogs: true,
    canEditClinicalLogs: true,
    canApproveClinicalLogs: true,
    canExportReports: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  instructor: {
    canViewStudents: true,
    canEditStudents: true,
    canDeleteStudents: false,
    canViewGrades: true,
    canEditGrades: true,
    canViewClinicalLogs: true,
    canEditClinicalLogs: true,
    canApproveClinicalLogs: true,
    canExportReports: true,
    canManageSettings: false,
    canManageUsers: false,
  },
  assistant: {
    canViewStudents: true,
    canEditStudents: false,
    canDeleteStudents: false,
    canViewGrades: true,
    canEditGrades: false,
    canViewClinicalLogs: true,
    canEditClinicalLogs: false,
    canApproveClinicalLogs: false,
    canExportReports: true,
    canManageSettings: false,
    canManageUsers: false,
  },
  readonly: {
    canViewStudents: true,
    canEditStudents: false,
    canDeleteStudents: false,
    canViewGrades: true,
    canEditGrades: false,
    canViewClinicalLogs: true,
    canEditClinicalLogs: false,
    canApproveClinicalLogs: false,
    canExportReports: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};

/**
 * Check if user has a specific permission
 */
export function hasPermission(instructor: Instructor | null, permission: keyof Permission): boolean {
  if (!instructor || !instructor.isActive) {
    return false;
  }

  return instructor.permissions[permission] === true;
}

/**
 * Check if user has ANY of the specified permissions
 */
export function hasAnyPermission(instructor: Instructor | null, permissions: (keyof Permission)[]): boolean {
  return permissions.some(permission => hasPermission(instructor, permission));
}

/**
 * Check if user has ALL of the specified permissions
 */
export function hasAllPermissions(instructor: Instructor | null, permissions: (keyof Permission)[]): boolean {
  return permissions.every(permission => hasPermission(instructor, permission));
}

/**
 * Create a new instructor with default permissions for their role
 */
export function createInstructor(
  firstName: string,
  lastName: string,
  email: string,
  role: Role = 'instructor'
): Instructor {
  return {
    id: `INST-${Date.now()}`,
    firstName,
    lastName,
    email,
    role,
    permissions: { ...DEFAULT_PERMISSIONS[role] },
    createdAt: new Date().toISOString(),
    isActive: true,
  };
}
