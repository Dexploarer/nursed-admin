'use client';

import { useState, useEffect } from 'react';
import { loadStudents, getClinicalLogs, approveClinicalLog } from '@/lib/db';
import { Student, ClinicalLog } from '@/types';
import { AlertCircle, FileText, Users, CheckCircle, Loader2, ThumbsUp } from 'lucide-react';
import Link from 'next/link';
import NCLEXPredictor from '@/components/NCLEXPredictor';

export default function Home() {
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ClinicalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingLogs, setApprovingLogs] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      const studentData = await loadStudents();
      setStudents(studentData);

      // Fetch logs for all students
      const allLogs: ClinicalLog[] = [];
      for (const student of studentData) {
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
    fetchData();
  }, []);

  const handleApprove = async (logId: string) => {
    setApprovingLogs(prev => new Set(prev).add(logId));
    try {
      await approveClinicalLog(logId);
      // Refresh data
      await fetchData();
    } catch (error) {
      console.error('Failed to approve log:', error);
      alert('Failed to approve clinical log');
    } finally {
      setApprovingLogs(prev => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  };

  // Calculate real metrics from SQLite data
  const atRiskStudents = students.filter(s => s.status === 'At Risk');
  const pendingLogs = logs.filter(l => l.status === 'Pending');
  
  // VBON 1:10 faculty ratio check
  const complianceAlert = students.length > 10;

  // Calculate cohort averages
  const avgClinicalHours = students.length > 0 
    ? Math.round(students.reduce((sum, s) => sum + s.clinicalHoursCompleted, 0) / students.length)
    : 0;
  
  const avgCompletion = students.length > 0
    ? Math.round((avgClinicalHours / 400) * 100)
    : 0;

  if (loading) {
    return (
      <div className="container flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="mb-8">
        <h1 className="header-title">Instructor Dashboard</h1>
        <p className="text-muted">Overview for Fall 2025 Practical Nursing Cohort</p>
      </header>
      
      {complianceAlert && (
         <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <div>
              <span className="font-bold">VBON Compliance Alert:</span> Clinical group size exceeds 10:1 ratio.
            </div>
         </div>
      )}

      <div className="grid-dashboard">
        {/* Metric Cards */}
        <Link href="/students" className="card flex items-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-3 rounded-full bg-blue-50 text-[#0f4c75] mr-4">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2d3436]">{students.length}</div>
            <div className="text-sm text-gray-500">Total Students</div>
          </div>
        </Link>

        <Link href="/students" className="card flex items-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
          <div className="p-3 rounded-full bg-yellow-50 text-[#ffa000] mr-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2d3436]">{atRiskStudents.length}</div>
            <div className="text-sm text-gray-500">At Risk Students</div>
          </div>
        </Link>

        <Link href="/clinicals" className="card flex items-center p-6 hover:shadow-lg transition-shadow cursor-pointer">
           <div className="p-3 rounded-full bg-teal-50 text-[#00b894] mr-4">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#2d3436]">{pendingLogs.length}</div>
            <div className="text-sm text-gray-500">Pending Clinical Logs</div>
          </div>
        </Link>
      </div>

      {/* VBON Audit Readiness Widget */}
      <div className="mt-8 card overflow-hidden border-t-4 border-t-indigo-600">
        <div className="p-4 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#0f4c75] flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Program Audit Readiness (VBON 2025)
          </h2>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-1 rounded">VBON 18VAC90-27</span>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Clinical Hours (400h)</span>
              <span className={avgCompletion >= 50 ? "text-indigo-600" : "text-orange-600"}>
                {avgCompletion >= 75 ? "On Track" : avgCompletion >= 50 ? "Progressing" : "Behind"}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${Math.min(avgCompletion, 100)}%` }}></div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium tracking-tight">
              Avg {avgClinicalHours}h / 400h across cohort
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Simulation Cap (25%)</span>
              <span className="text-green-600">Compliant</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '18%' }}></div>
            </div>
            <p className="text-[10px] text-gray-400 font-medium tracking-tight">Currently 18% avg (Limit 25%)</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-600">Faculty Ratio (1:10)</span>
              <span className={complianceAlert ? "text-red-600" : "text-green-600"}>
                {complianceAlert ? "Action Required" : "Compliant"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xl font-bold text-gray-800">
               {students.length}:1
               <span className="text-xs font-normal text-gray-400">ratio for Fall 2025</span>
            </div>
            {complianceAlert && (
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Site Visit Violation Risk</p>
            )}
          </div>
        </div>
      </div>

      {/* NCLEX Predictor Widget */}
      <div className="mt-8">
        <NCLEXPredictor students={students} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="card">
          <h2 className="text-lg font-bold text-[#0f4c75] mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Students Requiring Attention
          </h2>
          {atRiskStudents.length > 0 ? (
            <div className="space-y-3">
              {atRiskStudents.slice(0, 5).map(student => (
                <Link 
                  key={student.id} 
                  href={`/students/view?id=${student.id}`}
                  className="flex justify-between items-center p-3 border rounded-lg border-l-4 border-l-[#fdcb6e] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{student.firstName} {student.lastName}</div>
                    <div className="text-xs text-gray-500">Clinical Hours: {student.clinicalHoursCompleted}/{student.clinicalHoursRequired}</div>
                  </div>
                  <span className="badge badge-warning">At Risk</span>
                </Link>
              ))}
            </div>
          ) : (
             <div className="text-gray-500 italic">All students are on track. 🎉</div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-[#0f4c75] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Pending Clinical Logs
          </h2>
          <div className="space-y-3">
            {pendingLogs.length > 0 ? pendingLogs.slice(0, 5).map(log => {
              const student = students.find(s => s.id === log.studentId);
              const isApproving = approvingLogs.has(log.id);
              return (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{student?.firstName} {student?.lastName}</span>
                      <span className="badge badge-warning text-xs">Pending</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Site: {log.siteName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {log.date}
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(log.id)}
                    disabled={isApproving}
                    className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    {isApproving ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              );
            }) : (
              <div className="text-gray-500 italic">No pending clinical logs to review.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
