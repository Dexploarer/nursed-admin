'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  InstructorProfile,
  loadInstructorProfile,
  saveInstructorProfile,
  updateInstructorProfile as updateProfile,
  updatePreferences as updatePrefs,
  getInstructorDisplayName,
} from '@/lib/instructor-profile';

interface InstructorContextType {
  profile: InstructorProfile;
  displayName: string;
  isSetup: boolean;
  updateProfile: (updates: Partial<InstructorProfile>) => void;
  updatePreferences: (preferences: Partial<InstructorProfile['preferences']>) => void;
  refreshProfile: () => void;
}

const InstructorContext = createContext<InstructorContextType | undefined>(undefined);

export function InstructorProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<InstructorProfile>(() => loadInstructorProfile());
  const [displayName, setDisplayName] = useState<string>(() => getInstructorDisplayName());
  const [isSetup, setIsSetup] = useState<boolean>(() => !!(profile.firstName && profile.lastName && profile.email));

  useEffect(() => {
    // Load profile on mount
    refreshProfile();
  }, []);

  const refreshProfile = () => {
    const loaded = loadInstructorProfile();
    setProfile(loaded);
    setDisplayName(getInstructorDisplayName());
    setIsSetup(!!(loaded.firstName && loaded.lastName && loaded.email));
  };

  const handleUpdateProfile = (updates: Partial<InstructorProfile>) => {
    const updated = updateProfile(updates);
    setProfile(updated);
    setDisplayName(getInstructorDisplayName());
    setIsSetup(!!(updated.firstName && updated.lastName && updated.email));
  };

  const handleUpdatePreferences = (preferences: Partial<InstructorProfile['preferences']>) => {
    const updated = updatePrefs(preferences);
    setProfile(updated);
  };

  return (
    <InstructorContext.Provider
      value={{
        profile,
        displayName,
        isSetup,
        updateProfile: handleUpdateProfile,
        updatePreferences: handleUpdatePreferences,
        refreshProfile,
      }}
    >
      {children}
    </InstructorContext.Provider>
  );
}

export function useInstructor() {
  const context = useContext(InstructorContext);
  if (context === undefined) {
    throw new Error('useInstructor must be used within an InstructorProvider');
  }
  return context;
}
