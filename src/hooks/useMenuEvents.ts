import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useNavigate } from 'react-router-dom';

export function useMenuEvents() {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for navigation events
    const unlistenNavigate = listen<string>('menu:navigate', (event) => {
      navigate(event.payload);
    });

    // Listen for new student event
    const unlistenNewStudent = listen('menu:new-student', () => {
      // Navigate to students page (or open new student dialog)
      navigate('/students');
      // TODO: Open new student dialog/modal
    });

    // Listen for import data event
    const unlistenImportData = listen('menu:import-data', () => {
      // TODO: Open import data dialog
      console.log('Import data requested');
    });

    // Listen for export reports event
    const unlistenExportReports = listen('menu:export-reports', () => {
      // TODO: Open export reports dialog
      console.log('Export reports requested');
    });

    // Listen for settings event
    const unlistenSettings = listen('menu:settings', () => {
      navigate('/settings');
    });

    // Listen for toggle sidebar event
    const unlistenToggleSidebar = listen('menu:toggle-sidebar', () => {
      // TODO: Implement sidebar toggle
      console.log('Toggle sidebar requested');
    });

    // Listen for documentation event
    const unlistenDocumentation = listen('menu:documentation', () => {
      // TODO: Open documentation
      console.log('Documentation requested');
    });

    // Listen for about event
    const unlistenAbout = listen('menu:about', () => {
      // TODO: Open about dialog
      console.log('About requested');
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
  }, [navigate]);
}
