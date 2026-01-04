import { ReactNode, useState, createContext, useContext } from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';

interface AccordionContextType {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
  allowMultiple?: boolean;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

interface AccordionProps {
  children: ReactNode;
  allowMultiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({ children, allowMultiple = false, defaultOpen = [], className }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set(defaultOpen));

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem, allowMultiple }}>
      <div className={clsx('space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  id: string;
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function AccordionItem({ id, title, children, className }: AccordionItemProps) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error('AccordionItem must be used within Accordion');

  const { openItems, toggleItem } = context;
  const isOpen = openItems.has(id);

  return (
    <div className={clsx('border-2 border-gray-200 rounded-xl overflow-hidden', className)}>
      <button
        onClick={() => toggleItem(id)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 font-semibold text-gray-900">{title}</div>
        <ChevronDown
          className={clsx(
            'w-5 h-5 text-gray-400 shrink-0 transition-transform',
            isOpen && 'transform rotate-180'
          )}
        />
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 animate-in slide-in-from-top duration-200">
          {children}
        </div>
      )}
    </div>
  );
}
