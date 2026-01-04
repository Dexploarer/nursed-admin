import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface AlertCardProps {
  icon: LucideIcon;
  title: string;
  message: string;
  variant?: 'error' | 'warning' | 'info' | 'success';
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

const variantClasses = {
  error: {
    container: 'bg-gradient-to-br from-rose-50/80 to-rose-100/40 border-rose-500/30 backdrop-blur-sm',
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-600',
    title: 'text-rose-900',
    message: 'text-rose-800',
    button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:shadow-lg',
  },
  warning: {
    container: 'bg-gradient-to-br from-amber-50/80 to-amber-100/40 border-amber-500/30 backdrop-blur-sm',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600',
    title: 'text-amber-900',
    message: 'text-amber-800',
    button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md hover:shadow-lg',
  },
  info: {
    container: 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/40 border-cyan-500/30 backdrop-blur-sm',
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-600',
    title: 'text-cyan-900',
    message: 'text-cyan-800',
    button: 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-md hover:shadow-lg',
  },
  success: {
    container: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 border-emerald-500/30 backdrop-blur-sm',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
    title: 'text-emerald-900',
    message: 'text-emerald-800',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg',
  },
};

export function AlertCard({
  icon: Icon,
  title,
  message,
  variant = 'warning',
  action,
  children,
  className,
}: AlertCardProps) {
  const variants = variantClasses[variant];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border-2 p-6 shadow-sm',
        variants.container,
        className
      )}
    >
      <div className="relative flex items-start gap-4">
        <div className={clsx('p-3 rounded-lg shrink-0', variants.iconBg)}>
          <Icon className={clsx('w-6 h-6', variants.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={clsx('text-lg font-bold mb-2 tracking-tight', variants.title)}>
            {title}
          </h3>
          <p className={clsx('text-sm font-medium mb-4 leading-relaxed', variants.message)}>
            {message}
          </p>
          {children && <div className="mb-4">{children}</div>}
          {action && (
            <button
              onClick={action.onClick}
              className={clsx(
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                variants.button
              )}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/30 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
    </div>
  );
}
