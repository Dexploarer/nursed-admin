import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  footer?: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  className,
  padding = 'md',
  hover = false,
}: CardProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-sm',
        hover && 'hover:shadow-md hover:border-slate-300/60 transition-all duration-300',
        className
      )}
    >
      {(title || subtitle || headerAction) && (
        <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm font-medium text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            {headerAction && <div className="shrink-0">{headerAction}</div>}
          </div>
        </div>
      )}
      <div className={clsx(paddingClasses[padding])}>{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-white/50 backdrop-blur-sm">
          {footer}
        </div>
      )}
    </div>
  );
}
