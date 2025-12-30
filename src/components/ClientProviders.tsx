import { ReactNode } from 'react';
import { InstructorProvider } from './InstructorProvider';
import { OnboardingWizard } from './OnboardingWizard';
import { CommandPalette } from './CommandPalette';
import { GlobalShortcuts } from './GlobalShortcuts';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <InstructorProvider>
      <GlobalShortcuts />
      <OnboardingWizard />
      <CommandPalette />
      {children}
    </InstructorProvider>
  );
}
