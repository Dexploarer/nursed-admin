import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Users, Clock, UserX, ShieldAlert, ChevronRight, Loader2
} from 'lucide-react';
import {
  getStudentsWithAttendanceIssues,
  getExpiringCertifications
} from '@/lib/db';
import { Student, AttendanceSummary, CertificationAlert } from '@/types';
import { Card } from './Card';
import { Button } from './Button';
import { EmptyState } from './EmptyState';

interface StudentsNeedingAttentionProps {
  students: Student[];
}

type AttentionCategory = 'all' | 'clinical' | 'attendance' | 'certifications' | 'at-risk';

export default function StudentsNeedingAttention({ students }: StudentsNeedingAttentionProps) {
  const [activeCategory, setActiveCategory] = useState<AttentionCategory>('all');
  const [attendanceIssues, setAttendanceIssues] = useState<AttendanceSummary[]>([]);
  const [certAlerts, setCertAlerts] = useState<CertificationAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [attendance, certs] = await Promise.all([
        getStudentsWithAttendanceIssues(2),
        getExpiringCertifications(30)
      ]);
      setAttendanceIssues(attendance);
      setCertAlerts(certs);
    } catch (error) {
      console.error('Failed to load attention data:', error);
    } finally {
      setLoading(false);
    }
  };

  const expectedProgress = 0.7;
  const expectedHours = 400 * expectedProgress;
  const clinicalBehind = students.filter(s => s.clinicalHoursCompleted < expectedHours * 0.8);
  const atRiskStudents = students.filter(s => s.status === 'At Risk');

  const studentsWithAttendanceIssues = new Set(attendanceIssues.map(a => a.studentId));
  const studentsWithCertIssues = new Set(certAlerts.map(c => c.certification.studentId));
  const studentsWithClinicalIssues = new Set(clinicalBehind.map(s => s.id));
  const studentsAtRisk = new Set(atRiskStudents.map(s => s.id));

  const allStudentsWithIssues = new Set([
    ...studentsWithAttendanceIssues,
    ...studentsWithCertIssues,
    ...studentsWithClinicalIssues,
    ...studentsAtRisk
  ]);

  const categories = [
    { id: 'all' as AttentionCategory, label: 'All', count: allStudentsWithIssues.size, icon: Users },
    { id: 'clinical' as AttentionCategory, label: 'Hours Behind', count: clinicalBehind.length, icon: Clock },
    { id: 'attendance' as AttentionCategory, label: 'Attendance', count: attendanceIssues.length, icon: UserX },
    { id: 'certifications' as AttentionCategory, label: 'Certs Expiring', count: certAlerts.length, icon: ShieldAlert },
    { id: 'at-risk' as AttentionCategory, label: 'At Risk', count: atRiskStudents.length, icon: AlertTriangle }
  ];

  const getFilteredStudents = () => {
    switch (activeCategory) {
      case 'clinical':
        return clinicalBehind.map(s => ({
          student: s,
          reason: `${s.clinicalHoursCompleted}/${Math.round(expectedHours)} hours (behind)`,
          type: 'clinical' as const,
          icon: Clock,
          color: 'text-cyan-600'
        }));
      case 'attendance':
        return attendanceIssues.map(a => {
          const student = students.find(s => s.id === a.studentId);
          if (!student) return null;
          const classroomInfo = a.classroomAbsences || a.classroomTardies
            ? `Classroom: ${a.classroomAbsences || 0}A/${a.classroomTardies || 0}T`
            : '';
          const clinicalInfo = a.clinicalAbsences || a.clinicalTardies
            ? `Clinical: ${a.clinicalAbsences || 0}A/${a.clinicalTardies || 0}T`
            : '';
          const typeInfo = [classroomInfo, clinicalInfo].filter(Boolean).join(' | ');
          return {
            student,
            reason: typeInfo || `${a.totalAbsences} absences, ${a.totalTardies} tardies`,
            type: 'attendance' as const,
            icon: UserX,
            color: 'text-amber-600'
          };
        }).filter(Boolean) as Array<{ student: Student; reason: string; type: string; icon: typeof UserX; color: string }>;
      case 'certifications':
        return certAlerts.map(alert => {
          const student = students.find(s => s.id === alert.certification.studentId);
          if (!student) return null;
          return {
            student,
            reason: `${alert.certification.certificationName} expires in ${alert.daysUntilExpiry} days`,
            type: 'certifications' as const,
            icon: ShieldAlert,
            color: 'text-rose-600'
          };
        }).filter(Boolean) as Array<{ student: Student; reason: string; type: string; icon: typeof ShieldAlert; color: string }>;
      case 'at-risk':
        return atRiskStudents.map(s => ({
          student: s,
          reason: 'At Risk status',
          type: 'at-risk' as const,
          icon: AlertTriangle,
          color: 'text-amber-600'
        }));
      default:
        const all: Array<{ student: Student; reason: string; type: string; icon: typeof Clock; color: string }> = [];
        clinicalBehind.forEach(s => all.push({
          student: s,
          reason: `${s.clinicalHoursCompleted}/${Math.round(expectedHours)} hours (behind)`,
          type: 'clinical',
          icon: Clock,
          color: 'text-cyan-600'
        }));
        attendanceIssues.forEach(a => {
          const student = students.find(s => s.id === a.studentId);
          if (student) all.push({
            student,
            reason: `${a.totalAbsences} absences, ${a.totalTardies} tardies`,
            type: 'attendance',
            icon: UserX,
            color: 'text-amber-600'
          });
        });
        certAlerts.forEach(alert => {
          const student = students.find(s => s.id === alert.certification.studentId);
          if (student) all.push({
            student,
            reason: `${alert.certification.certificationName} expires in ${alert.daysUntilExpiry} days`,
            type: 'certifications',
            icon: ShieldAlert,
            color: 'text-rose-600'
          });
        });
        atRiskStudents.forEach(s => all.push({
          student: s,
          reason: 'At Risk status',
          type: 'at-risk',
          icon: AlertTriangle,
          color: 'text-amber-600'
        }));
        return all;
    }
  };

  const filteredStudents = getFilteredStudents();

  if (loading) {
    return (
      <Card title="Students Needing Attention" padding="md">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Students Needing Attention"
      headerAction={
        filteredStudents.length > 0 && (
          <span className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">
            {filteredStudents.length} students
          </span>
        )
      }
    >
      {/* Category Tabs */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 border-2 ${
                activeCategory === cat.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.label}
              {cat.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Student List */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="w-12 h-12 text-slate-300" />}
            title="No students need attention"
            description={`All students in the ${activeCategory === 'all' ? '' : activeCategory} category are on track.`}
          />
        ) : (
          filteredStudents.slice(0, 5).map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={`${item.student.id}-${idx}`}
                to={`/students/view?id=${item.student.id}`}
                className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50/50 transition-all group backdrop-blur-sm"
              >
                <div className={`p-2 rounded-lg bg-slate-100 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {item.student.firstName} {item.student.lastName}
                  </div>
                  <div className="text-sm text-slate-600 truncate font-medium">{item.reason}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
              </Link>
            );
          })
        )}
      </div>

      {filteredStudents.length > 5 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <Link
            to="/students"
            className="text-sm font-bold text-slate-900 hover:text-slate-700 flex items-center gap-1 transition-colors"
          >
            View all {filteredStudents.length} students
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </Card>
  );
}
