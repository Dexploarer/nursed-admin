
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  global?: boolean; // Works even when input is focused
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input (unless global shortcut)
      const isInputFocused =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      for (const shortcut of shortcuts) {
        if (isInputFocused && !shortcut.global) {
          continue;
        }

        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          ctrlMatch &&
          shiftMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Global navigation shortcuts
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'd',
      metaKey: true,
      action: () => navigate('/'),
      description: 'Go to Dashboard',
      global: true,
    },
    {
      key: 's',
      metaKey: true,
      shiftKey: true,
      action: () => navigate('/students'),
      description: 'Go to Students',
      global: true,
    },
    {
      key: 'c',
      metaKey: true,
      shiftKey: true,
      action: () => navigate('/clinicals'),
      description: 'Go to Clinical Hours',
      global: true,
    },
    {
      key: 'a',
      metaKey: true,
      shiftKey: true,
      action: () => navigate('/analytics'),
      description: 'Go to Analytics',
      global: true,
    },
    {
      key: ',',
      metaKey: true,
      action: () => navigate('/settings'),
      description: 'Go to Settings',
      global: true,
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

// Export shortcuts reference for help modal
export const GLOBAL_SHORTCUTS = [
  { keys: ['⌘', 'D'], description: 'Dashboard' },
  { keys: ['⌘', 'Shift', 'S'], description: 'Students' },
  { keys: ['⌘', 'Shift', 'C'], description: 'Clinical Hours' },
  { keys: ['⌘', 'Shift', 'A'], description: 'Analytics' },
  { keys: ['⌘', ','], description: 'Settings' },
  { keys: ['⌘', 'K'], description: 'Global Search' },
  { keys: ['⌘', 'Z'], description: 'Undo' },
  { keys: ['⌘', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['?'], description: 'Show Shortcuts' },
];
