import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Clipboard, Users, Clock, CheckCircle2, Save, ChevronLeft, ChevronRight, Stethoscope, AlertCircle } from 'lucide-react';
import { loadStudents, getAssignmentsForDate, addClinicalLog, getClinicalLogs } from '@/lib/db';
import { Student, ClinicalAssignmentWithDetails, ClinicalLog } from '@/types';
import { useToast } from '@/components/Toast';
import { FormField, Input, Textarea } from '@/components';

// VBON Required Skills for quick selection
const QUICK_SKILLS = [
  { id: 'vitals', name: 'Vital Signs' },
  { id: 'handwashing', name: 'Hand Hygiene' },
  { id: 'catheter', name: 'Catheterization' },
  { id: 'injection-im', name: 'IM Injection' },
  { id: 'injection-subq', name: 'SubQ Injection' },
  { id: 'iv-insertion', name: 'IV Insertion' },
  { id: 'wound-care', name: 'Wound Care' },
  { id: 'ng-tube', name: 'NG Tube' },
  { id: 'medication', name: 'Med Admin' },
  { id: 'assessment', name: 'Patient Assessment' },
  { id: 'documentation', name: 'Documentation' },
  { id: 'communication', name: 'Patient Comm' },
];

export default function DailyTrackingPage() {
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [todaysAssignments, setTodaysAssignments] = useState<ClinicalAssignmentWithDetails[]>([]);
  const [todaysLogs, setTodaysLogs] = useState<ClinicalLog[]>([]);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [logForm, setLogForm] = useState({
    siteName: '',
    patientDiagnosis: '',
    skills: [] as string[],
    feedback: '',
    hours: 8,
    isSimulation: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadDayData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      const studentsData = await loadStudents();
      setStudents(studentsData);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDayData = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [assignments] = await Promise.all([
        getAssignmentsForDate(dateStr).catch(() => [])
      ]);
      setTodaysAssignments(assignments);

      // Load logs for students scheduled today
      const studentIds = new Set(assignments.map(a => a.studentId));
      const logs: ClinicalLog[] = [];
      for (const studentId of studentIds) {
        const studentLogs = await getClinicalLogs(studentId);
        logs.push(...studentLogs.filter(l => l.date === dateStr));
      }
      setTodaysLogs(logs);
    } catch (e) {
      console.error('Failed to load day data:', e);
    }
  };

  const handlePrevDay = () => setSelectedDate(d => new Date(d.getTime() - 86400000));
  const handleNextDay = () => setSelectedDate(d => new Date(d.getTime() + 86400000));
  const handleToday = () => setSelectedDate(new Date());

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudent(studentId);
    // Pre-fill site from assignment if exists
    const assignment = todaysAssignments.find(a => a.studentId === studentId);
    if (assignment) {
      setLogForm(prev => ({
        ...prev,
        siteName: assignment.siteName,
        hours: assignment.hours || 8
      }));
    }
  };

  const toggleSkill = (skillId: string) => {
    setLogForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skillId)
        ? prev.skills.filter(s => s !== skillId)
        : [...prev.skills, skillId]
    }));
  };

  const handleSaveLog = async () => {
    if (!selectedStudent || !logForm.siteName || !logForm.patientDiagnosis) {
      toast.error('Missing required fields', 'Please fill in student, site, and patient diagnosis.');
      return;
    }

    setSaving(true);
    try {
      const log: ClinicalLog = {
        id: `LOG-${Date.now()}`,
        studentId: selectedStudent,
        date: format(selectedDate, 'yyyy-MM-dd'),
        siteName: logForm.siteName,
        patientDiagnosis: logForm.patientDiagnosis,
        mappedCompetencies: logForm.skills,
        status: 'Pending',
        instructorFeedback: logForm.feedback || undefined,
        hours: logForm.hours,
        isSimulation: logForm.isSimulation,
        isMakeup: false
      };

      await addClinicalLog(log);
      toast.success('Log Saved', `Clinical log saved for ${students.find(s => s.id === selectedStudent)?.firstName}`);

      // Reset form
      setSelectedStudent('');
      setLogForm({
        siteName: '',
        patientDiagnosis: '',
        skills: [],
        feedback: '',
        hours: 8,
        isSimulation: false
      });
      loadDayData();
    } catch (e) {
      console.error('Failed to save log:', e);
      toast.error('Failed to save log', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Students scheduled today (from assignments or all active)
  const scheduledStudents = useMemo(() => {
    const scheduledIds = new Set(todaysAssignments.map(a => a.studentId));
    if (scheduledIds.size > 0) {
      return students.filter(s => scheduledIds.has(s.id));
    }
    return students.filter(s => s.status === 'Active');
  }, [students, todaysAssignments]);

  // Check if student already has log for today
  const hasLogToday = (studentId: string) => {
    return todaysLogs.some(l => l.studentId === studentId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header - iPad optimized with larger touch targets */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-linear-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
            <Clipboard className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black bg-linear-to-r from-gray-900 via-green-900 to-emerald-900 bg-clip-text text-transparent">
              Daily Clinical Tracking
            </h1>
            <p className="text-gray-600 font-medium">Quick entry for clinical days</p>
          </div>
        </div>

        {/* Date Navigation - Large touch targets */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <button
            onClick={handlePrevDay}
            className="p-4 hover:bg-gray-100 rounded-xl transition-colors active:bg-gray-200"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="text-2xl font-black text-gray-900">{format(selectedDate, 'EEEE')}</div>
            <div className="text-gray-500">{format(selectedDate, 'MMMM d, yyyy')}</div>
            <button
              onClick={handleToday}
              className="mt-2 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
            >
              Today
            </button>
          </div>
          <button
            onClick={handleNextDay}
            className="p-4 hover:bg-gray-100 rounded-xl transition-colors active:bg-gray-200"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Today's Students ({scheduledStudents.length})
            </h2>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {scheduledStudents.map(student => {
                const logged = hasLogToday(student.id);
                const isSelected = selectedStudent === student.id;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelect(student.id)}
                    disabled={logged}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : logged
                          ? 'bg-green-50 border-2 border-green-200 opacity-60'
                          : 'bg-gray-50 border-2 border-transparent hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800">{student.firstName} {student.lastName}</div>
                        <div className="text-xs text-gray-500">{student.cohort}</div>
                      </div>
                      {logged && (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </button>
                );
              })}

              {scheduledStudents.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>No students scheduled for today</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Log Entry Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Quick Log Entry
            </h2>

            {!selectedStudent ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg">Select a student to begin logging</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected Student Display */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <div className="text-sm text-indigo-600 font-medium">Logging for:</div>
                  <div className="text-xl font-black text-indigo-800">
                    {students.find(s => s.id === selectedStudent)?.firstName} {students.find(s => s.id === selectedStudent)?.lastName}
                  </div>
                </div>

                {/* Site & Diagnosis - Large inputs for tablet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Clinical Site" required>
                    <Input
                      value={logForm.siteName}
                      onChange={(e) => setLogForm({...logForm, siteName: e.target.value})}
                      placeholder="e.g., Page Memorial Hospital"
                      className="text-lg py-3"
                    />
                  </FormField>
                  <FormField label="Hours">
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={logForm.hours}
                      onChange={(e) => setLogForm({...logForm, hours: parseFloat(e.target.value) || 8})}
                      className="text-lg py-3"
                    />
                  </FormField>
                </div>

                <FormField label="Patient Assignment / Diagnosis" required hint="HIPAA compliant - use generic terms">
                  <Textarea
                    value={logForm.patientDiagnosis}
                    onChange={(e) => setLogForm({...logForm, patientDiagnosis: e.target.value})}
                    placeholder="e.g., 2 patients: CHF management, Post-op appendectomy"
                    rows={3}
                    className="text-lg"
                  />
                </FormField>

                {/* Skills Grid - Large touch targets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Skills Performed</label>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {QUICK_SKILLS.map(skill => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`p-3 rounded-xl text-sm font-medium transition-all ${
                          logForm.skills.includes(skill.id)
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {skill.name}
                      </button>
                    ))}
                  </div>
                </div>

                <FormField label="Instructor Feedback / Notes">
                  <Textarea
                    value={logForm.feedback}
                    onChange={(e) => setLogForm({...logForm, feedback: e.target.value})}
                    placeholder="Performance notes, areas for improvement, strengths..."
                    rows={4}
                    className="text-lg"
                  />
                </FormField>

                {/* Simulation Toggle */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="isSimulation"
                    checked={logForm.isSimulation}
                    onChange={(e) => setLogForm({...logForm, isSimulation: e.target.checked})}
                    className="w-6 h-6 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isSimulation" className="text-gray-700 font-medium cursor-pointer">
                    This is a simulation/VR session (counts toward 100h cap)
                  </label>
                </div>

                {/* Save Button - Extra large for tablet */}
                <button
                  onClick={handleSaveLog}
                  disabled={saving || !logForm.siteName || !logForm.patientDiagnosis}
                  className="w-full py-5 bg-linear-to-r from-green-600 to-emerald-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {saving ? (
                    <>
                      <Clock className="w-6 h-6 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-6 h-6" />
                      Save Clinical Log
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Completed Logs */}
      {todaysLogs.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Today's Entries ({todaysLogs.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysLogs.map(log => {
              const student = students.find(s => s.id === log.studentId);
              return (
                <div key={log.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{student?.firstName} {student?.lastName}</div>
                      <div className="text-sm text-gray-500">{log.siteName}</div>
                      <div className="text-xs text-gray-400 mt-1">{log.patientDiagnosis}</div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      log.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {log.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
