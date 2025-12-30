
import { useState, useEffect } from 'react';
import { loadStudents, getClinicalLogs } from '@/lib/db';
import { exportStudentsToPDF, exportClinicalLogsToPDF } from '@/lib/pdf-export';
import { Student, ClinicalLog } from '@/types';
import {
  BarChart3,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Target,
  Loader2,
  Download
} from 'lucide-react';

export default function AnalyticsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ClinicalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const studentData = await loadStudents();
        setStudents(studentData);

        const allLogs: ClinicalLog[] = [];
        for (const student of studentData) {
          const studentLogs = await getClinicalLogs(student.id);
          allLogs.push(...studentLogs);
        }
        setLogs(allLogs);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate analytics
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const atRiskStudents = students.filter(s => s.status === 'At Risk').length;

  const avgClinicalHours = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + s.clinicalHoursCompleted, 0) / students.length)
    : 0;

  const avgGPA = students.length > 0
    ? (students.reduce((sum, s) => sum + (s.gpa || 0), 0) / students.filter(s => s.gpa).length).toFixed(2)
    : '0.00';

  const avgNCLEX = students.length > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.nclexPredictorScore || 0), 0) / students.filter(s => s.nclexPredictorScore).length)
    : 0;

  const completionRate = students.length > 0
    ? Math.round((students.filter(s => s.clinicalHoursCompleted >= s.clinicalHoursRequired).length / students.length) * 100)
    : 0;

  // Clinical hours distribution
  const hoursDistribution = [
    { range: '0-100', count: students.filter(s => s.clinicalHoursCompleted < 100).length },
    { range: '100-200', count: students.filter(s => s.clinicalHoursCompleted >= 100 && s.clinicalHoursCompleted < 200).length },
    { range: '200-300', count: students.filter(s => s.clinicalHoursCompleted >= 200 && s.clinicalHoursCompleted < 300).length },
    { range: '300-400', count: students.filter(s => s.clinicalHoursCompleted >= 300 && s.clinicalHoursCompleted < 400).length },
    { range: '400+', count: students.filter(s => s.clinicalHoursCompleted >= 400).length },
  ];

  // NCLEX score distribution
  const nclexDistribution = [
    { range: '0-50', count: students.filter(s => (s.nclexPredictorScore || 0) < 50).length },
    { range: '50-70', count: students.filter(s => (s.nclexPredictorScore || 0) >= 50 && (s.nclexPredictorScore || 0) < 70).length },
    { range: '70-85', count: students.filter(s => (s.nclexPredictorScore || 0) >= 70 && (s.nclexPredictorScore || 0) < 85).length },
    { range: '85-100', count: students.filter(s => (s.nclexPredictorScore || 0) >= 85).length },
  ];

  if (loading) {
    return (
      <div className="container p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="header-title flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Advanced Analytics
          </h1>
          <p className="text-muted">Fall 2025 Cohort Performance Metrics</p>
        </div>
        <button
          onClick={async () => {
            setExporting(true);
            try {
              await exportStudentsToPDF(students, 'roster');
            } catch (error) {
              console.error('Export failed:', error);
              alert('Failed to export PDF');
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting || students.length === 0}
          className="btn btn-outline flex items-center gap-2 disabled:opacity-50"
        >
          <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
          {exporting ? 'Exporting...' : 'Export Dashboard'}
        </button>
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{activeStudents}</div>
              <div className="text-sm text-gray-500">of {totalStudents}</div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600">Active Students</div>
          <div className="mt-2 text-xs text-green-600 font-medium">
            {Math.round((activeStudents / totalStudents) * 100)}% active rate
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
              <Target className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{avgClinicalHours}h</div>
              <div className="text-sm text-gray-500">of 400h</div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600">Avg Clinical Hours</div>
          <div className="mt-2 text-xs text-indigo-600 font-medium">
            {Math.round((avgClinicalHours / 400) * 100)}% progress
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{avgGPA}</div>
              <div className="text-sm text-gray-500">GPA</div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600">Cohort Average</div>
          <div className="mt-2 text-xs text-green-600 font-medium">
            {parseFloat(avgGPA) >= 3.0 ? 'Above target' : 'Needs improvement'}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{atRiskStudents}</div>
              <div className="text-sm text-gray-500">students</div>
            </div>
          </div>
          <div className="text-sm font-medium text-gray-600">At Risk</div>
          <div className="mt-2 text-xs text-red-600 font-medium">
            {Math.round((atRiskStudents / totalStudents) * 100)}% of cohort
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Clinical Hours Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Clinical Hours Distribution</h2>
          <div className="space-y-4">
            {hoursDistribution.map((item, idx) => {
              const maxCount = Math.max(...hoursDistribution.map(d => d.count));
              const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.range} hours</span>
                    <span className="font-bold text-gray-900">{item.count} students</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NCLEX Score Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">NCLEX Predictor Scores</h2>
          <div className="space-y-4">
            {nclexDistribution.map((item, idx) => {
              const maxCount = Math.max(...nclexDistribution.map(d => d.count));
              const width = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const color = idx === 3 ? 'bg-green-600' : idx === 2 ? 'bg-yellow-500' : 'bg-red-500';
              return (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.range}%</span>
                    <span className="font-bold text-gray-900">{item.count} students</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className={`${color} h-3 rounded-full transition-all`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Program Health Indicators
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-sm text-gray-500 mb-2">Completion Rate</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{completionRate}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: `${completionRate}%` }} />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Avg NCLEX Score</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{avgNCLEX}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${avgNCLEX}%` }} />
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-2">Clinical Logs Submitted</div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{logs.length}</div>
            <div className="text-xs text-gray-400 mt-2">
              {logs.filter(l => l.status === 'Approved').length} approved
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
