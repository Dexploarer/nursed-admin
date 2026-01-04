import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { getClinicalLogs, approveClinicalLog, getSitesWithExpiringContracts } from '@/lib/db';
import { ClinicalLog, ClinicalSite } from '@/types';
import { useStudentData } from '@/contexts/StudentDataContext';
import { 
  AlertCircle, Users, CheckCircle, ThumbsUp, Sun, CloudSun, Moon, 
  Building2, FileWarning, TrendingUp
} from 'lucide-react';
import NCLEXPredictor from '@/components/NCLEXPredictor';
import TodaysTeachingView from '@/components/TodaysTeachingView';
import QuickActions from '@/components/QuickActions';
import PendingTasks from '@/components/PendingTasks';
import StudentsNeedingAttention from '@/components/StudentsNeedingAttention';
import CompHoursWidget from '@/components/CompHoursWidget';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { StatCard } from '@/components/StatCard';
import { AlertCard } from '@/components/AlertCard';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', icon: Sun, color: 'text-amber-500' };
  if (hour < 17) return { text: 'Good Afternoon', icon: CloudSun, color: 'text-orange-500' };
  return { text: 'Good Evening', icon: Moon, color: 'text-indigo-500' };
}

export default function Home() {
  const { students, loading: studentsLoading, refreshStudents } = useStudentData();
  const [logs, setLogs] = useState<ClinicalLog[]>([]);
  const [expiringSites, setExpiringSites] = useState<ClinicalSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingLogs, setApprovingLogs] = useState<Set<string>>(new Set());
  const { success: showSuccess, error: showError } = useToast();

  const greeting = getGreeting();
  const todayFormatted = format(new Date(), 'EEEE, MMMM do, yyyy');
  const GreetingIcon = greeting.icon;

  const fetchData = async () => {
    try {
      const sitesExpiring = await getSitesWithExpiringContracts(90).catch(() => []);
      setExpiringSites(sitesExpiring);

      const allLogs: ClinicalLog[] = [];
      for (const student of students) {
        const studentLogs = await getClinicalLogs(student.id);
        allLogs.push(...studentLogs);
      }
      setLogs(allLogs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!studentsLoading && students.length >= 0) {
      fetchData();
    }
  }, [students, studentsLoading]);

  const handleApprove = async (logId: string) => {
    setApprovingLogs(prev => new Set(prev).add(logId));
    try {
      await approveClinicalLog(logId);
      await Promise.all([fetchData(), refreshStudents()]);
      showSuccess('Clinical log approved', 'The log has been successfully approved');
    } catch (error) {
      console.error('Failed to approve log:', error);
      showError('Failed to approve clinical log', 'Please try again');
    } finally {
      setApprovingLogs(prev => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

  const atRiskStudents = students.filter(s => s.status === 'At Risk');
  const pendingLogs = logs.filter(l => l.status === 'Pending');
  const complianceAlert = students.length > 10;

  const avgClinicalHours = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.clinicalHoursCompleted, 0) / students.length)
    : 0;

  const avgCompletion = students.length > 0
    ? Math.round((avgClinicalHours / 400) * 100)
    : 0;

  if (loading || studentsLoading) {
    return (
      <div className="space-y-8">
        <div className="h-24">
          <Skeleton variant="rectangular" height={60} width="40%" className="mb-3" />
          <Skeleton variant="text" width="30%" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg">
            <GreetingIcon className={`w-8 h-8 ${greeting.color}`} />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{greeting.text}</h1>
            <p className="text-slate-600 mt-1.5 font-medium">{todayFormatted} • Fall 2025 Practical Nursing Cohort</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        {complianceAlert && (
          <AlertCard
            icon={AlertCircle}
            title="VBON Compliance Alert"
            message="Clinical group size exceeds 10:1 ratio. Action required to maintain compliance."
            variant="error"
            action={{
              label: 'Review Students',
              onClick: () => window.location.href = '/students',
            }}
          />
        )}

        {expiringSites.length > 0 && (
          <AlertCard
            icon={FileWarning}
            title={`${expiringSites.length} Clinical Site Contract${expiringSites.length > 1 ? 's' : ''} Expiring`}
            message={`${expiringSites.length} site${expiringSites.length > 1 ? 's' : ''} require${expiringSites.length === 1 ? 's' : ''} contract renewal within 90 days`}
            variant="warning"
            action={{
              label: 'View Sites',
              onClick: () => window.location.href = '/clinicals',
            }}
          >
            <div className="space-y-2">
              {expiringSites.slice(0, 3).map(site => {
                const expiry = new Date(site.contractExpirationDate!);
                const today = new Date();
                const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                return (
                  <div key={site.id} className="flex items-center justify-between bg-white/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-amber-200/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 shrink-0 text-amber-600" />
                      <span className="font-semibold text-amber-900 truncate">{site.name}</span>
                      {site.unitName && (
                        <span className="text-xs text-amber-600 shrink-0">({site.unitName})</span>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md shrink-0 ${
                      isExpired ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isExpired ? 'EXPIRED' : `${daysLeft} days`}
                    </span>
                  </div>
                );
              })}
            </div>
          </AlertCard>
        )}
      </div>

      {/* Today's Teaching View */}
      <TodaysTeachingView />

      {/* Quick Actions */}
      <QuickActions pendingLogsCount={pendingLogs.length} onAttendanceComplete={async () => {
        await fetchData();
        await refreshStudents();
      }} />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          value={students.length}
          label="Total Students"
          color="cyan"
        />
        <StatCard
          icon={AlertCircle}
          value={atRiskStudents.length}
          label="At Risk Students"
          color="amber"
        />
        <StatCard
          icon={TrendingUp}
          value={`${avgCompletion}%`}
          label="Avg Completion"
          color="emerald"
        />
        <StatCard
          icon={CheckCircle}
          value={pendingLogs.length}
          label="Pending Logs"
          color="rose"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentsNeedingAttention students={students} />
        <PendingTasks pendingLogsCount={pendingLogs.length} onRefresh={async () => {
          await fetchData();
          await refreshStudents();
        }} />
      </div>

      {/* VBON Audit Readiness */}
      <Card
        title="Program Audit Readiness"
        subtitle="VBON 2025 Compliance"
        headerAction={
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            VBON 18VAC90-27
          </span>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Clinical Hours (400h)</span>
              <span className={`text-sm font-bold ${
                avgCompletion >= 75 ? 'text-emerald-600' : 
                avgCompletion >= 50 ? 'text-amber-600' : 'text-rose-600'
              }`}>
                {avgCompletion >= 75 ? 'On Track' : avgCompletion >= 50 ? 'Progressing' : 'Behind'}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  avgCompletion >= 75 ? 'bg-emerald-500' : 
                  avgCompletion >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(avgCompletion, 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Avg {avgClinicalHours}h / 400h across cohort
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Simulation Cap (25%)</span>
              <span className="text-sm font-bold text-emerald-600">Compliant</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '18%' }} />
            </div>
            <p className="text-xs text-slate-500 font-medium">Currently 18% avg (Limit 25%)</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Faculty Ratio (1:10)</span>
              <span className={`text-sm font-bold ${complianceAlert ? 'text-rose-600' : 'text-emerald-600'}`}>
                {complianceAlert ? 'Action Required' : 'Compliant'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900">{students.length}:1</span>
              <span className="text-xs text-slate-500 font-medium">ratio for Fall 2025</span>
            </div>
            {complianceAlert && (
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">
                Site Visit Violation Risk
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Comp Hours Widget */}
      <CompHoursWidget />

      {/* NCLEX Predictor */}
      <NCLEXPredictor students={students} />

      {/* Quick Log Approval */}
      {pendingLogs.length > 0 && (
        <Card
          title="Quick Log Approval"
          headerAction={
            <span className="text-xs font-bold text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-lg border border-cyan-200">
              {pendingLogs.length} pending
            </span>
          }
        >
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {pendingLogs.slice(0, 5).map(log => {
              const student = students.find(s => s.id === log.studentId);
              const isApproving = approvingLogs.has(log.id);
              return (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900 truncate">
                        {student?.firstName} {student?.lastName}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-bold shrink-0 border border-amber-200">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-semibold truncate">{log.siteName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="shrink-0">{log.date}</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(log.id)}
                    loading={isApproving}
                    icon={<ThumbsUp className="w-4 h-4" />}
                    className="ml-4 shrink-0"
                  >
                    {isApproving ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
