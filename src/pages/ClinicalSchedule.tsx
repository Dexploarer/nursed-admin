import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, X, Filter } from 'lucide-react';
import { loadStudents, getAllClinicalSites, getAllPreceptors, getAssignmentsForWeek, createClinicalAssignment, bulkCreateAssignments, cancelAssignment } from '@/lib/db';
import { Student, ClinicalSite, Preceptor, ClinicalAssignment, ClinicalAssignmentWithDetails } from '@/types';
import { useToast } from '@/components/Toast';
import { Modal, FormField, Input, Textarea } from '@/components';

export default function ClinicalSchedulePage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Data
  const [students, setStudents] = useState<Student[]>([]);
  const [sites, setSites] = useState<ClinicalSite[]>([]);
  const [preceptors, setPreceptors] = useState<Preceptor[]>([]);
  const [assignments, setAssignments] = useState<ClinicalAssignmentWithDetails[]>([]);

  // Modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [assignmentForm, setAssignmentForm] = useState({
    studentIds: [] as string[],
    siteId: '',
    preceptorId: '',
    startTime: '07:00',
    endTime: '15:00',
    hours: 8,
    objectives: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterSite, setFilterSite] = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');

  // Calculate week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekEnd = useMemo(() => endOfWeek(currentWeekStart, { weekStartsOn: 1 }), [currentWeekStart]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [currentWeekStart]);

  const loadData = async () => {
    try {
      const [studentsData, sitesData, preceptorsData] = await Promise.all([
        loadStudents(),
        getAllClinicalSites().catch(() => []),
        getAllPreceptors().catch(() => [])
      ]);
      setStudents(studentsData);
      setSites(sitesData);
      setPreceptors(preceptorsData);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');
      const data = await getAssignmentsForWeek(startDate, endDate);
      setAssignments(data);
    } catch (e) {
      console.error('Failed to load assignments:', e);
      setAssignments([]);
    }
  };

  const handlePrevWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const handleNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const handleToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setAssignmentForm({
      studentIds: [],
      siteId: sites[0]?.id || '',
      preceptorId: '',
      startTime: '07:00',
      endTime: '15:00',
      hours: 8,
      objectives: '',
      notes: ''
    });
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedDate || assignmentForm.studentIds.length === 0 || !assignmentForm.siteId) {
      toast.error('Missing required fields', 'Please select at least one student and a site.');
      return;
    }

    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (assignmentForm.studentIds.length === 1) {
        // Single assignment
        const assignment: ClinicalAssignment = {
          id: `ASSIGN-${Date.now()}`,
          studentId: assignmentForm.studentIds[0],
          siteId: assignmentForm.siteId,
          preceptorId: assignmentForm.preceptorId || undefined,
          date: dateStr,
          startTime: assignmentForm.startTime,
          endTime: assignmentForm.endTime,
          hours: assignmentForm.hours,
          objectives: assignmentForm.objectives || undefined,
          notes: assignmentForm.notes || undefined,
          status: 'scheduled',
          createdAt: new Date().toISOString()
        };
        await createClinicalAssignment(assignment);
      } else {
        // Bulk create
        const assignmentsList: ClinicalAssignment[] = assignmentForm.studentIds.map((studentId, idx) => ({
          id: `ASSIGN-${Date.now()}-${idx}`,
          studentId,
          siteId: assignmentForm.siteId,
          preceptorId: assignmentForm.preceptorId || undefined,
          date: dateStr,
          startTime: assignmentForm.startTime,
          endTime: assignmentForm.endTime,
          hours: assignmentForm.hours,
          objectives: assignmentForm.objectives || undefined,
          notes: assignmentForm.notes || undefined,
          status: 'scheduled',
          createdAt: new Date().toISOString()
        }));
        await bulkCreateAssignments(assignmentsList);
      }

      toast.success('Assignment Created', `${assignmentForm.studentIds.length} student(s) scheduled for ${format(selectedDate, 'MMM d')}`);
      setShowAssignmentModal(false);
      loadAssignments();
    } catch (e) {
      console.error('Failed to create assignment:', e);
      toast.error('Failed to create assignment', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    if (!confirm('Cancel this assignment?')) return;
    try {
      await cancelAssignment(assignmentId);
      toast.success('Assignment Cancelled', 'The assignment has been cancelled.');
      loadAssignments();
    } catch (e) {
      console.error('Failed to cancel assignment:', e);
      toast.error('Failed to cancel assignment', 'Please try again.');
    }
  };

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (filterSite !== 'all' && a.siteId !== filterSite) return false;
      if (filterStudent !== 'all' && a.studentId !== filterStudent) return false;
      return true;
    });
  }, [assignments, filterSite, filterStudent]);

  // Get assignments for a specific day
  const getAssignmentsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return filteredAssignments.filter(a => a.date === dayStr);
  };

  // Get site color based on index
  const getSiteColor = (siteId: string) => {
    const index = sites.findIndex(s => s.id === siteId);
    const colors = ['bg-blue-100 border-blue-300 text-blue-800', 'bg-green-100 border-green-300 text-green-800', 'bg-purple-100 border-purple-300 text-purple-800', 'bg-orange-100 border-orange-300 text-orange-800', 'bg-pink-100 border-pink-300 text-pink-800'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-1">
                Clinical Schedule
              </h1>
              <p className="text-gray-600 text-lg font-medium">
                {format(currentWeekStart, 'MMMM d')} - {format(weekEnd, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleDayClick(new Date())}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Schedule Assignment
          </button>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-2">
            <button onClick={handlePrevWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={handleToday} className="px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
              Today
            </button>
            <button onClick={handleNextWeek} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="all">All Students</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Week Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-linear-to-r from-indigo-600 to-blue-600 text-white">
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-4 text-center border-r border-indigo-500 last:border-r-0">
              <div className="text-xs font-medium uppercase opacity-80">{format(day, 'EEE')}</div>
              <div className={`text-2xl font-bold mt-1 ${isSameDay(day, new Date()) ? 'bg-white text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center mx-auto' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7 min-h-[500px]">
          {weekDays.map(day => {
            const dayAssignments = getAssignmentsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className="border-r border-b border-gray-100 last:border-r-0 p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleDayClick(day)}
              >
                <div className="space-y-1">
                  {dayAssignments.slice(0, 6).map(assignment => (
                    <div
                      key={assignment.id}
                      className={`p-2 rounded-lg border text-xs ${getSiteColor(assignment.siteId)} group relative`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-bold truncate">{assignment.studentName}</div>
                      <div className="truncate opacity-80">{assignment.siteName}</div>
                      <div className="flex items-center gap-1 mt-1 opacity-70">
                        <Clock className="w-3 h-3" />
                        {assignment.startTime} - {assignment.endTime}
                      </div>
                      {assignment.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelAssignment(assignment.id)}
                          className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {assignment.status === 'cancelled' && (
                        <div className="absolute inset-0 bg-gray-200/80 flex items-center justify-center rounded-lg">
                          <span className="text-[10px] font-bold text-gray-600">CANCELLED</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {dayAssignments.length > 6 && (
                    <div className="text-center text-xs text-gray-500 font-medium py-1">
                      +{dayAssignments.length - 6} more
                    </div>
                  )}
                  {dayAssignments.length === 0 && (
                    <div className="h-full flex items-center justify-center text-gray-300 text-xs py-8">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assignment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-black text-indigo-600">{filteredAssignments.length}</div>
          <div className="text-sm text-gray-500">This Week</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-black text-green-600">{filteredAssignments.filter(a => a.status === 'completed').length}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-black text-blue-600">{filteredAssignments.filter(a => a.status === 'scheduled').length}</div>
          <div className="text-sm text-gray-500">Scheduled</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-black text-orange-600">{sites.length}</div>
          <div className="text-sm text-gray-500">Active Sites</div>
        </div>
      </div>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title={`Schedule Clinical Assignment - ${selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}`}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAssignmentModal(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              Cancel
            </button>
            <button
              onClick={handleSaveAssignment}
              disabled={saving || assignmentForm.studentIds.length === 0 || !assignmentForm.siteId}
              className="btn btn-primary px-6 disabled:opacity-50"
            >
              {saving ? 'Scheduling...' : `Schedule ${assignmentForm.studentIds.length || 0} Student(s)`}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Multi-select students */}
          <FormField label="Select Students" required hint="Hold Ctrl/Cmd to select multiple">
            <select
              multiple
              value={assignmentForm.studentIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setAssignmentForm({...assignmentForm, studentIds: selected});
              }}
              className="w-full h-40 p-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.cohort})</option>
              ))}
            </select>
            <div className="text-xs text-indigo-600 mt-1">{assignmentForm.studentIds.length} student(s) selected</div>
          </FormField>

          <FormField label="Clinical Site" required>
            <select
              value={assignmentForm.siteId}
              onChange={(e) => setAssignmentForm({...assignmentForm, siteId: e.target.value})}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl"
            >
              <option value="">Select a site...</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.siteType})</option>
              ))}
            </select>
          </FormField>

          <FormField label="Preceptor (Optional)">
            <select
              value={assignmentForm.preceptorId}
              onChange={(e) => setAssignmentForm({...assignmentForm, preceptorId: e.target.value})}
              className="w-full p-2.5 border-2 border-gray-200 rounded-xl"
            >
              <option value="">No specific preceptor</option>
              {preceptors.filter(p => !assignmentForm.siteId || p.siteId === assignmentForm.siteId).map(p => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.credentials ? `, ${p.credentials}` : ''}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Start Time">
              <Input
                type="time"
                value={assignmentForm.startTime}
                onChange={(e) => setAssignmentForm({...assignmentForm, startTime: e.target.value})}
              />
            </FormField>
            <FormField label="End Time">
              <Input
                type="time"
                value={assignmentForm.endTime}
                onChange={(e) => setAssignmentForm({...assignmentForm, endTime: e.target.value})}
              />
            </FormField>
            <FormField label="Hours">
              <Input
                type="number"
                step="0.5"
                min="1"
                max="16"
                value={assignmentForm.hours}
                onChange={(e) => setAssignmentForm({...assignmentForm, hours: parseFloat(e.target.value) || 8})}
              />
            </FormField>
          </div>

          <FormField label="Day Objectives (Optional)">
            <Textarea
              value={assignmentForm.objectives}
              onChange={(e) => setAssignmentForm({...assignmentForm, objectives: e.target.value})}
              rows={2}
              placeholder="Learning objectives for this clinical day..."
            />
          </FormField>

          <FormField label="Notes (Optional)">
            <Textarea
              value={assignmentForm.notes}
              onChange={(e) => setAssignmentForm({...assignmentForm, notes: e.target.value})}
              rows={2}
              placeholder="Additional notes..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
