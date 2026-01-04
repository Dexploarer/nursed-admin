import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Gamepad2, AlertTriangle, CheckCircle2, Plus, ChevronDown, ChevronUp, Users, Clock } from 'lucide-react';
import { loadStudents, getAllVrScenarios, getStudentVrCompletions, getStudentVrSummary, saveVrCompletion } from '@/lib/db';
import { Student, VrScenario, StudentVrCompletion, StudentVrSummary } from '@/types';
import { useToast } from '@/components/Toast';
import { Modal, FormField, Input, Textarea } from '@/components';

const MAX_VR_HOURS = 100; // VBON cap
const WARNING_THRESHOLD = 80; // 80% = warning

export default function VRTrackingPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [scenarios, setScenarios] = useState<VrScenario[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<Map<string, StudentVrSummary>>(new Map());
  const [studentCompletions, setStudentCompletions] = useState<Map<string, StudentVrCompletion[]>>(new Map());

  // UI State
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [logForm, setLogForm] = useState({
    scenarioId: '',
    hours: 1.0,
    score: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState<'all' | 'safe' | 'warning' | 'over_cap'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsData, scenariosData] = await Promise.all([
        loadStudents(),
        getAllVrScenarios().catch(() => [])
      ]);
      setStudents(studentsData);
      setScenarios(scenariosData);

      // Load summaries and completions for each student
      const summariesMap = new Map<string, StudentVrSummary>();
      const completionsMap = new Map<string, StudentVrCompletion[]>();

      for (const student of studentsData) {
        try {
          const [summary, completions] = await Promise.all([
            getStudentVrSummary(student.id).catch(() => null),
            getStudentVrCompletions(student.id).catch(() => [])
          ]);

          if (summary) {
            summariesMap.set(student.id, summary);
          } else {
            // Create default summary
            summariesMap.set(student.id, {
              studentId: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              totalVrHours: 0,
              maxAllowedHours: MAX_VR_HOURS,
              percentageUsed: 0,
              isCompliant: true,
              alertLevel: 'safe',
              completedScenarios: 0,
              totalScenarios: scenariosData.filter(s => s.isRequired).length
            });
          }
          completionsMap.set(student.id, completions);
        } catch (e) {
          console.debug('Failed to load VR data for student:', student.id);
        }
      }

      setStudentSummaries(summariesMap);
      setStudentCompletions(completionsMap);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogCompletion = (student: Student) => {
    setSelectedStudent(student);
    setLogForm({
      scenarioId: scenarios[0]?.id || '',
      hours: 1.0,
      score: '',
      notes: ''
    });
    setShowLogModal(true);
  };

  const handleSaveCompletion = async () => {
    if (!selectedStudent || !logForm.scenarioId) {
      toast.error('Missing required fields', 'Please select a scenario.');
      return;
    }

    const summary = studentSummaries.get(selectedStudent.id);
    const newTotal = (summary?.totalVrHours || 0) + logForm.hours;

    if (newTotal > MAX_VR_HOURS) {
      const confirmed = confirm(
        `Warning: This will put ${selectedStudent.firstName} over the 100h VR cap (${newTotal.toFixed(1)}h total). This violates VBON compliance. Continue anyway?`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const completion: StudentVrCompletion = {
        id: `VRC-${Date.now()}`,
        studentId: selectedStudent.id,
        scenarioId: logForm.scenarioId,
        completionDate: format(new Date(), 'yyyy-MM-dd'),
        hours: logForm.hours,
        score: logForm.score ? parseFloat(logForm.score) : undefined,
        notes: logForm.notes || undefined,
        createdAt: new Date().toISOString()
      };

      await saveVrCompletion(completion);
      toast.success('VR Completion Logged', `${logForm.hours}h logged for ${selectedStudent.firstName}`);
      setShowLogModal(false);
      loadData();
    } catch (e) {
      console.error('Failed to save completion:', e);
      toast.error('Failed to save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Filter students by status
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterStatus === 'all') return true;
      const summary = studentSummaries.get(s.id);
      return summary?.alertLevel === filterStatus;
    });
  }, [students, studentSummaries, filterStatus]);

  // Stats
  const stats = useMemo(() => {
    let safe = 0, warning = 0, overCap = 0, totalHours = 0;
    studentSummaries.forEach(summary => {
      totalHours += summary.totalVrHours;
      if (summary.alertLevel === 'safe') safe++;
      else if (summary.alertLevel === 'warning') warning++;
      else if (summary.alertLevel === 'over_cap') overCap++;
    });
    return { safe, warning, overCap, totalHours };
  }, [studentSummaries]);

  const getAlertBadge = (alertLevel: string) => {
    switch (alertLevel) {
      case 'over_cap':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">OVER CAP</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">WARNING</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">COMPLIANT</span>;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage > 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading VR tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-linear-to-br from-purple-600 to-violet-600 rounded-2xl shadow-lg">
            <Gamepad2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-purple-900 to-violet-900 bg-clip-text text-transparent mb-1">
              VR Simulation Tracking
            </h1>
            <p className="text-gray-600 text-lg font-medium">VBON Compliance: Max 100h VR/Simulation (25% of 400h)</p>
          </div>
        </div>

        {/* VBON Compliance Alert */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-800">
              <strong>Virginia Board of Nursing Requirement:</strong> VR and simulation hours cannot exceed 25% of total clinical hours.
              For a 400-hour program, this means a maximum of 100 hours can be VR/simulation.
              <ul className="mt-2 list-disc list-inside text-xs">
                <li><strong className="text-green-600">Safe (0-79h):</strong> Within limits</li>
                <li><strong className="text-yellow-600">Warning (80-100h):</strong> Approaching cap</li>
                <li><strong className="text-red-600">Over Cap (&gt;100h):</strong> Non-compliant - requires action</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-green-600">{stats.safe}</div>
                <div className="text-xs text-gray-500">Safe / Compliant</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-yellow-600">{stats.warning}</div>
                <div className="text-xs text-gray-500">Warning (80-100h)</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-red-600">{stats.overCap}</div>
                <div className="text-xs text-gray-500">Over Cap (&gt;100h)</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-black text-purple-600">{stats.totalHours.toFixed(1)}h</div>
                <div className="text-xs text-gray-500">Total VR Hours</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          {(['all', 'safe', 'warning', 'over_cap'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filterStatus === status
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'all' ? 'All Students' : status === 'over_cap' ? 'Over Cap' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Student List */}
      <div className="space-y-4">
        {filteredStudents.map(student => {
          const summary = studentSummaries.get(student.id);
          const completions = studentCompletions.get(student.id) || [];
          const isExpanded = expandedStudent === student.id;

          if (!summary) return null;

          return (
            <div key={student.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
              summary.alertLevel === 'over_cap' ? 'border-red-200' :
              summary.alertLevel === 'warning' ? 'border-yellow-200' : 'border-gray-100'
            }`}>
              {/* Student Row */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{student.firstName} {student.lastName}</h3>
                        {getAlertBadge(summary.alertLevel)}
                      </div>
                      <div className="text-sm text-gray-500">{student.cohort}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Hours Display */}
                    <div className="text-right">
                      <div className="text-2xl font-black" style={{
                        color: summary.totalVrHours > MAX_VR_HOURS ? '#dc2626' :
                               summary.totalVrHours >= WARNING_THRESHOLD ? '#ca8a04' : '#16a34a'
                      }}>
                        {summary.totalVrHours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-gray-400">of {MAX_VR_HOURS}h max</div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${getProgressColor(summary.percentageUsed)}`}
                          style={{ width: `${Math.min(summary.percentageUsed, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 text-center mt-1">{summary.percentageUsed.toFixed(0)}%</div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLogCompletion(student)}
                        className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                        title="Log VR Completion"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded: Completions */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-6 bg-gray-50">
                  <h4 className="text-sm font-bold text-gray-700 mb-4">VR Scenario Completions</h4>

                  {completions.length === 0 ? (
                    <p className="text-gray-500 text-sm">No VR completions recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {completions.map(completion => {
                        const scenario = scenarios.find(s => s.id === completion.scenarioId);
                        return (
                          <div key={completion.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                            <div>
                              <div className="font-medium text-gray-800">{scenario?.name || 'Unknown Scenario'}</div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(completion.completionDate), 'MMM d, yyyy')}
                                {completion.score && ` • Score: ${completion.score}%`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-purple-600">{completion.hours}h</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Required Scenarios Checklist */}
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Required Scenarios</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {scenarios.filter(s => s.isRequired).map(scenario => {
                        const completed = completions.some(c => c.scenarioId === scenario.id);
                        return (
                          <div key={scenario.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                            completed ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                            {scenario.name}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No students match the selected filter</p>
          </div>
        )}
      </div>

      {/* Log Completion Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        title={`Log VR Completion - ${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowLogModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSaveCompletion}
              disabled={saving || !logForm.scenarioId}
              className="btn btn-primary px-6 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Log Completion'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {selectedStudent && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm text-purple-800">
                Current VR Hours: <strong>{studentSummaries.get(selectedStudent.id)?.totalVrHours.toFixed(1) || 0}h</strong> / {MAX_VR_HOURS}h max
              </div>
            </div>
          )}

          <FormField label="VR Scenario" required>
            <select
              value={logForm.scenarioId}
              onChange={(e) => {
                const scenario = scenarios.find(s => s.id === e.target.value);
                setLogForm({
                  ...logForm,
                  scenarioId: e.target.value,
                  hours: scenario?.defaultHours || 1.0
                });
              }}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl"
            >
              <option value="">Select a scenario...</option>
              {scenarios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.defaultHours || 1}h) {s.isRequired ? '• Required' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Hours">
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="8"
                value={logForm.hours}
                onChange={(e) => setLogForm({...logForm, hours: parseFloat(e.target.value) || 1})}
              />
            </FormField>
            <FormField label="Score (Optional)">
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0-100"
                value={logForm.score}
                onChange={(e) => setLogForm({...logForm, score: e.target.value})}
              />
            </FormField>
          </div>

          <FormField label="Notes (Optional)">
            <Textarea
              value={logForm.notes}
              onChange={(e) => setLogForm({...logForm, notes: e.target.value})}
              rows={2}
              placeholder="Any observations or notes..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
