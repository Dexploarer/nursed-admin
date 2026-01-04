
import { useState, useEffect, useMemo } from 'react';
import { loadStudents, addClinicalLog, updateStudent, getClinicalLogs } from '@/lib/db';
import { exportStudentsToPDF } from '@/lib/pdf-export';
import { Student, ClinicalLog } from '@/types';
import { seedStandards } from '@/lib/data';
import { generateText } from '@/lib/ai';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Gamepad2,
  RefreshCw,
  Building2,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { FormField, Input, Textarea } from '@/components/FormField';

// Interface for student hours data
interface StudentHoursData {
  studentId: string;
  totalHours: number;
  directHours: number;
  simHours: number;
  makeupHours: number;
  simPercentage: number;
  isCompliant: boolean;
  hoursBySite: Array<{
    siteName: string;
    directHours: number;
    simHours: number;
    totalHours: number;
    isMakeup: boolean;
  }>;
}

export default function ClinicalsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [_selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [studentHoursData, setStudentHoursData] = useState<Map<string, StudentHoursData>>(new Map());
  const [_loadingHours, setLoadingHours] = useState(false);

  const [newLog, setNewLog] = useState({
    studentId: '',
    date: new Date().toISOString().split('T')[0],
    siteName: '',
    patientDiagnosis: '',
    mappedCompetencies: [] as string[],
    instructorFeedback: '',
    hours: 8,
    isSimulation: false,
    isMakeup: false
  });
  const [saving, setSaving] = useState(false);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const toast = useToast();

  // Generate AI feedback for clinical log
  async function handleGenerateAIFeedback() {
    if (!newLog.studentId || !newLog.siteName || !newLog.patientDiagnosis) {
      toast.error('Missing Information', 'Please fill in student, site, and diagnosis first');
      return;
    }

    const student = students.find(s => s.id === newLog.studentId);
    if (!student) return;

    setGeneratingFeedback(true);

    try {
      // Get the names of selected competencies
      const selectedCompetencies = newLog.mappedCompetencies
        .map(id => seedStandards.find(s => s.id === id))
        .filter(Boolean)
        .map(s => s?.description || s?.code)
        .join(', ');

      const prompt = `Generate constructive clinical feedback for a nursing student.

Student: ${student.firstName} ${student.lastName}
Clinical Site: ${newLog.siteName}
Patient Case: ${newLog.patientDiagnosis}
Hours: ${newLog.hours}
Type: ${newLog.isSimulation ? 'VR/Simulation' : 'Direct Patient Care'}${newLog.isMakeup ? ' (Make-up day)' : ''}
${selectedCompetencies ? `Competencies Demonstrated: ${selectedCompetencies}` : ''}

Write 2-3 sentences of professional, constructive feedback that:
1. Acknowledges specific strengths observed during this clinical experience
2. Suggests one area for continued growth
3. Connects to nursing standards or NCLEX preparation when appropriate

Keep the tone encouraging but professional. Do not include any headers or bullet points, just the feedback paragraph.`;

      const feedback = await generateText({ prompt });

      setNewLog(prev => ({
        ...prev,
        instructorFeedback: feedback.trim()
      }));

      toast.success('AI Feedback Generated', 'Review and edit as needed before saving');
    } catch (error) {
      console.error('Failed to generate AI feedback:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('API key')) {
        toast.error('API Key Required', 'Please configure your AI API key in Settings');
      } else {
        toast.error('Generation Failed', 'Could not generate feedback. Please try again.');
      }
    } finally {
      setGeneratingFeedback(false);
    }
  }

  // Fetch students and their hours data
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await loadStudents();
        setStudents(data);

        // Fetch clinical logs for all students to calculate hours
        await fetchAllStudentHours(data);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch hours data for all students
  async function fetchAllStudentHours(studentList: Student[]) {
    setLoadingHours(true);
    const hoursMap = new Map<string, StudentHoursData>();

    for (const student of studentList) {
      try {
        const logs = await getClinicalLogs(student.id);
        const hoursData = calculateHoursFromLogs(student.id, logs);
        hoursMap.set(student.id, hoursData);
      } catch (error) {
        console.error(`Failed to fetch logs for student ${student.id}:`, error);
        // Fallback to estimated data
        hoursMap.set(student.id, {
          studentId: student.id,
          totalHours: student.clinicalHoursCompleted,
          directHours: Math.round(student.clinicalHoursCompleted * 0.85),
          simHours: Math.round(student.clinicalHoursCompleted * 0.15),
          makeupHours: 0,
          simPercentage: 15,
          isCompliant: Math.round(student.clinicalHoursCompleted * 0.15) <= 100,
          hoursBySite: []
        });
      }
    }

    setStudentHoursData(hoursMap);
    setLoadingHours(false);
  }

  // Calculate hours breakdown from clinical logs
  function calculateHoursFromLogs(studentId: string, logs: ClinicalLog[]): StudentHoursData {
    let totalHours = 0;
    let directHours = 0;
    let simHours = 0;
    let makeupHours = 0;
    const siteMap = new Map<string, { directHours: number; simHours: number; totalHours: number; isMakeup: boolean }>();

    for (const log of logs) {
      const hours = log.hours || 8; // Default to 8 hours if not specified
      const isSimulation = log.isSimulation || false;
      const isMakeup = log.isMakeup || false;

      totalHours += hours;

      if (isSimulation) {
        simHours += hours;
      } else {
        directHours += hours;
      }

      if (isMakeup) {
        makeupHours += hours;
      }

      // Group by site
      const siteName = log.siteName || 'Unknown Site';
      const existing = siteMap.get(siteName) || { directHours: 0, simHours: 0, totalHours: 0, isMakeup: false };
      siteMap.set(siteName, {
        directHours: existing.directHours + (isSimulation ? 0 : hours),
        simHours: existing.simHours + (isSimulation ? hours : 0),
        totalHours: existing.totalHours + hours,
        isMakeup: existing.isMakeup || isMakeup
      });
    }

    const simPercentage = totalHours > 0 ? Math.round((simHours / totalHours) * 100) : 0;
    const isCompliant = simHours <= 100 && simPercentage <= 25;

    return {
      studentId,
      totalHours,
      directHours,
      simHours,
      makeupHours,
      simPercentage,
      isCompliant,
      hoursBySite: Array.from(siteMap.entries()).map(([siteName, data]) => ({
        siteName,
        ...data
      }))
    };
  }

  // Get simulation status class
  function getSimStatusClass(simHours: number): { colorClass: string; bgClass: string; label: string } {
    if (simHours > 100) {
      return { colorClass: 'text-red-600', bgClass: 'bg-red-500', label: 'Over Cap' };
    } else if (simHours >= 80) {
      return { colorClass: 'text-orange-600', bgClass: 'bg-orange-400', label: 'Warning' };
    } else {
      return { colorClass: 'text-green-600', bgClass: 'bg-green-500', label: 'Safe' };
    }
  }

  // Toggle expanded state for a student
  function toggleExpanded(studentId: string) {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedStudents(newExpanded);
  }

  // Calculate real metrics
  const activeStudents = students.length;
  const atRiskStudents = students.filter(s => s.clinicalHoursCompleted < 300).length;
  const avgCompletion = students.length > 0
    ? Math.round(students.reduce((sum, s) => {
        const pct = (s.clinicalHoursCompleted / s.clinicalHoursRequired) * 100;
        return sum + pct;
      }, 0) / students.length)
    : 0;

  // Count students over simulation cap
  const studentsOverSimCap = useMemo(() => {
    let count = 0;
    studentHoursData.forEach((data) => {
      if (data.simHours > 100) count++;
    });
    return count;
  }, [studentHoursData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading clinical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-red-600 to-pink-600 rounded-2xl shadow-lg">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-red-900 to-pink-900 bg-clip-text text-transparent mb-1">
                Clinical Hours Tracker
              </h1>
              <p className="text-gray-600 text-lg font-medium">VBON Requirement: 400 Direct Client Care Hours</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                setExporting(true);
                try {
                  await exportStudentsToPDF(students, 'clinical');
                } catch (error) {
                  console.error('Export failed:', error);
                  toast.error('Failed to export PDF', 'Please try again');
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting || students.length === 0}
              className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold transition-all whitespace-nowrap"
            >
              <FileText className={`w-4 h-4 shrink-0 ${exporting ? 'animate-pulse' : ''}`} />
              <span className="truncate">{exporting ? 'Exporting...' : 'Export VBON Report'}</span>
            </button>
            <button
              onClick={() => {
                if (students.length === 0) {
                  toast.error('No Students', 'Please add students before logging clinical days');
                  return;
                }
                setShowLogModal(true);
              }}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl font-bold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Log Clinical Day</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{activeStudents}</div>
              <div className="text-sm text-gray-500 font-medium">Active Students</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{atRiskStudents}</div>
              <div className="text-sm text-gray-500 font-medium">At Risk (&lt;300h)</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-3xl font-black text-gray-900">{avgCompletion}%</div>
              <div className="text-sm text-gray-500 font-medium">Cohort Completion Avg</div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${studentsOverSimCap > 0 ? 'bg-red-100' : 'bg-purple-100'}`}>
              <Gamepad2 className={`w-6 h-6 ${studentsOverSimCap > 0 ? 'text-red-600' : 'text-purple-600'}`} />
            </div>
            <div>
              <div className={`text-3xl font-black ${studentsOverSimCap > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {studentsOverSimCap}
              </div>
              <div className="text-sm text-gray-500 font-medium">Over Sim Cap</div>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 bg-linear-to-r from-indigo-50 to-blue-50 border-b border-gray-200 flex justify-between items-center">
            <span className="text-sm text-indigo-700 font-medium">VBON Rule 18VAC90-27-100: Simulation limit is 25% (100h) of direct client care.</span>
            <span className="font-black text-indigo-900 text-sm">2025 Compliance Cycle</span>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-linear-to-r from-indigo-600 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider w-8"></th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Direct Hours</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Simulation (Max 100)</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Total Hours (400)</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Sim Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500 italic">
                  No students enrolled yet. Add students to track clinical hours.
                </td>
              </tr>
            ) : students.map((student) => {
              const hoursData = studentHoursData.get(student.id);
              const simHours = hoursData?.simHours ?? Math.round(student.clinicalHoursCompleted * 0.15);
              const directHours = hoursData?.directHours ?? Math.round(student.clinicalHoursCompleted * 0.85);
              const totalHours = hoursData?.totalHours ?? student.clinicalHoursCompleted;
              const makeupHours = hoursData?.makeupHours ?? 0;
              const hoursBySite = hoursData?.hoursBySite ?? [];

              const hoursProgress = Math.min((totalHours / student.clinicalHoursRequired) * 100, 100);
              const simStatus = getSimStatusClass(simHours);
              const isExpanded = expandedStudents.has(student.id);

              let statusText = 'On Track';
              let statusClass = 'bg-green-100 text-green-700';

              if (student.status === 'At Risk' || student.clinicalHoursCompleted < 200) {
                statusText = 'Behind';
                statusClass = 'bg-red-50 text-red-600';
              } else if (hoursProgress >= 90) {
                statusText = 'Near Completion';
                statusClass = 'bg-blue-100 text-blue-700';
              }

              if (simHours > 100) {
                statusText = 'COMPLIANCE RISK';
                statusClass = 'bg-red-100 text-red-700';
              }

              return (
                <>
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-2 py-4">
                      <button
                        onClick={() => toggleExpanded(student.id)}
                        className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {student.firstName} {student.lastName}
                      <div className="text-xs text-gray-400">{student.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span className="font-semibold text-blue-700">{directHours}h</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <Gamepad2 className={`w-4 h-4 ${simStatus.colorClass}`} />
                          <span className={`font-bold ${simStatus.colorClass}`}>
                            {simHours}h
                          </span>
                        </div>
                        {simHours > 100 && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
                      <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5 max-w-[80px]">
                        <div
                          className={`h-1.5 rounded-full ${simStatus.bgClass}`}
                          style={{ width: `${Math.min((simHours / 100) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${hoursProgress >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${hoursProgress}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{totalHours}</span>
                      </div>
                      {makeupHours > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                          <RefreshCw className="w-3 h-3" />
                          <span>{makeupHours}h make-up</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                        simHours > 100 ? 'bg-red-100 text-red-700' :
                        simHours >= 80 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {simHours > 100 ? (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            Over Cap
                          </>
                        ) : simHours >= 80 ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            Warning
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Safe
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setNewLog({
                            studentId: student.id,
                            date: new Date().toISOString().split('T')[0],
                            siteName: '',
                            patientDiagnosis: '',
                            mappedCompetencies: [],
                            instructorFeedback: '',
                            hours: 8,
                            isSimulation: false,
                            isMakeup: false
                          });
                          setShowLogModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold uppercase tracking-tighter hover:underline"
                      >
                        Log Hours
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Hours Breakdown */}
                  {isExpanded && (
                    <tr key={`${student.id}-expanded`} className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
                          <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-indigo-500" />
                            Hours Breakdown by Clinical Site
                          </h4>

                          {hoursBySite.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No clinical logs recorded yet. Hours breakdown will appear here once clinical days are logged.</p>
                          ) : (
                            <div className="space-y-3">
                              {/* Summary Bar */}
                              <div className="flex items-center gap-4 p-3 bg-linear-to-r from-indigo-50 to-blue-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  <span className="text-sm font-medium text-gray-700">Direct: {directHours}h</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                  <span className="text-sm font-medium text-gray-700">Simulation: {simHours}h</span>
                                </div>
                                {makeupHours > 0 && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                    <span className="text-sm font-medium text-gray-700">Make-up: {makeupHours}h</span>
                                  </div>
                                )}
                                <div className="ml-auto">
                                  <span className={`text-sm font-bold ${simHours > 100 ? 'text-red-600' : 'text-green-600'}`}>
                                    Sim: {Math.round((simHours / (totalHours || 1)) * 100)}% of total
                                  </span>
                                </div>
                              </div>

                              {/* Site Breakdown Table */}
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Site</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Direct</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Simulation</th>
                                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {hoursBySite.map((site, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-2 px-3 font-medium text-gray-900">{site.siteName}</td>
                                      <td className="py-2 px-3 text-right text-blue-600 font-semibold">{site.directHours}h</td>
                                      <td className="py-2 px-3 text-right text-purple-600 font-semibold">{site.simHours}h</td>
                                      <td className="py-2 px-3 text-right font-bold text-gray-900">{site.totalHours}h</td>
                                      <td className="py-2 px-3 text-center">
                                        {site.simHours > 0 && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-xs">
                                            <Gamepad2 className="w-3 h-3" />
                                            VR/Sim
                                          </span>
                                        )}
                                        {site.isMakeup && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-xs ml-1">
                                            <RefreshCw className="w-3 h-3" />
                                            Make-up
                                          </span>
                                        )}
                                        {site.simHours === 0 && !site.isMakeup && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs">
                                            <Building2 className="w-3 h-3" />
                                            Direct
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Clinical Log Modal */}
        <Modal
          isOpen={showLogModal}
          onClose={() => {
            setShowLogModal(false);
            setSelectedStudent(null);
            setNewLog({
              studentId: '',
              date: new Date().toISOString().split('T')[0],
              siteName: '',
              patientDiagnosis: '',
              mappedCompetencies: [],
              instructorFeedback: '',
              hours: 8,
              isSimulation: false,
              isMakeup: false
            });
          }}
          title="Log Clinical Day"
          size="lg"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLog}
                disabled={saving || !newLog.studentId || !newLog.date || !newLog.siteName}
                className="btn btn-primary px-8 shadow-md whitespace-nowrap disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Clinical Log'}
              </button>
            </div>
          }
        >
          <form onSubmit={(e) => { e.preventDefault(); handleSaveLog(); }} className="space-y-6">
            <FormField label="Student" required>
              <select
                value={newLog.studentId}
                onChange={(e) => setNewLog({ ...newLog, studentId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select a student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.id})
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Date" required>
                <Input
                  type="date"
                  value={newLog.date}
                  onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Hours" required>
                <Input
                  type="number"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={newLog.hours}
                  onChange={(e) => setNewLog({ ...newLog, hours: parseFloat(e.target.value) || 0 })}
                  required
                />
              </FormField>
            </div>

            {/* Hour Type Checkboxes */}
            <div className="grid grid-cols-2 gap-4">
              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                newLog.isSimulation
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input
                  type="checkbox"
                  checked={newLog.isSimulation}
                  onChange={(e) => setNewLog({ ...newLog, isSimulation: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                />
                <div className="flex items-center gap-2">
                  <Gamepad2 className={`w-5 h-5 ${newLog.isSimulation ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-semibold ${newLog.isSimulation ? 'text-purple-700' : 'text-gray-700'}`}>
                      VR/Simulation
                    </div>
                    <div className="text-xs text-gray-500">Counts toward 100h cap</div>
                  </div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                newLog.isMakeup
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <input
                  type="checkbox"
                  checked={newLog.isMakeup}
                  onChange={(e) => setNewLog({ ...newLog, isMakeup: e.target.checked })}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-5 h-5 ${newLog.isMakeup ? 'text-amber-600' : 'text-gray-400'}`} />
                  <div>
                    <div className={`font-semibold ${newLog.isMakeup ? 'text-amber-700' : 'text-gray-700'}`}>
                      Make-up Day
                    </div>
                    <div className="text-xs text-gray-500">Track make-up clinical days</div>
                  </div>
                </div>
              </label>
            </div>

            {/* Warning if simulation is checked */}
            {newLog.isSimulation && (
              <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <Gamepad2 className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-purple-800">Simulation Hours Notice</p>
                  <p className="text-xs text-purple-600 mt-1">
                    These hours will count toward the VBON 100-hour simulation cap (25% of 400 total hours).
                  </p>
                </div>
              </div>
            )}

            <FormField label="Clinical Site" required>
              <Input
                type="text"
                value={newLog.siteName}
                onChange={(e) => setNewLog({ ...newLog, siteName: e.target.value })}
                placeholder={newLog.isSimulation ? "e.g. Simulation Lab - VR Suite" : "e.g. Page Memorial Hospital - 3 South"}
                required
              />
            </FormField>

            <FormField label="Patient Diagnosis (HIPAA Compliant)" required>
              <Input
                type="text"
                value={newLog.patientDiagnosis}
                onChange={(e) => setNewLog({ ...newLog, patientDiagnosis: e.target.value })}
                placeholder={newLog.isSimulation ? "e.g. Simulated Cardiac Arrest Scenario" : "e.g. Congestive Heart Failure"}
                required
              />
            </FormField>

            <FormField label="Mapped Competencies">
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {seedStandards.map(standard => (
                  <label key={standard.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newLog.mappedCompetencies.includes(standard.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewLog({ ...newLog, mappedCompetencies: [...newLog.mappedCompetencies, standard.id] });
                        } else {
                          setNewLog({ ...newLog, mappedCompetencies: newLog.mappedCompetencies.filter(id => id !== standard.id) });
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{standard.code}</div>
                      <div className="text-xs text-gray-500">{standard.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </FormField>

            <FormField label="Instructor Feedback (Optional)">
              <div className="space-y-2">
                <Textarea
                  value={newLog.instructorFeedback}
                  onChange={(e) => setNewLog({ ...newLog, instructorFeedback: e.target.value })}
                  rows={3}
                  placeholder="Add feedback or notes about this clinical day..."
                />
                <button
                  type="button"
                  onClick={handleGenerateAIFeedback}
                  disabled={generatingFeedback || !newLog.studentId || !newLog.siteName}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {generatingFeedback ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Feedback
                    </>
                  )}
                </button>
              </div>
            </FormField>
          </form>
        </Modal>
    </div>
  );

  async function handleSaveLog() {
    if (!newLog.studentId || !newLog.date || !newLog.siteName) {
      toast.error('Missing Information', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const log: ClinicalLog = {
        id: `LOG-${Date.now()}`,
        studentId: newLog.studentId,
        date: newLog.date,
        siteName: newLog.siteName,
        patientDiagnosis: newLog.patientDiagnosis,
        mappedCompetencies: newLog.mappedCompetencies,
        status: 'Pending',
        instructorFeedback: newLog.instructorFeedback || undefined,
        hours: newLog.hours,
        isSimulation: newLog.isSimulation,
        isMakeup: newLog.isMakeup
      };

      await addClinicalLog(log);

      // Update student's clinical hours
      const student = students.find(s => s.id === newLog.studentId);
      if (student) {
        const updatedStudent = {
          ...student,
          clinicalHoursCompleted: student.clinicalHoursCompleted + newLog.hours
        };
        await updateStudent(updatedStudent);

        // Reload students to get updated data
        const updatedStudents = await loadStudents();
        setStudents(updatedStudents);

        // Refresh hours data for the updated student
        await fetchAllStudentHours(updatedStudents);
      }

      toast.success('Clinical Log Saved', 'The clinical day has been logged successfully');
      setShowLogModal(false);
      setNewLog({
        studentId: '',
        date: new Date().toISOString().split('T')[0],
        siteName: '',
        patientDiagnosis: '',
        mappedCompetencies: [],
        instructorFeedback: '',
        hours: 8,
        isSimulation: false,
        isMakeup: false
      });
    } catch (error) {
      console.error('Failed to save clinical log:', error);
      toast.error('Save Failed', 'Failed to save clinical log. Please try again.');
    } finally {
      setSaving(false);
    }
  }
}
