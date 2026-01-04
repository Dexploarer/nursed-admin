import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={clsx('flex items-center gap-2 text-sm', className)} aria-label="Breadcrumb">
      <Link
        to="/"
        className="text-gray-500 hover:text-gray-700 transition-colors flex items-center"
      >
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {item.path && index < items.length - 1 ? (
            <Link
              to={item.path}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={clsx(
              'font-semibold',
              index === items.length - 1 ? 'text-gray-900' : 'text-gray-600'
            )}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
