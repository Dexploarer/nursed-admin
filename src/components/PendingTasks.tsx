import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, differenceInDays } from 'date-fns';
import {
  ClipboardCheck, Calendar, AlertTriangle, ShieldCheck, FileText,
  ChevronRight, CheckCircle, Loader2, Clock
} from 'lucide-react';
import {
  getPendingEvaluations, getUpcomingDeadlines, getExpiringCertifications, completeDeadline
} from '@/lib/db';
import { PreceptorEvaluation, Deadline, CertificationAlert } from '@/types';
import { useToast } from './Toast';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface PendingTasksProps {
  pendingLogsCount: number;
  onRefresh?: () => void;
}

export default function PendingTasks({ pendingLogsCount, onRefresh }: PendingTasksProps) {
  const [evaluations, setEvaluations] = useState<PreceptorEvaluation[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [certAlerts, setCertAlerts] = useState<CertificationAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingDeadline, setCompletingDeadline] = useState<string | null>(null);
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [evals, dls, certs] = await Promise.all([
        getPendingEvaluations(),
        getUpcomingDeadlines(14),
        getExpiringCertifications(30)
      ]);
      setEvaluations(evals);
      setDeadlines(dls);
      setCertAlerts(certs);
    } catch (error) {
      console.error('Failed to load pending tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDeadline = async (id: string) => {
    setCompletingDeadline(id);
    try {
      await completeDeadline(id);
      showSuccess('Completed', 'Deadline marked as complete');
      await loadData();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to complete deadline:', error);
      showError('Failed', 'Could not complete deadline');
    } finally {
      setCompletingDeadline(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getDaysUntilText = (dueDate: string) => {
    const days = differenceInDays(new Date(dueDate), new Date());
    if (days < 0) return 'Overdue';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `${days} days`;
  };

  const totalPending = pendingLogsCount + evaluations.length + deadlines.length + certAlerts.length;

  if (loading) {
    return (
      <Card title="Pending Tasks" padding="md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Pending Tasks"
      headerAction={
        totalPending > 0 && (
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">
            {totalPending} pending
          </span>
        )
      }
    >
      {totalPending === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12 text-emerald-500" />}
          title="All caught up!"
          description="No pending tasks at the moment"
        />
      ) : (
        <div className="space-y-4">
          {/* Pending Clinical Logs */}
          {pendingLogsCount > 0 && (
            <Link
              to="/clinicals"
              className="flex items-center justify-between p-4 bg-gradient-to-br from-cyan-50/80 to-cyan-100/40 border-2 border-cyan-500/30 rounded-xl hover:border-cyan-500/50 hover:shadow-md transition-all group backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-600 rounded-lg text-white shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Clinical Logs</div>
                  <div className="text-sm text-slate-600 font-medium">{pendingLogsCount} awaiting approval</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0" />
            </Link>
          )}

          {/* Pending Preceptor Evaluations */}
          {evaluations.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-violet-50/80 to-violet-100/40 border-2 border-violet-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-violet-600 rounded-lg text-white shadow-md">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Preceptor Evaluations</div>
                  <div className="text-sm text-slate-600 font-medium">{evaluations.length} submitted via QR code</div>
                </div>
              </div>
              <div className="space-y-2">
                {evaluations.slice(0, 3).map(evaluation => (
                  <div
                    key={evaluation.id}
                    className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-violet-200/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{evaluation.preceptorName}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {format(new Date(evaluation.submittedAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="ml-3 shrink-0">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {deadlines.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-slate-50/80 to-slate-100/40 border-2 border-slate-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-slate-700 rounded-lg text-white shadow-md">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Upcoming Deadlines</div>
                  <div className="text-sm text-slate-600 font-medium">Next 14 days</div>
                </div>
              </div>
              <div className="space-y-2">
                {deadlines.slice(0, 4).map(deadline => (
                  <div
                    key={deadline.id}
                    className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="text-center shrink-0">
                        <div className="text-xs text-slate-500 font-bold">{format(new Date(deadline.dueDate), 'MMM')}</div>
                        <div className="text-lg font-extrabold text-slate-900">{format(new Date(deadline.dueDate), 'd')}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 text-sm truncate">{deadline.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(deadline.priority)}`}>
                            {deadline.priority}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3" />
                            {getDaysUntilText(deadline.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCompleteDeadline(deadline.id)}
                      disabled={completingDeadline === deadline.id}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50 shrink-0 ml-3"
                    >
                      {completingDeadline === deadline.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expiring Certifications */}
          {certAlerts.length > 0 && (
            <div className="p-4 bg-gradient-to-br from-rose-50/80 to-rose-100/40 border-2 border-rose-500/30 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-rose-600 rounded-lg text-white shadow-md">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Expiring Certifications</div>
                  <div className="text-sm text-slate-600 font-medium">{certAlerts.length} in next 30 days</div>
                </div>
              </div>
              <div className="space-y-2">
                {certAlerts.slice(0, 3).map(alert => (
                  <div
                    key={alert.certification.id}
                    className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-rose-200/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-sm truncate">{alert.studentName}</div>
                      <div className="text-xs text-slate-600 truncate font-medium">
                        {alert.certification.certificationName} - expires in {alert.daysUntilExpiry} days
                      </div>
                    </div>
                    <AlertTriangle className={`w-5 h-5 shrink-0 ml-3 ${alert.daysUntilExpiry <= 7 ? 'text-rose-600' : 'text-amber-600'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
