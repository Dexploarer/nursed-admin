import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  icon?: ReactNode;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  actions: BulkAction[];
  className?: string;
}

export function BulkActionsBar({ selectedCount, onClear, actions, className }: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={clsx(
        'bg-linear-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-4',
        'shadow-lg animate-in slide-in-from-top duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold text-sm">
            {selectedCount} selected
          </div>
          <button
            onClick={onClear}
            className="flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
          >
            <X className="w-4 h-4" />
            Clear Selection
          </button>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                'shadow-sm hover:shadow-md whitespace-nowrap',
                action.variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
                action.variant === 'success' && 'bg-green-600 text-white hover:bg-green-700',
                !action.variant && 'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              {action.icon && <span className="shrink-0">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
