import { ReactNode } from 'react';
import { clsx } from 'clsx';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'emerald' | 'cyan' | 'amber' | 'rose' | 'violet' | 'indigo' | 'slate';
  onClick?: () => void;
  className?: string;
}

const colorClasses = {
  emerald: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-500/20',
    bg: 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  cyan: {
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600',
    border: 'border-cyan-500/20',
    bg: 'bg-gradient-to-br from-cyan-50/50 to-cyan-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    border: 'border-amber-500/20',
    bg: 'bg-gradient-to-br from-amber-50/50 to-amber-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  rose: {
    iconBg: 'bg-rose-500/10',
    iconColor: 'text-rose-600',
    border: 'border-rose-500/20',
    bg: 'bg-gradient-to-br from-rose-50/50 to-rose-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  violet: {
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
    border: 'border-violet-500/20',
    bg: 'bg-gradient-to-br from-violet-50/50 to-violet-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  indigo: {
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
    border: 'border-indigo-500/20',
    bg: 'bg-gradient-to-br from-indigo-50/50 to-indigo-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
  slate: {
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-600',
    border: 'border-slate-500/20',
    bg: 'bg-gradient-to-br from-slate-50/50 to-slate-100/30',
    value: 'text-slate-900',
    label: 'text-slate-600',
  },
};

export function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  color = 'slate',
  onClick,
  className,
}: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-xl border backdrop-blur-sm transition-all duration-300',
        colors.bg,
        colors.border,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-opacity-40',
        className
      )}
    >
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className={clsx('p-3 rounded-lg', colors.iconBg)}>
            <Icon className={clsx('w-6 h-6', colors.iconColor)} />
          </div>
          {trend && (
            <div className={clsx(
              'text-xs font-bold px-2 py-1 rounded-md',
              trend.isPositive 
                ? 'bg-emerald-500/10 text-emerald-700' 
                : 'bg-rose-500/10 text-rose-700'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={clsx('text-4xl font-extrabold mb-2 tracking-tight', colors.value)}>
          {value}
        </div>
        <div className={clsx('text-sm font-semibold uppercase tracking-wider', colors.label)}>
          {label}
        </div>
      </div>
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
    </div>
  );
}
