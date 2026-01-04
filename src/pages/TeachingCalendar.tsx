import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { getAllCourses, getAllLessonPlans } from '@/lib/db';
import type { Course, LessonPlan } from '@/types';
import { format, startOfWeek, addWeeks, addDays, parseISO } from 'date-fns';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { clsx } from 'clsx';

export default function TeachingCalendar() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const toast = useToast();

  // Calculate semester weeks (16 weeks typical)
  const semesterStart = useMemo(() => {
    // Default to first week of current semester
    // Fall: Aug, Spring: Jan
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    if (month >= 7) { // Aug-Dec = Fall
      return new Date(year, 7, 1); // Aug 1
    } else { // Jan-Jul = Spring
      return new Date(year, 0, 15); // Jan 15
    }
  }, [selectedDate]);

  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 16; i++) {
      const weekStart = startOfWeek(addWeeks(semesterStart, i), { weekStartsOn: 1 });
      result.push({
        weekNum: i + 1,
        startDate: weekStart,
        endDate: addDays(weekStart, 6),
        label: `Week ${i + 1}`,
        dateRange: `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d')}`
      });
    }
    return result;
  }, [semesterStart]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesData, plansData] = await Promise.all([
        getAllCourses(),
        getAllLessonPlans()
      ]);
      setCourses(coursesData);
      setLessonPlans(plansData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Error', 'Failed to load teaching calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Group lesson plans by week and course
  const planGrid = useMemo(() => {
    const grid: Record<number, Record<string, LessonPlan[]>> = {};

    weeks.forEach((_, i) => {
      grid[i] = {};
      courses.forEach(course => {
        grid[i][course.id] = [];
      });
      // Also track plans without course
      grid[i]['_no_course'] = [];
    });

    lessonPlans.forEach(plan => {
      try {
        const planDate = parseISO(plan.date);
        const weekIndex = weeks.findIndex(w =>
          planDate >= w.startDate && planDate <= w.endDate
        );

        if (weekIndex >= 0) {
          const courseKey = plan.courseId || '_no_course';
          if (!grid[weekIndex][courseKey]) {
            grid[weekIndex][courseKey] = [];
          }
          grid[weekIndex][courseKey].push(plan);
        }
      } catch {
        // Skip invalid dates
      }
    });

    return grid;
  }, [weeks, courses, lessonPlans]);

  const handleViewPlan = (plan: LessonPlan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const handleExportPDF = async () => {
    toast.info('Export', 'PDF export coming soon');
  };

  const handlePrevSemester = () => {
    setSelectedDate(addWeeks(semesterStart, -16));
  };

  const handleNextSemester = () => {
    setSelectedDate(addWeeks(semesterStart, 16));
  };

  const getSemesterLabel = () => {
    const month = semesterStart.getMonth();
    const year = semesterStart.getFullYear();
    return month >= 7 ? `Fall ${year}` : `Spring ${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-teal-600 to-cyan-600 rounded-2xl shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-teal-900 to-cyan-900 bg-clip-text text-transparent mb-1">
                Teaching Calendar
              </h1>
              <p className="text-gray-600 text-lg font-medium">Semester Grid View</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              className="btn btn-outline flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Semester Navigation */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6 flex items-center justify-between">
        <button
          onClick={handlePrevSemester}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{getSemesterLabel()}</h2>
          <p className="text-sm text-gray-500">
            {format(semesterStart, 'MMM d, yyyy')} - {format(addWeeks(semesterStart, 15), 'MMM d, yyyy')}
          </p>
        </div>
        <button
          onClick={handleNextSemester}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
        {courses.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Courses Configured</h3>
            <p className="text-gray-500 mb-4">Add courses in Curriculum Management to see them here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-linear-to-r from-teal-50 to-cyan-50 border-b border-gray-200">
                  <th className="sticky left-0 bg-linear-to-r from-teal-50 to-cyan-50 px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-28">
                    Week
                  </th>
                  {courses.map(course => (
                    <th
                      key={course.id}
                      className="px-3 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider min-w-[180px]"
                    >
                      <div className="text-teal-700">{course.code}</div>
                      <div className="text-[10px] font-normal text-gray-500 truncate max-w-[160px]">
                        {course.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week, weekIdx) => (
                  <tr
                    key={week.weekNum}
                    className={clsx(
                      "border-b border-gray-100 hover:bg-gray-50/50",
                      weekIdx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    )}
                  >
                    <td className="sticky left-0 bg-inherit px-4 py-3 border-r border-gray-100">
                      <div className="text-sm font-bold text-gray-800">{week.label}</div>
                      <div className="text-[10px] text-gray-500">{week.dateRange}</div>
                    </td>
                    {courses.map(course => {
                      const plans = planGrid[weekIdx]?.[course.id] || [];
                      return (
                        <td
                          key={course.id}
                          className="px-2 py-2 border-r border-gray-100 align-top"
                        >
                          {plans.length > 0 ? (
                            <div className="space-y-1">
                              {plans.map(plan => (
                                <button
                                  key={plan.id}
                                  onClick={() => handleViewPlan(plan)}
                                  className="w-full text-left p-2 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-100 transition-colors group"
                                >
                                  <div className="text-xs font-semibold text-teal-800 truncate group-hover:text-teal-900">
                                    {plan.topic}
                                  </div>
                                  {plan.chapter && (
                                    <div className="text-[10px] text-teal-600 truncate">
                                      Ch. {plan.chapter}
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="h-12 flex items-center justify-center">
                              <span className="text-xs text-gray-300">—</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={selectedPlan?.topic || 'Lesson Details'}
        size="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Date</label>
                <p className="text-gray-900">{format(parseISO(selectedPlan.date), 'EEEE, MMMM d, yyyy')}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Week</label>
                <p className="text-gray-900">Week {selectedPlan.weekNumber || '—'}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Course</label>
              <p className="text-gray-900">{selectedPlan.courseName}</p>
            </div>

            {selectedPlan.chapter && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Chapter</label>
                <p className="text-gray-900">{selectedPlan.chapter}</p>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Topic</label>
              <p className="text-gray-900 font-medium">{selectedPlan.topic}</p>
            </div>

            {selectedPlan.topicsCovered && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Topics Covered</label>
                <p className="text-gray-700">{selectedPlan.topicsCovered}</p>
              </div>
            )}

            {selectedPlan.assessmentMethod && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Assessment Method</label>
                <p className="text-gray-700">{selectedPlan.assessmentMethod}</p>
              </div>
            )}

            {selectedPlan.notes && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Notes</label>
                <p className="text-gray-700">{selectedPlan.notes}</p>
              </div>
            )}

            {selectedPlan.notesForNextTime && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <label className="text-xs font-semibold text-amber-700 uppercase">Notes for Next Time</label>
                <p className="text-amber-800 mt-1">{selectedPlan.notesForNextTime}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
