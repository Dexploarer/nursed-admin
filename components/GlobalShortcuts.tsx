'use client';

import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUndoKeyboardShortcuts } from '@/lib/undo-manager';

/**
 * Global keyboard shortcuts component
 * Automatically wires up all keyboard shortcuts globally
 */
export function GlobalShortcuts() {
  // Navigation shortcuts (Cmd+D for dashboard, etc.)
  useGlobalShortcuts();

  // Undo/Redo shortcuts (Cmd+Z, Cmd+Shift+Z)
  useUndoKeyboardShortcuts();

  // This component renders nothing
  return null;
}
