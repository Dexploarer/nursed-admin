/**
 * Local Instructor Profile Management
 * For single-user Tauri desktop app
 */

export interface InstructorProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  credentials: string; // e.g., "RN, MSN"
  institution: string;
  phoneNumber?: string;
  createdAt: string;
  lastLogin: string;
  preferences: {
    defaultCohort: string;
    theme: 'light' | 'dark' | 'auto';
    enableNotifications: boolean;
    autoSaveInterval: number; // minutes
    showVBONCompliance: boolean;
  };
}

const STORAGE_KEY = 'nursed_instructor_profile';
const DEFAULT_COHORT = 'Fall 2025';

/**
 * Get the default instructor profile
 */
function getDefaultProfile(): InstructorProfile {
  return {
    id: `INST-${Date.now()}`,
    firstName: '',
    lastName: '',
    email: '',
    credentials: 'RN',
    institution: 'Page County Tech Center',
    phoneNumber: '',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    preferences: {
      defaultCohort: DEFAULT_COHORT,
      theme: 'light',
      enableNotifications: true,
      autoSaveInterval: 5,
      showVBONCompliance: true,
    },
  };
}

/**
 * Load instructor profile from localStorage
 */
export function loadInstructorProfile(): InstructorProfile {
  if (typeof window === 'undefined') {
    return getDefaultProfile();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultProfile();
    }

    const profile = JSON.parse(stored) as InstructorProfile;
    // Update last login
    profile.lastLogin = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return profile;
  } catch (error) {
    console.error('Failed to load instructor profile:', error);
    return getDefaultProfile();
  }
}

/**
 * Save instructor profile to localStorage
 */
export function saveInstructorProfile(profile: InstructorProfile): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to save instructor profile:', error);
    throw new Error('Failed to save profile. Please try again.');
  }
}

/**
 * Update specific profile fields
 */
export function updateInstructorProfile(updates: Partial<InstructorProfile>): InstructorProfile {
  const current = loadInstructorProfile();
  const updated = { ...current, ...updates };
  saveInstructorProfile(updated);
  return updated;
}

/**
 * Update instructor preferences
 */
export function updatePreferences(preferences: Partial<InstructorProfile['preferences']>): InstructorProfile {
  const current = loadInstructorProfile();
  const updated = {
    ...current,
    preferences: { ...current.preferences, ...preferences },
  };
  saveInstructorProfile(updated);
  return updated;
}

/**
 * Check if instructor profile is set up
 */
export function isProfileSetup(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const profile = loadInstructorProfile();
  return !!(profile.firstName && profile.lastName && profile.email);
}

/**
 * Get instructor display name
 */
export function getInstructorDisplayName(): string {
  const profile = loadInstructorProfile();

  if (!profile.firstName && !profile.lastName) {
    return 'Instructor';
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  return profile.credentials
    ? `${fullName}, ${profile.credentials}`
    : fullName;
}

/**
 * Clear instructor profile (for testing/reset)
 */
export function clearInstructorProfile(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}
