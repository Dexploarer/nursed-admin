import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/components/SidebarProvider';

// Global state for modals that need to be triggered from menu
let newStudentModalTrigger: (() => void) | null = null;
let importDataModalTrigger: (() => void) | null = null;
let exportReportsModalTrigger: (() => void) | null = null;
let aboutDialogTrigger: (() => void) | null = null;

export function setNewStudentModalTrigger(trigger: () => void) {
  newStudentModalTrigger = trigger;
}

export function setImportDataModalTrigger(trigger: () => void) {
  importDataModalTrigger = trigger;
}

export function setExportReportsModalTrigger(trigger: () => void) {
  exportReportsModalTrigger = trigger;
}

export function setAboutDialogTrigger(trigger: () => void) {
  aboutDialogTrigger = trigger;
}

export function useMenuEvents() {
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    // Listen for navigation events
    const unlistenNavigate = listen<string>('menu:navigate', (event) => {
      navigate(event.payload);
    });

    // Listen for new student event
    const unlistenNewStudent = listen('menu:new-student', () => {
      navigate('/students');
      // Trigger new student modal after navigation
      setTimeout(() => {
        if (newStudentModalTrigger) {
          newStudentModalTrigger();
        }
      }, 100);
    });

    // Listen for import data event
    const unlistenImportData = listen('menu:import-data', () => {
      navigate('/students');
      // Trigger import modal after navigation
      setTimeout(() => {
        if (importDataModalTrigger) {
          importDataModalTrigger();
        }
      }, 100);
    });

    // Listen for export reports event
    const unlistenExportReports = listen('menu:export-reports', () => {
      navigate('/analytics');
      // Trigger export dialog after navigation
      setTimeout(() => {
        if (exportReportsModalTrigger) {
          exportReportsModalTrigger();
        }
      }, 100);
    });

    // Listen for settings event
    const unlistenSettings = listen('menu:settings', () => {
      navigate('/settings');
    });

    // Listen for toggle sidebar event
    const unlistenToggleSidebar = listen('menu:toggle-sidebar', () => {
      toggleSidebar();
    });

    // Listen for documentation event
    const unlistenDocumentation = listen('menu:documentation', async () => {
      // Open documentation in external browser
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin:shell|open', {
          path: 'https://github.com/your-org/nursed-admin/wiki'
        });
      } catch (error) {
        console.error('Failed to open documentation:', error);
        // Fallback: show info message
        window.open('https://github.com/your-org/nursed-admin/wiki', '_blank');
      }
    });

    // Listen for about event
    const unlistenAbout = listen('menu:about', () => {
      if (aboutDialogTrigger) {
        aboutDialogTrigger();
      }
    });

    // Cleanup listeners on unmount
    return () => {
      unlistenNavigate.then(fn => fn());
      unlistenNewStudent.then(fn => fn());
      unlistenImportData.then(fn => fn());
      unlistenExportReports.then(fn => fn());
      unlistenSettings.then(fn => fn());
      unlistenToggleSidebar.then(fn => fn());
      unlistenDocumentation.then(fn => fn());
      unlistenAbout.then(fn => fn());
    };
  }, [navigate, toggleSidebar]);
}
