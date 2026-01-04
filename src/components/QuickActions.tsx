import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, UserCheck, FileText, Calendar, ChevronRight } from 'lucide-react';
import TakeAttendanceModal from './TakeAttendanceModal';
import { Card } from './Card';
import { Button } from './Button';

interface QuickActionsProps {
  pendingLogsCount: number;
  onAttendanceComplete?: () => void;
}

export default function QuickActions({ pendingLogsCount, onAttendanceComplete }: QuickActionsProps) {
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  const actions = [
    {
      id: 'clinical',
      label: 'Start Clinical Day',
      description: 'Open daily tracking sheet',
      icon: Stethoscope,
      color: 'cyan',
      href: '/clinicals',
    },
    {
      id: 'attendance',
      label: 'Take Attendance',
      description: 'Quick check-in interface',
      icon: UserCheck,
      color: 'emerald',
      onClick: () => setShowAttendanceModal(true),
    },
    {
      id: 'logs',
      label: 'Review Logs',
      description: `${pendingLogsCount} pending approval`,
      icon: FileText,
      color: 'amber',
      href: '/clinicals',
      badge: pendingLogsCount > 0 ? pendingLogsCount : undefined,
    },
    {
      id: 'calendar',
      label: 'View Schedule',
      description: 'Today\'s events',
      icon: Calendar,
      color: 'violet',
      href: '/calendar',
    },
  ];

  const colorClasses = {
    cyan: {
      bg: 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/40',
      border: 'border-cyan-500/30',
      text: 'text-cyan-900',
      icon: 'bg-cyan-500/15 text-cyan-600',
      hover: 'hover:bg-cyan-100/60 hover:border-cyan-500/40',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/40',
      border: 'border-emerald-500/30',
      text: 'text-emerald-900',
      icon: 'bg-emerald-500/15 text-emerald-600',
      hover: 'hover:bg-emerald-100/60 hover:border-emerald-500/40',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50/80 to-amber-100/40',
      border: 'border-amber-500/30',
      text: 'text-amber-900',
      icon: 'bg-amber-500/15 text-amber-600',
      hover: 'hover:bg-amber-100/60 hover:border-amber-500/40',
    },
    violet: {
      bg: 'bg-gradient-to-br from-violet-50/80 to-violet-100/40',
      border: 'border-violet-500/30',
      text: 'text-violet-900',
      icon: 'bg-violet-500/15 text-violet-600',
      hover: 'hover:bg-violet-100/60 hover:border-violet-500/40',
    },
  };

  return (
    <>
      <Card title="Quick Actions" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map(action => {
            const Icon = action.icon;
            const colors = colorClasses[action.color as keyof typeof colorClasses];
            const content = (
              <div className={`p-4 rounded-xl border-2 backdrop-blur-sm transition-all cursor-pointer group ${colors.bg} ${colors.border} ${colors.hover} hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${colors.icon}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-bold text-sm truncate ${colors.text}`}>{action.label}</span>
                      {action.badge && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full shrink-0 shadow-sm">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 truncate font-medium">{action.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                </div>
              </div>
            );

            if (action.onClick) {
              return (
                <button key={action.id} onClick={action.onClick} className="text-left w-full">
                  {content}
                </button>
              );
            }

            return (
              <Link key={action.id} to={action.href!} className="block">
                {content}
              </Link>
            );
          })}
        </div>
      </Card>

      <TakeAttendanceModal
        isOpen={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onComplete={onAttendanceComplete}
      />
    </>
  );
}
