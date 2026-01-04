import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  ClipboardCheck,
  Users,
  UserX,
  Clock,
  AlertTriangle,
  Search,
  Download,
  BookOpen,
  Stethoscope,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Filter,
  Timer,
  Eye
} from 'lucide-react';
import { loadStudents, getStudentAttendance, getStudentsWithAttendanceIssues, getStudentAttendanceDetail } from '@/lib/db';
import { Student, Attendance, AttendanceSummary } from '@/types';
import { useToast } from '@/components/Toast';
import { Skeleton, SkeletonCard } from '@/components/Skeleton';
import { DateRangePicker } from '@/components/DateRangePicker';
import TakeAttendanceModal from '@/components/TakeAttendanceModal';
import MakeupHoursTracker from '@/components/MakeupHoursTracker';
import { Modal } from '@/components/Modal';
import { clsx } from 'clsx';

type ViewMode = 'table' | 'calendar';
type AttendanceTypeFilter = 'all' | 'classroom' | 'clinical';
type TabView = 'attendance' | 'makeup';

interface StudentAttendanceData {
  student: Student;
  records: Attendance[];
  classroomStats: { present: number; absent: number; tardy: number; excused: number; partial: number };
  clinicalStats: { present: number; absent: number; tardy: number; excused: number; partial: number };
  totalStats: { present: number; absent: number; tardy: number; excused: number; partial: number };
  attendanceRate: number;
}

interface StudentDetailModalProps {
  student: Student | null;
  records: Attendance[];
  isOpen: boolean;
  onClose: () => void;
}

function StudentDetailModal({ student, records, isOpen, onClose }: StudentDetailModalProps) {
  if (!student) return null;

  const absences = records.filter(r => r.status === 'Absent' || r.status === 'Partial');
  const tardies = records.filter(r => r.status === 'Tardy');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Attendance History - ${student.firstName} ${student.lastName}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div className="text-2xl font-black text-green-600">
              {records.filter(r => r.status === 'Present').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Present</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-xl">
            <div className="text-2xl font-black text-red-600">
              {records.filter(r => r.status === 'Absent').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Absent</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-xl">
            <div className="text-2xl font-black text-yellow-600">
              {records.filter(r => r.status === 'Tardy').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Tardy</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-xl">
            <div className="text-2xl font-black text-orange-600">
              {records.filter(r => r.status === 'Partial').length}
            </div>
            <div className="text-xs text-gray-500 font-medium">Partial</div>
          </div>
        </div>

        {/* Absences List */}
        {absences.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <UserX className="w-4 h-4 text-red-600" />
              Absences & Partial Attendance ({absences.length})
            </h3>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {absences.map((record) => (
                <div
                  key={record.id}
                  className={clsx(
                    'p-3 rounded-lg border',
                    record.status === 'Absent' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        record.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      )}>
                        {record.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {format(parseISO(record.date), 'MMM d, yyyy')}
                      </span>
                      <span className={clsx(
                        'text-xs px-2 py-0.5 rounded-full',
                        record.attendanceType === 'clinical' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                      )}>
                        {record.attendanceType}
                      </span>
                    </div>
                    {record.status === 'Partial' && record.hoursAttended !== undefined && (
                      <span className="text-xs text-orange-600 font-medium">
                        {record.hoursAttended}/{record.hoursRequired} hrs
                      </span>
                    )}
                  </div>
                  {record.notes && (
                    <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tardies List */}
        {tardies.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Tardies ({tardies.length})
            </h3>
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {tardies.map((record) => (
                <div
                  key={record.id}
                  className="p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {format(parseISO(record.date), 'MMM d, yyyy')}
                    </span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full',
                      record.attendanceType === 'clinical' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                    )}>
                      {record.attendanceType}
                    </span>
                  </div>
                  {record.notes && (
                    <p className="text-xs text-gray-500 mt-1">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {absences.length === 0 && tardies.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">Perfect attendance record!</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendance, setAllAttendance] = useState<Map<string, Attendance[]>>(new Map());
  const [attendanceIssues, setAttendanceIssues] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [typeFilter, setTypeFilter] = useState<AttendanceTypeFilter>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [tabView, setTabView] = useState<TabView>('attendance');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showTakeAttendanceModal, setShowTakeAttendanceModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedStudentRecords, setSelectedStudentRecords] = useState<Attendance[]>([]);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const studentData = await loadStudents();
      setStudents(studentData);

      // Load attendance for all students
      const attendanceMap = new Map<string, Attendance[]>();
      for (const student of studentData) {
        const records = await getStudentAttendance(student.id);
        attendanceMap.set(student.id, records);
      }
      setAllAttendance(attendanceMap);

      // Load attendance issues
      const issues = await getStudentsWithAttendanceIssues(2);
      setAttendanceIssues(issues);
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      toast.error('Failed to load attendance', 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Get unique cohorts
  const cohorts = useMemo(() => {
    const uniqueCohorts = [...new Set(students.map(s => s.cohort))];
    return uniqueCohorts.sort();
  }, [students]);

  // Process student attendance data
  const studentAttendanceData: StudentAttendanceData[] = useMemo(() => {
    return students.map(student => {
      const records = allAttendance.get(student.id) || [];

      // Filter by date range
      const filteredRecords = records.filter(r => {
        if (!dateRange.from || !dateRange.to) return true;
        const recordDate = parseISO(r.date);
        return isWithinInterval(recordDate, {
          start: startOfDay(dateRange.from),
          end: endOfDay(dateRange.to)
        });
      });

      // Calculate stats by type
      const classroomRecords = filteredRecords.filter(r => r.attendanceType === 'classroom');
      const clinicalRecords = filteredRecords.filter(r => r.attendanceType === 'clinical');

      const calcStats = (recs: Attendance[]) => ({
        present: recs.filter(r => r.status === 'Present').length,
        absent: recs.filter(r => r.status === 'Absent').length,
        tardy: recs.filter(r => r.status === 'Tardy').length,
        excused: recs.filter(r => r.status === 'Excused').length,
        partial: recs.filter(r => r.status === 'Partial').length
      });

      const classroomStats = calcStats(classroomRecords);
      const clinicalStats = calcStats(clinicalRecords);
      const totalStats = calcStats(filteredRecords);

      const totalSessions = totalStats.present + totalStats.absent + totalStats.tardy + totalStats.excused + totalStats.partial;
      const attendanceRate = totalSessions > 0
        ? Math.round(((totalStats.present + totalStats.excused) / totalSessions) * 100)
        : 100;

      return {
        student,
        records: filteredRecords,
        classroomStats,
        clinicalStats,
        totalStats,
        attendanceRate
      };
    });
  }, [students, allAttendance, dateRange]);

  // Filter by search, type, and cohort
  const filteredData = useMemo(() => {
    return studentAttendanceData.filter(data => {
      const matchesSearch = `${data.student.firstName} ${data.student.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Cohort filter
      if (cohortFilter !== 'all' && data.student.cohort !== cohortFilter) return false;

      if (typeFilter === 'all') return true;

      // Check if student has records of the filtered type
      return data.records.some(r => r.attendanceType === typeFilter);
    });
  }, [studentAttendanceData, searchTerm, typeFilter, cohortFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    let presentToday = 0;
    let monthlyAbsences = 0;
    let totalTardies = 0;
    let totalPartials = 0;
    let totalRecords = 0;

    filteredData.forEach(data => {
      // Today's present
      const todayRecord = data.records.find(r => r.date === today);
      if (todayRecord?.status === 'Present') presentToday++;

      // Monthly absences, tardies, and partials
      monthlyAbsences += data.totalStats.absent;
      totalTardies += data.totalStats.tardy;
      totalPartials += data.totalStats.partial;
      totalRecords += data.totalStats.present + data.totalStats.absent + data.totalStats.tardy + data.totalStats.excused + data.totalStats.partial;
    });

    const tardyRate = totalRecords > 0 ? Math.round((totalTardies / totalRecords) * 100) : 0;
    const atRiskCount = filteredData.filter(d => d.attendanceRate < 90).length;

    return { presentToday, monthlyAbsences, tardyRate, atRiskCount, totalPartials };
  }, [filteredData]);

  // Calendar view helpers
  const calendarDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(calendarMonth),
      end: endOfMonth(calendarMonth)
    });
  }, [calendarMonth]);

  const getAttendanceForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAttendance: { student: Student; record: Attendance }[] = [];

    filteredData.forEach(data => {
      const record = data.records.find(r => r.date === dateStr);
      if (record) {
        dayAttendance.push({ student: data.student, record });
      }
    });

    return dayAttendance;
  };

  const handleViewStudentDetail = async (student: Student) => {
    try {
      const records = await getStudentAttendanceDetail(student.id);
      setSelectedStudent(student);
      setSelectedStudentRecords(records);
      setShowStudentDetail(true);
    } catch (error) {
      console.error('Failed to load student attendance detail:', error);
      toast.error('Failed to load details', 'Please try again');
    }
  };

  const handleExport = () => {
    // Create CSV export
    const headers = ['Student Name', 'Cohort', 'Classroom Present', 'Classroom Absent', 'Classroom Tardy', 'Clinical Present', 'Clinical Absent', 'Clinical Tardy', 'Clinical Partial', 'Attendance Rate'];
    const rows = filteredData.map(d => [
      `${d.student.firstName} ${d.student.lastName}`,
      d.student.cohort,
      d.classroomStats.present,
      d.classroomStats.absent,
      d.classroomStats.tardy,
      d.clinicalStats.present,
      d.clinicalStats.absent,
      d.clinicalStats.tardy,
      d.clinicalStats.partial,
      `${d.attendanceRate}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export Complete', 'Attendance report downloaded');
  };

  if (loading) {
    return (
      <div className="min-h-screen space-y-8">
        <header className="mb-8">
          <Skeleton variant="rectangular" height={60} width="40%" className="mb-3" />
          <Skeleton variant="text" width="30%" />
        </header>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-linear-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
            <ClipboardCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-emerald-900 to-teal-900 bg-clip-text text-transparent mb-1">
              Attendance Tracker
            </h1>
            <p className="text-gray-600 text-lg font-medium">Classroom & Clinical Attendance Management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="btn btn-outline flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            onClick={() => setShowTakeAttendanceModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Take Attendance
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTabView('attendance')}
          className={clsx(
            'px-6 py-2.5 rounded-lg text-sm font-bold transition-all',
            tabView === 'attendance'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Attendance Records
        </button>
        <button
          onClick={() => setTabView('makeup')}
          className={clsx(
            'px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2',
            tabView === 'makeup'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Clock className="w-4 h-4" />
          Make-Up Hours
        </button>
      </div>

      {tabView === 'attendance' ? (
        <>
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-green-100 to-emerald-200 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900">{summaryStats.presentToday}</div>
                <div className="text-sm text-gray-500 font-medium">Present Today</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-red-100 to-rose-200 rounded-xl">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900">{summaryStats.monthlyAbsences}</div>
                <div className="text-sm text-gray-500 font-medium">Total Absences</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-yellow-100 to-amber-200 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900">{summaryStats.tardyRate}%</div>
                <div className="text-sm text-gray-500 font-medium">Tardy Rate</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-orange-100 to-amber-200 rounded-xl">
                <Timer className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900">{summaryStats.totalPartials}</div>
                <div className="text-sm text-gray-500 font-medium">Partial Days</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-linear-to-br from-red-100 to-orange-200 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900">{summaryStats.atRiskCount}</div>
                <div className="text-sm text-gray-500 font-medium">At-Risk Students</div>
              </div>
            </div>
          </div>

          {/* Filters & Controls */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Range */}
              <div className="flex-1 min-w-[280px]">
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Select date range"
                />
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as AttendanceTypeFilter)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="classroom">Classroom Only</option>
                  <option value="clinical">Clinical Only</option>
                </select>
              </div>

              {/* Cohort Filter */}
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">All Cohorts</option>
                  {cohorts.map(cohort => (
                    <option key={cohort} value={cohort}>{cohort}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('table')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                    viewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <List className="w-4 h-4" />
                  Table
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all',
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </button>
              </div>
            </div>
          </div>

          {/* Content View */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          Classroom
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-center gap-1">
                          <Stethoscope className="w-4 h-4" />
                          Clinical
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Attendance Rate
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center">
                          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No attendance records found</p>
                          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((data) => (
                        <tr key={data.student.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                {data.student.firstName.charAt(0)}{data.student.lastName.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">
                                  {data.student.firstName} {data.student.lastName}
                                </div>
                                <div className="text-xs text-gray-500">{data.student.cohort}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                {data.classroomStats.present}P
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                                {data.classroomStats.absent}A
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold">
                                {data.classroomStats.tardy}T
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                                {data.clinicalStats.present}P
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-bold">
                                {data.clinicalStats.absent}A
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-bold">
                                {data.clinicalStats.tardy}T
                              </span>
                              {data.clinicalStats.partial > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold">
                                  {data.clinicalStats.partial}P
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div
                                  className={clsx(
                                    'h-2 rounded-full transition-all',
                                    data.attendanceRate >= 95 ? 'bg-green-500' :
                                    data.attendanceRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                                  )}
                                  style={{ width: `${data.attendanceRate}%` }}
                                />
                              </div>
                              <span className="font-bold text-gray-900">{data.attendanceRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {data.attendanceRate >= 95 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                                <CheckCircle className="w-3 h-3" />
                                Good
                              </span>
                            ) : data.attendanceRate >= 90 ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                <Clock className="w-3 h-3" />
                                Warning
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                <AlertTriangle className="w-3 h-3" />
                                At Risk
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleViewStudentDetail(data.student)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Calendar View */
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-gray-900">
                  {format(calendarMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCalendarMonth(new Date())}
                    className="px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-bold text-gray-500 uppercase">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before the month starts */}
                {Array.from({ length: startOfMonth(calendarMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="p-2 min-h-[100px]" />
                ))}

                {/* Calendar Days */}
                {calendarDays.map(day => {
                  const dayAttendance = getAttendanceForDay(day);
                  const isToday = isSameDay(day, new Date());
                  const presentCount = dayAttendance.filter(a => a.record.status === 'Present').length;
                  const absentCount = dayAttendance.filter(a => a.record.status === 'Absent').length;
                  const tardyCount = dayAttendance.filter(a => a.record.status === 'Tardy').length;
                  const partialCount = dayAttendance.filter(a => a.record.status === 'Partial').length;

                  return (
                    <div
                      key={day.toISOString()}
                      className={clsx(
                        'p-2 min-h-[100px] rounded-xl border-2 transition-all',
                        isToday ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <div className={clsx(
                        'text-sm font-bold mb-2',
                        isToday ? 'text-indigo-600' : 'text-gray-700'
                      )}>
                        {format(day, 'd')}
                      </div>
                      {dayAttendance.length > 0 && (
                        <div className="space-y-1">
                          {presentCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              {presentCount} Present
                            </div>
                          )}
                          {absentCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                              <div className="w-2 h-2 rounded-full bg-red-500" />
                              {absentCount} Absent
                            </div>
                          )}
                          {tardyCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-yellow-600">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              {tardyCount} Tardy
                            </div>
                          )}
                          {partialCount > 0 && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              {partialCount} Partial
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-gray-600">Present</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-gray-600">Absent</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-gray-600">Tardy</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-gray-600">Partial</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-gray-600">Excused</span>
                </div>
              </div>
            </div>
          )}

          {/* Students at Risk Section */}
          {attendanceIssues.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-linear-to-r from-red-50 to-orange-50 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Students with Attendance Concerns
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attendanceIssues.slice(0, 6).map((issue) => {
                    const student = students.find(s => s.id === issue.studentId);
                    if (!student) return null;

                    return (
                      <div
                        key={issue.studentId}
                        className="p-4 bg-red-50/50 border-2 border-red-100 rounded-xl cursor-pointer hover:border-red-200 transition-colors"
                        onClick={() => handleViewStudentDetail(student)}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                            <UserX className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{student.firstName} {student.lastName}</div>
                            <div className="text-xs text-gray-500">{student.cohort}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-red-600 font-bold">{issue.totalAbsences} absences</span>
                          <span className="text-yellow-600 font-bold">{issue.totalTardies} tardies</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Makeup Hours Tab */
        <MakeupHoursTracker onRefresh={loadData} />
      )}

      {/* Take Attendance Modal */}
      <TakeAttendanceModal
        isOpen={showTakeAttendanceModal}
        onClose={() => setShowTakeAttendanceModal(false)}
        onComplete={loadData}
      />

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        records={selectedStudentRecords}
        isOpen={showStudentDetail}
        onClose={() => {
          setShowStudentDetail(false);
          setSelectedStudent(null);
          setSelectedStudentRecords([]);
        }}
      />
    </div>
  );
}
