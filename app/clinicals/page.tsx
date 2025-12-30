'use client';

import { useState, useEffect } from 'react';
import { loadStudents } from '@/lib/db';
import { exportStudentsToPDF } from '@/lib/pdf-export';
import { Student } from '@/types';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Plus
} from 'lucide-react';

export default function ClinicalsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await loadStudents();
        setStudents(data);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate real metrics
  const activeStudents = students.length;
  const atRiskStudents = students.filter(s => s.clinicalHoursCompleted < 300).length;
  const avgCompletion = students.length > 0
    ? Math.round(students.reduce((sum, s) => {
        const pct = (s.clinicalHoursCompleted / s.clinicalHoursRequired) * 100;
        return sum + pct;
      }, 0) / students.length)
    : 0;

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading clinical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="header-title flex items-center gap-2">
            <Clock className="w-6 h-6 text-[#0f4c75]" />
            Clinical Hours Tracker
          </h1>
          <p className="text-muted">VBON Requirement: 400 Direct Client Care Hours</p>
        </div>
        <div className="flex gap-2">
           <button
             onClick={async () => {
               setExporting(true);
               try {
                 await exportStudentsToPDF(students, 'clinical');
               } catch (error) {
                 console.error('Export failed:', error);
                 alert('Failed to export PDF. Please try again.');
               } finally {
                 setExporting(false);
               }
             }}
             disabled={exporting || students.length === 0}
             className="btn btn-outline flex items-center gap-2 disabled:opacity-50"
           >
             <FileText className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
             {exporting ? 'Exporting...' : 'Export VBON Report'}
           </button>
           <button className="btn btn-primary flex items-center gap-2">
             <Plus className="w-4 h-4" />
             Log Clinical Day
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <div className="text-sm text-gray-500">Active Students</div>
          </div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-full">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{atRiskStudents}</div>
            <div className="text-sm text-gray-500">At Risk (&lt;300h)</div>
          </div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-700 rounded-full">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{avgCompletion}%</div>
            <div className="text-sm text-gray-500">Cohort Completion Avg</div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-t-4 border-t-indigo-600">
        <div className="p-4 bg-indigo-50/50 border-b border-gray-100 italic text-xs text-indigo-700 flex justify-between items-center">
           <span>VBON Rule 18VAC90-27-100: Simulation limit is 25% (100h) of direct client care.</span>
           <span className="font-bold">2025 Compliance Cycle</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Total Hours (400)</th>
              <th className="px-6 py-4">Simulation (Max 100)</th>
              <th className="px-6 py-4">Sim % Cap</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                  No students enrolled yet. Add students to track clinical hours.
                </td>
              </tr>
            ) : students.map((student) => {
              const hoursProgress = Math.min((student.clinicalHoursCompleted / student.clinicalHoursRequired) * 100, 100);
              // Estimate sim hours as 15% of total for demo (would be tracked separately in real app)
              const simHours = Math.round(student.clinicalHoursCompleted * 0.15);
              const isOverSim = simHours > 100;
              const isNearSim = simHours > 85;
              
              let statusText = 'On Track';
              let statusClass = 'bg-green-100 text-green-700';
              
              if (student.status === 'At Risk' || student.clinicalHoursCompleted < 200) {
                statusText = 'Behind';
                statusClass = 'bg-red-50 text-red-600';
              } else if (hoursProgress >= 90) {
                statusText = 'Near Completion';
                statusClass = 'bg-blue-100 text-blue-700';
              }
              
              if (isOverSim) {
                statusText = 'COMPLIANCE RISK';
                statusClass = 'bg-red-100 text-red-700';
              }

              return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {student.firstName} {student.lastName}
                    <div className="text-xs text-gray-400">{student.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${hoursProgress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                          style={{ width: `${hoursProgress}%` }}
                        ></div>
                      </div>
                      <span className="font-medium">{student.clinicalHoursCompleted}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <span className={isOverSim ? "text-red-600 font-bold" : isNearSim ? "text-orange-600 font-medium" : "text-gray-600"}>
                          {simHours}h
                        </span>
                        {isOverSim && <AlertTriangle className="w-3 h-3 text-red-500" />}
                     </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex flex-col gap-1">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                           <div 
                             className={`h-1.5 rounded-full ${isOverSim ? 'bg-red-500' : isNearSim ? 'bg-orange-400' : 'bg-indigo-400'}`}
                             style={{ width: `${Math.min((simHours / 100) * 100, 100)}%` }}
                           ></div>
                        </div>
                        <span className="text-[10px] text-gray-400">{Math.round((simHours/400)*100)}% of total</span>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass}`}>
                      {statusText}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-[#0f4c75] hover:text-blue-800 text-xs font-bold uppercase tracking-tighter">
                      Clinical Folder
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
