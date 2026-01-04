import { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Dropdown({ options, value, onChange, placeholder = 'Select...', className, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={clsx(
          'w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-2 border-gray-200',
          'rounded-xl text-sm font-medium text-gray-700 hover:border-indigo-500 focus:outline-none',
          'focus:ring-2 focus:ring-indigo-500 transition-all',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'border-indigo-500 ring-2 ring-indigo-500'
        )}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate">{selectedOption?.label || placeholder}</span>
        </span>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 shrink-0 transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="max-h-60 overflow-y-auto">
            {options.map((option, index) => {
              if (option.divider) {
                return <div key={`divider-${index}`} className="border-t border-gray-200 my-1" />;
              }

              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (!option.disabled) {
                      onChange?.(option.value);
                      setIsOpen(false);
                    }
                  }}
                  disabled={option.disabled}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                    'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
                    isSelected && 'bg-indigo-50 text-indigo-700',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="flex-1 truncate">{option.label}</span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function Menu({ trigger, children, align = 'left', className }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, position: 'bottom' as 'bottom' | 'top' });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen && triggerRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Calculate position for portal
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      // Determine if menu should open upward
      const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      
      // Calculate left position based on align
      let left = rect.left;
      if (align === 'right') {
        left = rect.right;
      }
      
      setMenuPosition({
        top: shouldOpenUp ? window.innerHeight - rect.top + 10 : rect.bottom + 10,
        left: align === 'right' ? left : rect.left,
        position: shouldOpenUp ? 'top' : 'bottom'
      });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, align]);

  return (
    <>
      <div ref={triggerRef} className={clsx('inline-block', className)} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className={clsx(
            'fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden',
            'animate-in fade-in zoom-in duration-200 min-w-[200px]',
            menuPosition.position === 'top' ? 'origin-bottom' : 'origin-top'
          )}
          style={{
            top: menuPosition.position === 'bottom' ? `${menuPosition.top}px` : 'auto',
            bottom: menuPosition.position === 'top' ? `${menuPosition.top}px` : 'auto',
            left: align === 'right' ? 'auto' : `${menuPosition.left}px`,
            right: align === 'right' ? `${window.innerWidth - menuPosition.left}px` : 'auto',
            transform: align === 'right' ? 'translateX(-100%)' : 'none',
          }}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}

interface MenuItemProps {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
}

export function MenuItem({ children, icon, onClick, disabled, danger, className }: MenuItemProps) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
        }
      }}
      disabled={disabled}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
        'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none',
        disabled && 'opacity-50 cursor-not-allowed',
        danger && 'text-red-600 hover:bg-red-50',
        className
      )}
    >
      {icon && <span className="shrink-0 w-4 h-4">{icon}</span>}
      <span className="flex-1">{children}</span>
    </button>
  );
}
