import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={clsx('flex items-center justify-between mb-6', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Icon className="w-5 h-5 text-indigo-600" />
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
