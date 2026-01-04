import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { getStudent, getClinicalLogs, updateStudentNotes, updateClinicalLog, deleteClinicalLog, getStudentFlags, getStudentHoursSummary, getStudentMakeupHours, updateStudent } from '@/lib/db';
import { printClinicalLog, exportVBONStudentPackage } from '@/lib/pdf-export';
import { addRecentlyViewed } from '@/lib/recently-viewed';
import { Student, ClinicalLog, StudentFlags, StudentHoursSummary, MakeupHours } from '@/types';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  Clock,
  Save,
  Edit3,
  Printer,
  User,
  Trash2,
  MoreVertical,
  AlertTriangle,
  QrCode,
  Download,
  Camera,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';
import { FormField, Input, Textarea } from '@/components/FormField';
import { Badge } from '@/components/Progress';
import { Menu, MenuItem } from '@/components/Dropdown';
import PreceptorQRCode from '@/components/PreceptorQRCode';
import { StudentPhotoUpload } from '@/components/TauriFileUpload';
import { generateText } from '@/lib/ai';

export default function StudentViewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get('id');
  const toast = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [studentLogs, setStudentLogs] = useState<ClinicalLog[]>([]);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<ClinicalLog | null>(null);
  const [logForm, setLogForm] = useState({
    date: '',
    siteName: '',
    patientDiagnosis: '',
    mappedCompetencies: [] as string[],
    instructorFeedback: '',
    status: 'Pending' as string
  });
  const [savingLog, setSavingLog] = useState(false);
  const [_deletingLog, setDeletingLog] = useState(false);
  const [_deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLog, setQrLog] = useState<ClinicalLog | null>(null);
  const [flags, setFlags] = useState<StudentFlags['flags']>([]);
  const [hoursSummary, setHoursSummary] = useState<StudentHoursSummary | null>(null);
  const [exportingVBON, setExportingVBON] = useState(false);
  const [makeupHours, setMakeupHours] = useState<MakeupHours[]>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    if (id) {
      loadStudentData();
    }
  }, [id]);

  const loadStudentData = async () => {
    if (!id) return;
    try {
      const s = await getStudent(id);
      if (s) {
        setStudent(s);
        setNotes(s.notes || '');
        addRecentlyViewed(s);

        // Load flags with fallback
        try {
          const studentFlags = await getStudentFlags(id);
          setFlags(studentFlags.flags);
        } catch (e) {
          // Fallback: compute flags locally
          const localFlags: StudentFlags['flags'] = [];
          const expectedHours = s.clinicalHoursRequired || 400;
          if (s.clinicalHoursCompleted < expectedHours * 0.8) {
            localFlags.push({ type: 'clinical_behind', severity: 'warning', message: 'Behind on clinical hours', details: `${s.clinicalHoursCompleted}/${expectedHours} hours completed` });
          }
          if (s.status === 'At Risk') {
            localFlags.push({ type: 'at_risk', severity: 'critical', message: 'Student marked as At Risk' });
          }
          setFlags(localFlags);
        }

        // Load hours summary with fallback
        try {
          const summary = await getStudentHoursSummary(id);
          setHoursSummary(summary);
        } catch (e) {
          // Fallback: use student data directly
          setHoursSummary(null);
        }

        // Load makeup hours
        try {
          const makeup = await getStudentMakeupHours(id);
          setMakeupHours(makeup);
        } catch (e) {
          setMakeupHours([]);
        }
      }

      const logs = await getClinicalLogs(id);
      setStudentLogs(logs);
    } catch (err) {
      console.error('Failed to load student:', err);
      toast.error('Failed to load student', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!student) return;
    setSaving(true);
    try {
      await updateStudentNotes(student.id, notes);
      setIsEditing(false);
      toast.success('Notes Saved', 'Student notes have been updated');
    } catch (e) {
      console.error('Failed to save notes:', e);
      toast.error('Save Failed', 'Failed to save notes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditLog = (log: ClinicalLog) => {
    setEditingLog(log);
    setLogForm({
      date: log.date,
      siteName: log.siteName,
      patientDiagnosis: log.patientDiagnosis,
      mappedCompetencies: log.mappedCompetencies || [],
      instructorFeedback: log.instructorFeedback || '',
      status: log.status
    });
    setShowLogModal(true);
  };

  const handleSaveLog = async () => {
    if (!editingLog || !student) return;
    setSavingLog(true);
    try {
      const updatedLog: ClinicalLog = {
        ...editingLog,
        date: logForm.date,
        siteName: logForm.siteName,
        patientDiagnosis: logForm.patientDiagnosis,
        mappedCompetencies: logForm.mappedCompetencies,
        instructorFeedback: logForm.instructorFeedback,
        status: logForm.status as ClinicalLog['status']
      };
      await updateClinicalLog(updatedLog);
      setShowLogModal(false);
      setEditingLog(null);
      toast.success('Log Updated', 'Clinical log has been updated');
      loadStudentData();
    } catch (e) {
      console.error('Failed to update log:', e);
      toast.error('Update Failed', 'Failed to update clinical log. Please try again.');
    } finally {
      setSavingLog(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Are you sure you want to delete this clinical log? This action cannot be undone.')) {
      return;
    }
    setDeletingLog(true);
    setDeletingLogId(logId);
    try {
      await deleteClinicalLog(logId);
      toast.success('Log Deleted', 'Clinical log has been deleted');
      loadStudentData();
    } catch (e) {
      console.error('Failed to delete log:', e);
      toast.error('Delete Failed', 'Failed to delete clinical log. Please try again.');
    } finally {
      setDeletingLog(false);
      setDeletingLogId(null);
    }
  };

  const handleExportVBONPackage = async () => {
    if (!student) return;
    setExportingVBON(true);
    try {
      await exportVBONStudentPackage(student);
      toast.success('Export Complete', 'VBON student package has been downloaded');
    } catch (e) {
      console.error('Failed to export VBON package:', e);
      toast.error('Export Failed', 'Failed to generate VBON package. Please try again.');
    } finally {
      setExportingVBON(false);
    }
  };

  const handlePhotoUpload = async (filePath: string) => {
    if (!student) return;
    try {
      const updatedStudent = { ...student, photoUrl: filePath };
      await updateStudent(updatedStudent);
      setStudent(updatedStudent);
      setShowPhotoUpload(false);
      toast.success('Photo Updated', 'Student photo has been updated');
    } catch (e) {
      console.error('Failed to save photo:', e);
      toast.error('Save Failed', 'Failed to save student photo');
    }
  };

  const handlePhotoDelete = async () => {
    if (!student) return;
    try {
      const updatedStudent = { ...student, photoUrl: undefined };
      await updateStudent(updatedStudent);
      setStudent(updatedStudent);
      toast.success('Photo Removed', 'Student photo has been removed');
    } catch (e) {
      console.error('Failed to remove photo:', e);
      toast.error('Remove Failed', 'Failed to remove student photo');
    }
  };

  // Generate AI Progress Summary
  const handleGenerateAISummary = async () => {
    if (!student) return;

    setGeneratingSummary(true);
    setAiSummary('');
    setShowSummaryModal(true);

    try {
      // Build comprehensive context
      const hoursProgress = Math.min((student.clinicalHoursCompleted / student.clinicalHoursRequired) * 100, 100);
      const skillsCount = student.skillsCompleted?.length || 0;

      const clinicalSitesSummary = studentLogs.length > 0
        ? studentLogs.reduce((acc, log) => {
            acc[log.siteName] = (acc[log.siteName] || 0) + (log.hours || 8);
            return acc;
          }, {} as Record<string, number>)
        : null;

      const recentFeedback = studentLogs
        .filter(log => log.instructorFeedback)
        .slice(0, 5)
        .map(log => `- ${log.siteName} (${log.date}): "${log.instructorFeedback}"`)
        .join('\n');

      const flagsSummary = flags.length > 0
        ? flags.map(f => `- ${f.message}${f.details ? `: ${f.details}` : ''}`).join('\n')
        : 'No flags or concerns';

      const prompt = `Generate a comprehensive progress summary for a nursing student. This should be written as if you are the nursing program instructor.

STUDENT INFORMATION:
Name: ${student.firstName} ${student.lastName}
Cohort: ${student.cohort}
Status: ${student.status}
GPA: ${student.gpa || 'Not recorded'}

CLINICAL PROGRESS:
Hours Completed: ${student.clinicalHoursCompleted}/${student.clinicalHoursRequired} (${hoursProgress.toFixed(1)}%)
Skills Validated: ${skillsCount}/15 competencies
${clinicalSitesSummary ? `Hours by Site:\n${Object.entries(clinicalSitesSummary).map(([site, hrs]) => `- ${site}: ${hrs} hours`).join('\n')}` : 'No clinical sites logged yet'}

NCLEX READINESS:
Predictor Score: ${student.nclexPredictorScore || 'Not taken'}
Win Probability: ${student.winProbability ? `${student.winProbability}%` : 'Not calculated'}
Remediation Status: ${student.remediationStatus || 'None'}
${student.remediationTopic ? `Remediation Topic: ${student.remediationTopic}` : ''}

ALERTS & FLAGS:
${flagsSummary}

RECENT INSTRUCTOR FEEDBACK:
${recentFeedback || 'No feedback recorded'}

MAKEUP HOURS:
${makeupHours.length > 0 ? `${makeupHours.reduce((sum, m) => sum + (m.hoursOwed - m.hoursCompleted), 0)} hours remaining` : 'None required'}

Please provide:
1. **Overall Assessment**: A brief paragraph summarizing the student's current standing
2. **Strengths**: 2-3 specific strengths observed
3. **Areas for Growth**: 2-3 areas needing improvement
4. **Recommendations**: 2-3 specific, actionable recommendations for the next 30 days
5. **NCLEX Readiness**: Assessment of their exam preparation progress

Write in professional educator tone. Be specific and constructive.`;

      let fullSummary = '';
      await generateText({
        prompt,
        onChunk: (chunk) => {
          fullSummary += chunk;
          setAiSummary(fullSummary);
        }
      });

      toast.success('Summary Generated', 'AI progress summary is ready');
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('API key')) {
        setAiSummary('**Error:** Please configure your AI API key in Settings to generate progress summaries.');
      } else {
        setAiSummary('**Error:** Failed to generate progress summary. Please try again.');
      }
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Skeleton variant="rectangular" height={80} className="mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!id || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Not Found</h2>
          <p className="text-gray-600 mb-6">The student you're looking for doesn't exist.</p>
          <Link to="/students" className="btn btn-primary">
            Back to Students
          </Link>
        </div>
      </div>
    );
  }

  const hoursProgress = Math.min((student.clinicalHoursCompleted / student.clinicalHoursRequired) * 100, 100);
  const skillsProgress = student.skillsCompleted ? (student.skillsCompleted.length / 15) * 100 : 0;

  return (
    <div className="min-h-screen">
      <header className="mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={`${student.firstName} ${student.lastName}`}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-indigo-100 to-blue-100 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="w-10 h-10 text-indigo-400" />
                </div>
              )}
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Change photo"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent mb-1 flex items-center gap-3">
                {student.firstName} {student.lastName}
                <Badge
                  variant={student.status === 'Active' ? 'success' : student.status === 'At Risk' ? 'warning' : 'default'}
                  size="lg"
                >
                  {student.status}
                </Badge>
              </h1>
              <p className="text-gray-600 text-lg font-medium">Student ID: {student.id} | Cohort: {student.cohort}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleGenerateAISummary}
            disabled={generatingSummary}
            className="btn btn-outline flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-50"
            title="Generate AI-powered progress summary"
          >
            {generatingSummary ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI Summary
              </>
            )}
          </button>
          <button
            onClick={handleExportVBONPackage}
            disabled={exportingVBON}
            className="btn btn-outline flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            title="Export complete VBON compliance package"
          >
            {exportingVBON ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export VBON Package
              </>
            )}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="btn btn-outline flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {isEditing ? 'Cancel' : 'Edit Notes'}
          </button>
          {isEditing && (
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Compliance Flags Banner */}
      {flags.length > 0 && (
        <div className="mb-6 space-y-2">
          {flags.map((flag, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 ${
                flag.severity === 'critical'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${flag.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
              <div className="flex-1">
                <div className="font-bold">{flag.message}</div>
                {flag.details && <div className="text-sm opacity-80">{flag.details}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Contact & Stats */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Info</h3>
            <div className="space-y-4">
              {student.email && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Mail className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm">{student.email}</span>
                </div>
              )}
              {student.phone && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Phone className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm">{student.phone}</span>
                </div>
              )}
              {student.dob && (
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                  <span className="text-sm">DOB: {student.dob}</span>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Emergency Contact</h4>
              {student.emergencyContactName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-700">
                    <User className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">{student.emergencyContactName}</span>
                  </div>
                  {student.emergencyContactPhone && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <Phone className="w-4 h-4 text-red-500" />
                      <span className="text-sm">{student.emergencyContactPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No emergency contact on file</p>
              )}
            </div>
          </div>

          <div className="card p-6 bg-linear-to-br from-indigo-50 to-blue-50 border-indigo-100">
            <h3 className="text-sm font-bold text-indigo-700 uppercase tracking-widest mb-4">Academic Standings</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Current GPA</div>
                <div className="text-3xl font-black text-indigo-700">{student.gpa?.toFixed(1) || 'N/A'}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">NCLEX Prob.</div>
                <div className="text-3xl font-black text-green-600">{student.winProbability || 0}%</div>
              </div>
            </div>
            {student.nclexPredictorScore && (
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Predictor Score</div>
                <div className="text-xl font-black text-indigo-700">{student.nclexPredictorScore}%</div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Clinical Hours</h3>
            <div className="space-y-3">
              {hoursSummary ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Direct Patient Care</span>
                    <span className="font-bold">{hoursSummary.directHours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Simulation/VR</span>
                    <span className={`font-bold ${hoursSummary.simHours > 100 ? 'text-red-600' : ''}`}>{hoursSummary.simHours}h</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 font-medium">Total</span>
                    <span className="font-black text-indigo-600">{hoursSummary.totalHours}/{student.clinicalHoursRequired}h</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-900 font-medium">Total</span>
                  <span className="font-black text-indigo-600">{student.clinicalHoursCompleted}/{student.clinicalHoursRequired}h</span>
                </div>
              )}
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-linear-to-r from-indigo-500 to-blue-500 h-3 rounded-full"
                  style={{ width: `${hoursProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{Math.round(hoursProgress)}% Complete</p>
              {hoursSummary && hoursSummary.simHours > 100 && (
                <div className="text-xs text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Simulation hours exceed 25% cap
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              Skills Completed
              <span className="text-xs font-normal text-indigo-600">{student.skillsCompleted?.length || 0}/15</span>
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-linear-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all"
                style={{ width: `${skillsProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">{Math.round(skillsProgress)}% Complete</p>
          </div>

          {/* Make-up Hours Section */}
          {(() => {
            const totalOwed = makeupHours.reduce((sum, m) => sum + m.hoursOwed, 0);
            const totalCompleted = makeupHours.reduce((sum, m) => sum + m.hoursCompleted, 0);
            const balance = totalOwed - totalCompleted;
            const pendingRecords = makeupHours.filter(m => m.status !== 'completed');

            if (totalOwed > 0 || makeupHours.length > 0) {
              return (
                <div className={`card p-6 ${balance > 0 ? 'bg-linear-to-br from-orange-50 to-red-50 border-orange-200' : 'border-green-200 bg-linear-to-br from-green-50 to-emerald-50'}`}>
                  <h3 className={`text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2 ${balance > 0 ? 'text-orange-700' : 'text-green-700'}`}>
                    <Clock className="w-4 h-4" />
                    Make-up Hours
                    {balance > 0 && (
                      <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-black">
                        {balance}h OWED
                      </span>
                    )}
                  </h3>

                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Total Owed</div>
                        <div className="text-2xl font-black text-orange-600">{totalOwed}h</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Completed</div>
                        <div className="text-2xl font-black text-green-600">{totalCompleted}h</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Balance</div>
                        <div className={`text-2xl font-black ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {balance > 0 ? balance : 0}h
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {totalOwed > 0 && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${totalCompleted >= totalOwed ? 'bg-green-500' : 'bg-orange-500'}`}
                            style={{ width: `${Math.min((totalCompleted / totalOwed) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round((totalCompleted / totalOwed) * 100)}% completed</p>
                      </div>
                    )}

                    {/* Pending records */}
                    {pendingRecords.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">Pending Records</h4>
                        <div className="space-y-2">
                          {pendingRecords.slice(0, 3).map((record) => (
                            <div key={record.id} className="bg-white p-3 rounded-lg border border-gray-200 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-700">{record.hoursOwed - record.hoursCompleted}h remaining</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  record.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {record.status === 'in_progress' ? 'In Progress' : 'Pending'}
                                </span>
                              </div>
                              {record.reason && (
                                <p className="text-xs text-gray-500 mt-1">{record.reason}</p>
                              )}
                              {record.dueDate && (
                                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Due: {new Date(record.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          ))}
                          {pendingRecords.length > 3 && (
                            <Link to="/attendance" className="text-xs text-indigo-600 font-bold hover:text-indigo-800">
                              View all {pendingRecords.length} records →
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Instructor Notes</h3>
            </div>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add notes about this student..."
                className="w-full"
              />
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed italic min-h-[100px]">
                {notes || 'No notes recorded for this student.'}
              </p>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Grades & Clinical Logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="p-4 bg-linear-to-r from-indigo-50 to-blue-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Award className="w-4 h-4 text-indigo-600" />
                Transcript & Course Grades
              </h3>
            </div>
            {student.grades && student.grades.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-white border-b text-[10px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Course</th>
                    <th className="px-6 py-3">Semester</th>
                    <th className="px-6 py-3 text-right">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {student.grades.map(g => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800 text-sm">{g.courseName}</div>
                        <div className="text-[10px] text-gray-400">{g.courseId}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">{g.semester}</td>
                      <td className={`px-6 py-4 text-right font-black text-lg ${
                        g.grade >= 90 ? 'text-green-600' : g.grade >= 80 ? 'text-indigo-600' : 'text-orange-600'
                      }`}>
                        {g.grade}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-gray-400 text-sm italic">
                No grades recorded for this student.
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 bg-linear-to-r from-indigo-50 to-blue-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-600" />
                Recent Clinical Activity
              </h3>
              <Link
                to="/clinicals"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase"
              >
                View All
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {studentLogs.length > 0 ? (
                studentLogs.slice(0, 10).map(log => (
                  <div key={log.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="font-bold text-gray-800">{log.siteName}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3" /> {log.date}
                      </div>
                      <div className="mt-2 text-xs font-medium bg-gray-100 px-2 py-1 rounded w-fit text-gray-600">
                        {log.patientDiagnosis}
                      </div>
                      {log.mappedCompetencies && log.mappedCompetencies.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {log.mappedCompetencies.slice(0, 3).map((comp, idx) => (
                            <Badge key={idx} variant="info" size="sm">{comp}</Badge>
                          ))}
                          {log.mappedCompetencies.length > 3 && (
                            <Badge variant="default" size="sm">+{log.mappedCompetencies.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <Badge
                          variant={log.status === 'Approved' ? 'success' : log.status === 'Rejected' ? 'error' : 'warning'}
                          size="sm"
                        >
                          {log.status}
                        </Badge>
                        {log.instructorFeedback && (
                          <div className="text-[10px] text-gray-400 mt-2 max-w-[200px] italic">
                            &ldquo;{log.instructorFeedback}&rdquo;
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setQrLog(log);
                            setShowQRModal(true);
                          }}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Generate Preceptor QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => printClinicalLog(log, student)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Print Clinical Log"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <Menu
                          trigger={
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          }
                          align="right"
                        >
                          <MenuItem
                            icon={<Edit3 className="w-4 h-4" />}
                            onClick={() => handleEditLog(log)}
                          >
                            Edit Log
                          </MenuItem>
                          <MenuItem
                            icon={<QrCode className="w-4 h-4" />}
                            onClick={() => {
                              setQrLog(log);
                              setShowQRModal(true);
                            }}
                          >
                            Preceptor QR Code
                          </MenuItem>
                          <MenuItem
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => handleDeleteLog(log.id)}
                            danger
                          >
                            Delete Log
                          </MenuItem>
                        </Menu>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                  No clinical logs recorded for this student.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Clinical Log Modal */}
      <Modal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setEditingLog(null);
        }}
        title="Edit Clinical Log"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowLogModal(false);
                setEditingLog(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLog}
              disabled={savingLog || !logForm.date || !logForm.siteName || !logForm.patientDiagnosis}
              className="btn btn-primary px-8 shadow-md whitespace-nowrap disabled:opacity-50"
            >
              {savingLog ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSaveLog(); }} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={logForm.date}
                onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                required
              />
            </FormField>
            <FormField label="Clinical Site Name" required>
              <Input
                type="text"
                value={logForm.siteName}
                onChange={(e) => setLogForm({ ...logForm, siteName: e.target.value })}
                placeholder="e.g. Page Memorial Hospital"
                required
              />
            </FormField>
          </div>

          <FormField label="Patient Diagnosis (HIPAA Compliant)" required>
            <Input
              type="text"
              value={logForm.patientDiagnosis}
              onChange={(e) => setLogForm({ ...logForm, patientDiagnosis: e.target.value })}
              placeholder="e.g. Congestive Heart Failure, Pneumonia"
              required
            />
          </FormField>

          <FormField label="Mapped Competencies (Optional)">
            <Textarea
              value={logForm.mappedCompetencies.join(', ')}
              onChange={(e) => setLogForm({ ...logForm, mappedCompetencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              rows={2}
              placeholder="e.g. C001, C002 (comma separated IDs)"
            />
          </FormField>

          <FormField label="Instructor Feedback (Optional)">
            <Textarea
              value={logForm.instructorFeedback}
              onChange={(e) => setLogForm({ ...logForm, instructorFeedback: e.target.value })}
              rows={3}
              placeholder="Any feedback for the student..."
            />
          </FormField>

          <FormField label="Status">
            <select
              value={logForm.status}
              onChange={(e) => setLogForm({ ...logForm, status: e.target.value })}
              className="w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </FormField>
        </form>
      </Modal>

      {/* Preceptor QR Code Modal */}
      {student && (
        <PreceptorQRCode
          student={student}
          clinicalLog={qrLog || undefined}
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setQrLog(null);
          }}
        />
      )}

      {/* Photo Upload Modal */}
      <Modal
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        title="Update Student Photo"
        size="sm"
      >
        <div className="space-y-4">
          <StudentPhotoUpload
            studentId={student?.id || ''}
            currentPhotoUrl={student?.photoUrl}
            onUpload={handlePhotoUpload}
            onDelete={handlePhotoDelete}
          />
          <p className="text-xs text-gray-500 text-center">
            Supported formats: JPG, PNG, GIF, WebP. Max size: 5MB
          </p>
        </div>
      </Modal>

      {/* AI Progress Summary Modal */}
      <Modal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        title={`AI Progress Summary: ${student?.firstName} ${student?.lastName}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowSummaryModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
            {!generatingSummary && aiSummary && !aiSummary.startsWith('**Error:') && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiSummary);
                  toast.success('Copied', 'Summary copied to clipboard');
                }}
                className="btn btn-primary"
              >
                Copy to Clipboard
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {generatingSummary && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              <span className="text-purple-700 font-medium">Analyzing student data and generating summary...</span>
            </div>
          )}

          <div className="prose prose-sm max-w-none">
            {aiSummary ? (
              <div className="bg-gray-50 rounded-lg p-6 whitespace-pre-wrap text-gray-800 leading-relaxed">
                {aiSummary}
              </div>
            ) : !generatingSummary ? (
              <div className="text-center text-gray-500 py-8">
                Click "AI Summary" to generate a progress report
              </div>
            ) : null}
          </div>

          {!generatingSummary && aiSummary && !aiSummary.startsWith('**Error:') && (
            <div className="flex items-center gap-2 text-xs text-gray-400 border-t pt-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generated by AI based on student data. Review for accuracy before sharing.</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
