import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  UserCheck,
  UserX,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  BookOpen,
  Stethoscope,
  Timer
} from 'lucide-react';
import { loadStudents, bulkRecordAttendance, getAttendanceForDate, autoCreateMakeupHours } from '@/lib/db';
import { Student, Attendance } from '@/types';
import { Modal } from './Modal';
import { useToast } from './Toast';

type AttendanceStatus = 'Present' | 'Absent' | 'Tardy' | 'Excused' | 'Partial';
type AttendanceType = 'classroom' | 'clinical';

interface StudentAttendanceRecord {
  student: Student;
  status: AttendanceStatus;
  notes: string;
  hoursAttended: number | null;
  hoursRequired: number;
}

interface TakeAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const DEFAULT_CLINICAL_HOURS = 8;
const DEFAULT_CLASSROOM_HOURS = 4;

export default function TakeAttendanceModal({ isOpen, onClose, onComplete }: TakeAttendanceModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, StudentAttendanceRecord>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('classroom');
  const toast = useToast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), 'EEEE, MMMM do');

  const defaultHours = attendanceType === 'clinical' ? DEFAULT_CLINICAL_HOURS : DEFAULT_CLASSROOM_HOURS;

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Reset hours when attendance type changes
  useEffect(() => {
    setAttendanceRecords(prev => {
      const updated = new Map(prev);
      updated.forEach((record, key) => {
        updated.set(key, {
          ...record,
          hoursRequired: attendanceType === 'clinical' ? DEFAULT_CLINICAL_HOURS : DEFAULT_CLASSROOM_HOURS,
          hoursAttended: record.status === 'Present' ? null : record.hoursAttended
        });
      });
      return updated;
    });
  }, [attendanceType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const studentData = await loadStudents();
      setStudents(studentData);

      // Check for existing attendance records for today
      const existingAttendance = await getAttendanceForDate(today);
      const existingMap = new Map(existingAttendance.map(a => [a.studentId, a]));

      // Initialize attendance records
      const records = new Map<string, StudentAttendanceRecord>();
      studentData.forEach(student => {
        const existing = existingMap.get(student.id);
        records.set(student.id, {
          student,
          status: (existing?.status as AttendanceStatus) || 'Present',
          notes: existing?.notes || '',
          hoursAttended: existing?.hoursAttended || null,
          hoursRequired: existing?.hoursRequired || defaultHours
        });
      });
      setAttendanceRecords(records);
    } catch (error) {
      console.error('Failed to load students:', error);
      toast.error('Failed to Load', 'Could not load student list');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords(prev => {
      const updated = new Map(prev);
      const record = updated.get(studentId);
      if (record) {
        updated.set(studentId, {
          ...record,
          status,
          // Reset hours when changing to Present
          hoursAttended: status === 'Present' ? null : (status === 'Partial' ? (record.hoursAttended || 0) : null)
        });
      }
      return updated;
    });
  };

  const updateHoursAttended = (studentId: string, hours: number) => {
    setAttendanceRecords(prev => {
      const updated = new Map(prev);
      const record = updated.get(studentId);
      if (record) {
        updated.set(studentId, { ...record, hoursAttended: hours });
      }
      return updated;
    });
  };

  const updateNotes = (studentId: string, notes: string) => {
    setAttendanceRecords(prev => {
      const updated = new Map(prev);
      const record = updated.get(studentId);
      if (record) {
        updated.set(studentId, { ...record, notes });
      }
      return updated;
    });
  };

  const markAllPresent = () => {
    setAttendanceRecords(prev => {
      const updated = new Map(prev);
      updated.forEach((record, key) => {
        updated.set(key, { ...record, status: 'Present', hoursAttended: null });
      });
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const records: Attendance[] = Array.from(attendanceRecords.values()).map(record => ({
        id: `ATT-${record.student.id}-${today}-${attendanceType}`,
        studentId: record.student.id,
        date: today,
        status: record.status,
        attendanceType: attendanceType,
        notes: record.notes || undefined,
        recordedAt: now,
        hoursAttended: record.hoursAttended || undefined,
        hoursRequired: record.hoursRequired
      }));

      await bulkRecordAttendance(records);

      // Auto-create makeup hours for clinical absences and partial attendance
      if (attendanceType === 'clinical') {
        for (const record of Array.from(attendanceRecords.values())) {
          if (record.status === 'Absent') {
            // Full day missed - create makeup hours for full required hours
            await autoCreateMakeupHours(
              `ATT-${record.student.id}-${today}-${attendanceType}`,
              record.student.id,
              record.hoursRequired,
              record.notes || 'Clinical absence'
            );
          } else if (record.status === 'Partial' && record.hoursAttended !== null) {
            // Partial day - create makeup hours for missed hours
            const hoursMissed = record.hoursRequired - record.hoursAttended;
            if (hoursMissed > 0) {
              await autoCreateMakeupHours(
                `ATT-${record.student.id}-${today}-${attendanceType}`,
                record.student.id,
                hoursMissed,
                record.notes || `Partial attendance - ${record.hoursAttended}/${record.hoursRequired} hours`
              );
            }
          }
        }
      }

      const presentCount = records.filter(r => r.status === 'Present').length;
      const absentCount = records.filter(r => r.status === 'Absent').length;
      const partialCount = records.filter(r => r.status === 'Partial').length;
      const typeLabel = attendanceType === 'classroom' ? 'Classroom' : 'Clinical';

      let message = `${presentCount} present, ${absentCount} absent`;
      if (partialCount > 0) {
        message += `, ${partialCount} partial`;
      }

      toast.success(
        `${typeLabel} Attendance Recorded`,
        message
      );

      onComplete?.();
      onClose();
    } catch (error) {
      console.error('Failed to save attendance:', error);
      toast.error('Save Failed', 'Could not save attendance records');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusButton = (studentId: string, status: AttendanceStatus, icon: React.ReactNode, label: string, color: string) => {
    const record = attendanceRecords.get(studentId);
    const isSelected = record?.status === status;

    return (
      <button
        onClick={() => updateStatus(studentId, status)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          isSelected
            ? `${color} text-white shadow-sm`
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  };

  // Calculate summary
  const summary = {
    present: Array.from(attendanceRecords.values()).filter(r => r.status === 'Present').length,
    absent: Array.from(attendanceRecords.values()).filter(r => r.status === 'Absent').length,
    tardy: Array.from(attendanceRecords.values()).filter(r => r.status === 'Tardy').length,
    excused: Array.from(attendanceRecords.values()).filter(r => r.status === 'Excused').length,
    partial: Array.from(attendanceRecords.values()).filter(r => r.status === 'Partial').length
  };

  // Calculate total makeup hours that will be created
  const totalMakeupHours = attendanceType === 'clinical'
    ? Array.from(attendanceRecords.values()).reduce((acc, record) => {
        if (record.status === 'Absent') {
          return acc + record.hoursRequired;
        } else if (record.status === 'Partial' && record.hoursAttended !== null) {
          return acc + Math.max(0, record.hoursRequired - record.hoursAttended);
        }
        return acc;
      }, 0)
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Take Attendance"
      size="xl"
      footer={
        <div className="flex flex-col gap-3 w-full">
          {/* Summary Stats */}
          <div className="flex gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="font-medium text-gray-600">{summary.present} Present</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="font-medium text-gray-600">{summary.absent} Absent</span>
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="font-medium text-gray-600">{summary.tardy} Tardy</span>
            </span>
            {attendanceType === 'clinical' && summary.partial > 0 && (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="font-medium text-gray-600">{summary.partial} Partial</span>
              </span>
            )}
          </div>

          {/* Makeup Hours Warning */}
          {attendanceType === 'clinical' && totalMakeupHours > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">{totalMakeupHours} make-up hours will be created</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary px-8 shadow-md disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Save Attendance
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Attendance Type Selector */}
        <div className="mb-2">
          <label className="text-sm font-bold text-gray-700 mb-2 block">Attendance Type</label>
          <div className="flex gap-3">
            <button
              onClick={() => setAttendanceType('classroom')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                attendanceType === 'classroom'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              Classroom
            </button>
            <button
              onClick={() => setAttendanceType('clinical')}
              className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                attendanceType === 'clinical'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              Clinical
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">{todayFormatted}</p>
            <p className="text-xs text-gray-400">{students.length} students enrolled</p>
          </div>
          <button
            onClick={markAllPresent}
            className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Mark All Present
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Student List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredStudents.map(student => {
              const record = attendanceRecords.get(student.id);
              return (
                <div
                  key={student.id}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    record?.status === 'Present'
                      ? 'border-green-200 bg-green-50/30'
                      : record?.status === 'Absent'
                      ? 'border-red-200 bg-red-50/30'
                      : record?.status === 'Tardy'
                      ? 'border-yellow-200 bg-yellow-50/30'
                      : record?.status === 'Partial'
                      ? 'border-orange-200 bg-orange-50/30'
                      : 'border-gray-100 bg-gray-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{student.cohort}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {getStatusButton(
                        student.id,
                        'Present',
                        <UserCheck className="w-3.5 h-3.5" />,
                        'Present',
                        'bg-green-500'
                      )}
                      {getStatusButton(
                        student.id,
                        'Absent',
                        <UserX className="w-3.5 h-3.5" />,
                        'Absent',
                        'bg-red-500'
                      )}
                      {getStatusButton(
                        student.id,
                        'Tardy',
                        <Clock className="w-3.5 h-3.5" />,
                        'Tardy',
                        'bg-yellow-500'
                      )}
                      {/* Only show Partial for clinical attendance */}
                      {attendanceType === 'clinical' && getStatusButton(
                        student.id,
                        'Partial',
                        <Timer className="w-3.5 h-3.5" />,
                        'Partial',
                        'bg-orange-500'
                      )}
                      {getStatusButton(
                        student.id,
                        'Excused',
                        <AlertCircle className="w-3.5 h-3.5" />,
                        'Excused',
                        'bg-blue-500'
                      )}
                    </div>
                  </div>

                  {/* Hours input for Partial attendance (clinical only) */}
                  {attendanceType === 'clinical' && record?.status === 'Partial' && (
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-600">Hours attended:</label>
                      <input
                        type="number"
                        min="0"
                        max={record.hoursRequired}
                        step="0.5"
                        value={record.hoursAttended || 0}
                        onChange={(e) => updateHoursAttended(student.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-500">
                        of {record.hoursRequired} hrs
                        {record.hoursAttended !== null && record.hoursAttended < record.hoursRequired && (
                          <span className="text-orange-600 font-medium ml-1">
                            ({record.hoursRequired - record.hoursAttended} hrs makeup needed)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Notes for absent/excused/partial */}
                  {(record?.status === 'Absent' || record?.status === 'Excused' || record?.status === 'Partial') && (
                    <input
                      type="text"
                      placeholder={record.status === 'Partial' ? "Reason for leaving early..." : "Add notes (reason for absence)..."}
                      value={record?.notes || ''}
                      onChange={(e) => updateNotes(student.id, e.target.value)}
                      className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
