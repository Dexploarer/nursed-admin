'use client';

export interface UndoAction {
  id: string;
  type: 'delete_student' | 'update_student' | 'bulk_update' | 'delete_log';
  description: string;
  timestamp: number;
  undo: () => Promise<void>;
  redo?: () => Promise<void>;
}

class UndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxStackSize = 50;
  private listeners: Set<() => void> = new Set();

  addAction(action: UndoAction) {
    this.undoStack.push(action);
    this.redoStack = []; // Clear redo stack when new action is performed

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    this.notifyListeners();
  }

  async undo(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;

    try {
      await action.undo();
      if (action.redo) {
        this.redoStack.push(action);
      }
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Undo failed:', error);
      // Put action back on stack if undo fails
      this.undoStack.push(action);
      throw error;
    }
  }

  async redo(): Promise<boolean> {
    const action = this.redoStack.pop();
    if (!action || !action.redo) return false;

    try {
      await action.redo();
      this.undoStack.push(action);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Redo failed:', error);
      this.redoStack.push(action);
      throw error;
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getLastAction(): UndoAction | null {
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  getUndoStack(): UndoAction[] {
    return [...this.undoStack];
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const undoManager = new UndoManager();

// React hook for undo/redo
export function useUndoManager() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastAction, setLastAction] = useState<UndoAction | null>(null);

  useEffect(() => {
    const updateState = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
      setLastAction(undoManager.getLastAction());
    };

    updateState();
    const unsubscribe = undoManager.subscribe(updateState);

    return () => {
      unsubscribe();
    };
  }, []);

  const undo = async () => {
    try {
      const success = await undoManager.undo();
      if (success) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Undo error:', error);
      return false;
    }
  };

  const redo = async () => {
    try {
      const success = await undoManager.redo();
      if (success) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Redo error:', error);
      return false;
    }
  };

  return {
    canUndo,
    canRedo,
    lastAction,
    undo,
    redo,
  };
}

// Keyboard shortcuts for undo/redo
export function useUndoKeyboardShortcuts() {
  const { undo, redo } = useUndoManager();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          await redo();
        } else {
          await undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}

import { useState, useEffect } from 'react';
