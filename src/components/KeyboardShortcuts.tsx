import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from './Modal';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { keys: ['⌘', 'K'], description: 'Open command palette', category: 'Navigation' },
  { keys: ['⌘', '/'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: ['⌘', 'N'], description: 'New student', category: 'Actions' },
  { keys: ['⌘', 'E'], description: 'Export data', category: 'Actions' },
  { keys: ['⌘', 'F'], description: 'Search', category: 'Navigation' },
  { keys: ['⌘', 'B'], description: 'Toggle sidebar', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modal/dialog', category: 'Navigation' },
  { keys: ['⌘', 'Z'], description: 'Undo', category: 'Actions' },
  { keys: ['⌘', 'Shift', 'Z'], description: 'Redo', category: 'Actions' },
];

export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all z-40"
        title="Keyboard Shortcuts (⌘/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
        size="lg"
      >
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">{category}</h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-sm text-gray-700">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            {keyIndex > 0 && <span className="text-gray-400">+</span>}
                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-700">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
