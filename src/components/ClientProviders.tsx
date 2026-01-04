import { ReactNode } from 'react';
import { InstructorProvider } from './InstructorProvider';
import { SidebarProvider } from './SidebarProvider';
import { ToastProvider } from './Toast';
import { OnboardingWizard } from './OnboardingWizard';
import { CommandPalette } from './CommandPalette';
import { GlobalShortcuts } from './GlobalShortcuts';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { StudentDataProvider } from '@/contexts/StudentDataContext';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <InstructorProvider>
      <SidebarProvider>
        <ToastProvider>
          <StudentDataProvider>
            <GlobalShortcuts />
            <OnboardingWizard />
            <CommandPalette />
            <KeyboardShortcuts />
            {children}
          </StudentDataProvider>
        </ToastProvider>
      </SidebarProvider>
    </InstructorProvider>
  );
}
