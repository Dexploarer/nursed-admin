
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Student } from '@/types';
import { useStudentData } from '@/contexts/StudentDataContext';
import { setNewStudentModalTrigger, setImportDataModalTrigger } from '@/hooks/useMenuEvents';
import { parseStudentCSV, validateStudents, downloadCSVTemplate } from '@/lib/csv-import';
import { exportStudentsToPDF } from '@/lib/pdf-export';
import { exportStudentsToCSV } from '@/lib/csv-export';
import { undoManager } from '@/lib/undo-manager';
import { Search, TrendingUp, AlertOctagon, BrainCircuit, Table, BarChart, CheckCircle, Upload, Download, FileSpreadsheet, Users, ChevronUp, ChevronDown, Filter, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { BulkActionsBar } from '@/components/BulkActionsBar';
import { FormField, Input } from '@/components/FormField';
import { EmptyState } from '@/components/EmptyState';
import { FileUpload } from '@/components/FileUpload';
import { ConfirmDialog } from '@/components/ConfirmDialog';

type SortField = 'name' | 'status' | 'hours' | 'predictor';
type SortDirection = 'asc' | 'desc';

export default function StudentsPage() {
  const { students, addStudent, updateStudent, deleteStudents: deleteStudentsContext } = useStudentData();
  const [viewMode, setViewMode] = useState<'roster' | 'nclex'>('roster');
  const [showModal, setShowModal] = useState(false);
  const [_showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', dob: '', cohort: 'Fall 2025' });
  const [_editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  // Power user features
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [_showExportDialog, _setShowExportDialog] = useState(false);

  // Students are now loaded via context, no need for manual loading

  // Register menu event triggers
  useEffect(() => {
    setNewStudentModalTrigger(() => setShowModal(true));
    setImportDataModalTrigger(() => setShowImportModal(true));
  }, []);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.firstName || !newStudent.lastName) return;

    const student: Student = {
      ...newStudent,
      id: `LPN-${Math.floor(Math.random() * 9000) + 1000}`,
      cohort: 'Fall 2025',
      status: 'Active',
      clinicalHoursCompleted: 0,
      clinicalHoursRequired: 400,
      skillsCompleted: [],
      nclexPredictorScore: 0,
      winProbability: 50,
      remediationStatus: 'None',
      grades: []
    };

    await addStudent(student);

    setShowModal(false);
    setNewStudent({ firstName: '', lastName: '', email: '', dob: '', cohort: 'Fall 2025' });
    toast.success('Student enrolled successfully!', `${student.firstName} ${student.lastName} has been added to the cohort`);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleDelete = async () => {
    if (selectedStudents.size === 0) {
      toast.error('No Selection', 'Please select at least one student to delete');
      return;
    }

    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedStudents.size === 0) return;

    // Capture the selected IDs before any state changes
    const selectedIds = Array.from(selectedStudents);
    const studentsToDelete = students.filter(s => selectedIds.includes(s.id));

    if (studentsToDelete.length === 0) {
      toast.error('No Students Found', 'Selected students could not be found');
      setShowDeleteModal(false);
      return;
    }

    const count = studentsToDelete.length;

    setDeleting(true);
    try {
      console.log(`Starting deletion of ${count} students:`, selectedIds);

      // Delete all selected students using context method (will auto-refresh)
      await deleteStudentsContext(selectedIds);

      console.log('Deletion completed and data refreshed');

      setSelectedStudents(new Set());
      setShowDeleteModal(false);
      toast.success(
        `${count} Student${count > 1 ? 's' : ''} Deleted`,
        `${count} student${count > 1 ? 's have' : ' has'} been removed from the cohort`
      );
    } catch (error) {
      console.error('Failed to delete students:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete students. Please try again.';
      toast.error('Delete Failed', errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  // Bulk action handlers
  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const handleBulkStatusUpdate = async (newStatus: "Active" | "At Risk" | "Graduated") => {
    if (selectedStudents.size === 0) return;

    const studentsToUpdate = students.filter(s => selectedStudents.has(s.id));
    const previousStates = studentsToUpdate.map(s => ({ ...s }));
    const updateCount = selectedStudents.size;

    try {
      // Update all selected students (context will auto-refresh)
      for (const student of studentsToUpdate) {
        const updated: Student = { ...student, status: newStatus };
        await updateStudent(updated);
      }

      // Add undo action
      undoManager.addAction({
        id: `bulk-status-${Date.now()}`,
        type: 'bulk_update',
        description: `Changed ${updateCount} student(s) status to ${newStatus}`,
        timestamp: Date.now(),
        undo: async () => {
          for (const student of previousStates) {
            await updateStudent(student);
          }
        },
        redo: async () => {
          for (const student of studentsToUpdate) {
            const updated: Student = { ...student, status: newStatus };
            await updateStudent(updated);
          }
        }
      });

      setSelectedStudents(new Set());
      toast.success(
        `Updated ${updateCount} student(s)`,
        `Status changed to ${newStatus}`
      );
    } catch (error) {
      console.error('Bulk update failed:', error);
      toast.error('Failed to update students', 'Please try again');
    }
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.firstName.toLowerCase().includes(term) ||
        s.lastName.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'hours':
          comparison = a.clinicalHoursCompleted - b.clinicalHoursCompleted;
          break;
        case 'predictor':
          comparison = (a.nclexPredictorScore || 0) - (b.nclexPredictorScore || 0);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchTerm, statusFilter, sortField, sortDirection]);

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-4 h-4 text-white/50" />;
    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4 text-white" />
      : <ChevronDown className="w-4 h-4 text-white" />;
  };

  return (
    <div className="min-h-screen">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-indigo-600 to-blue-600 rounded-2xl shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-indigo-900 to-blue-900 bg-clip-text text-transparent mb-1 flex items-center gap-2">
                {viewMode === 'roster' ? 'Student Roster' : 'NCLEX Readiness'}
              </h1>
              <p className="text-gray-600 text-lg font-medium">Fall 2025 Cohort | {students.length} Students</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white p-1.5 rounded-xl flex shadow-sm border border-gray-200">
               <button
                  onClick={() => setViewMode('roster')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    viewMode === 'roster' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                  }`}
               >
                  <Table className="w-4 h-4 shrink-0" />
                  <span className="truncate">Roster</span>
               </button>
               <button
                  onClick={() => setViewMode('nclex')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    viewMode === 'nclex' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                  }`}
               >
                  <BarChart className="w-4 h-4 shrink-0" />
                  <span className="truncate">NCLEX Dash</span>
               </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportStudentsToPDF(students, 'roster')}
                disabled={students.length === 0}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold transition-all whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">Export PDF</span>
              </button>
              <button
                onClick={() => exportStudentsToCSV(students, `students_${new Date().toISOString().split('T')[0]}.csv`)}
                disabled={students.length === 0}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold transition-all whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span className="truncate">Export CSV</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md flex items-center gap-2 font-bold transition-all whitespace-nowrap"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">Import CSV</span>
              </button>
              <button
                 onClick={() => setShowModal(true)}
                 className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl font-bold transition-all whitespace-nowrap"
              >
                <span>+ Add Student</span>
              </button>
            </div>
          </div>
      </header>

      {/* Add Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Enroll New Student"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="enroll-form"
              className="btn btn-primary px-8 shadow-md whitespace-nowrap"
            >
              Complete Enrollment
            </button>
          </div>
        }
      >
        <form id="enroll-form" onSubmit={handleEnroll} className="space-y-6">
          <p className="text-gray-600 text-sm mb-4">Fall 2025 Professional Nursing Cycle</p>
          <div className="grid grid-cols-2 gap-6">
              <FormField label="First Name" required>
                <Input 
                  required
                  type="text" 
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
                  placeholder="e.g. Michael" 
                />
              </FormField>
              <FormField label="Last Name" required>
                <Input 
                  required
                  type="text" 
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
                  placeholder="e.g. Scott" 
                />
              </FormField>
              <FormField label="Email Address" required>
                <Input 
                  required
                  type="email" 
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  placeholder="m.scott@pctc.edu" 
                />
              </FormField>
              <FormField label="Date of Birth">
                <Input 
                  type="date" 
                  value={newStudent.dob}
                  onChange={(e) => setNewStudent({...newStudent, dob: e.target.value})}
                />
              </FormField>
              <div className="col-span-2 space-y-2 pt-4">
                <div className="flex gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-700 mb-1">Administrative Rights</p>
                    <p className="text-[10px] text-blue-600">Enrolling a student automatically generates a HIPAA-compliant clinical log ID.</p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-10 h-5 bg-indigo-600 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportErrors([]);
        }}
        title="Import Students from CSV"
        size="lg"
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportErrors([]);
              }}
              className="btn btn-outline whitespace-nowrap"
            >
              Close
            </button>
          </div>
        }
      >
        <div>
          <p className="text-gray-600 text-sm mb-4">Bulk enrollment for Fall 2025</p>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with student information. Download the template to see the required format.
                </p>
                <button
                  onClick={downloadCSVTemplate}
                  className="btn btn-outline text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download CSV Template
                </button>
              </div>

              <FileUpload
                accept=".csv"
                multiple={false}
                maxSize={10}
                onUpload={async (files) => {
                  if (files.length > 0) {
                    const file = files[0];
                    setImporting(true);
                    setImportErrors([]);
                    try {
                      const parsed = await parseStudentCSV(file);
                      const { valid, errors } = validateStudents(parsed);
                      setImportErrors(errors);
                      if (valid.length > 0) {
                        for (const student of valid) {
                          await addStudent(student);
                        }
                        toast.success(
                          `Successfully imported ${valid.length} student(s)`,
                          errors.length > 0 ? `${errors.length} errors found` : undefined
                        );
                      }
                      if (errors.length === 0) {
                        setShowImportModal(false);
                      }
                    } catch (error) {
                      console.error('CSV import failed:', error);
                      toast.error('Failed to import CSV', 'Please check the file format');
                    } finally {
                      setImporting(false);
                    }
                  }
                }}
                value={[]}
                disabled={importing}
              />

              {importing && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-indigo-700 font-medium">Importing students...</span>
                  </div>
                </div>
              )}

              {importErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                  <h4 className="font-bold text-red-800 mb-2">Import Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {importErrors.map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
        </div>
      </Modal>

      {/* Roster View */}
      {viewMode === 'roster' && (
        <>
          {/* Bulk Actions Bar */}
          {selectedStudents.size > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900">
                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedStudents(new Set())}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBulkStatusUpdate('Active')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Mark Active
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('At Risk')}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Mark At Risk
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('Graduated')}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Mark Graduated
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                />
              </div>
              <div className="relative min-w-[180px]">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer font-bold"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-visible transition-all">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead className="bg-linear-to-r from-indigo-600 to-blue-600 text-white border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 w-12">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedStudents.size === students.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider cursor-pointer hover:bg-indigo-700 select-none"
                  >
                    <div className="flex items-center gap-2">
                      Name
                      <SortIcon field="name" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider cursor-pointer hover:bg-indigo-700 select-none"
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <SortIcon field="status" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('hours')}
                    className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider cursor-pointer hover:bg-indigo-700 select-none"
                  >
                    <div className="flex items-center gap-2">
                      Clinical Hours
                      <SortIcon field="hours" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('predictor')}
                    className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider cursor-pointer hover:bg-indigo-700 select-none"
                  >
                    <div className="flex items-center gap-2">
                      Predictor
                      <SortIcon field="predictor" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <EmptyState
                        icon={<Users className="w-12 h-12 text-gray-400" />}
                        title="No Students Enrolled Yet"
                        description="Get started by adding your first student manually or import your entire cohort from a CSV file."
                        action={{
                          label: 'Add First Student',
                          onClick: () => setShowModal(true),
                          variant: 'primary',
                        }}
                        secondaryAction={{
                          label: 'Import CSV',
                          onClick: () => setShowImportModal(true),
                        }}
                      />
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16">
                      <EmptyState
                        icon={<Search className="w-12 h-12 text-gray-400" />}
                        title="No Students Found"
                        description="No students match your current search or filter criteria."
                        action={{
                          label: 'Clear Filters',
                          onClick: () => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          },
                          variant: 'outline',
                        }}
                      />
                    </td>
                  </tr>
                ) : filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors animate-in fade-in slide-in-from-left-2 duration-300">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleSelectStudent(student.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize transition-colors hover:text-indigo-600">
                      <Link to={`/students/view?id=${student.id}`} className="block">
                        <span className="font-bold underline decoration-indigo-200 underline-offset-4 decoration-2">{student.firstName} {student.lastName}</span>
                        <div className="text-[10px] text-gray-400 mt-1">VBON ID: {student.id} | {student.email}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${student.status === 'Active' ? 'badge-success' : student.status === 'At Risk' ? 'badge-warning' : 'badge-danger'}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#0f4c75] h-2 rounded-full"
                            style={{ width: `${(student.clinicalHoursCompleted / student.clinicalHoursRequired) * 100}%` }}
                          ></div>
                        </div>
                        <span>{student.clinicalHoursCompleted}/{student.clinicalHoursRequired}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`font-bold ${
                         (student.nclexPredictorScore || 0) < 75 ? 'text-red-500' : 'text-green-600'
                       }`}>
                         {student.nclexPredictorScore || '-'}%
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          <ConfirmDialog
            isOpen={showDeleteModal}
            title={`Delete ${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`}
            message={
              selectedStudents.size > 0 ? (
                <>
                  Are you sure you want to delete <strong>{selectedStudents.size} selected student{selectedStudents.size > 1 ? 's' : ''}</strong>?
                  <br /><br />
                  This will permanently delete all associated data including grades, clinical logs, and certifications for {selectedStudents.size > 1 ? 'these students' : 'this student'}. This action cannot be undone.
                </>
              ) : (
                'Are you sure you want to delete this student?'
              )
            }
            confirmText={deleting ? 'Deleting...' : `Delete ${selectedStudents.size} Student${selectedStudents.size > 1 ? 's' : ''}`}
            cancelText="Cancel"
            variant="danger"
            onConfirm={confirmDelete}
            onCancel={() => {
              setShowDeleteModal(false);
            }}
          />
        </>
      )}

        {/* NCLEX Dashboard View */}
        {viewMode === 'nclex' && (
          <div className="space-y-6">
            {/* High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-gray-500 text-sm font-medium">Projected Pass Rate</div>
                    <div className="text-4xl font-black mt-2 text-gray-900">87%</div>
                  </div>
                  <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-xs text-green-600 font-bold">+2.5% vs last cohort</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-gray-500 text-sm font-medium">Critical Risk Students</div>
                    <div className="text-4xl font-black mt-2 text-red-600">1</div>
                  </div>
                  <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                    <AlertOctagon className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-xs text-red-600 font-bold">Requires Immediate Remediation</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-gray-500 text-sm font-medium">Weakest Topic</div>
                    <div className="text-2xl font-black mt-2 text-gray-900">Pharmacology</div>
                  </div>
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-xl">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-xs text-gray-500 font-medium">Rec: Schedule Gen Lab Review</div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-indigo-50 to-blue-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  NCLEX Remediation Pipeline
                </h3>
                <button className="px-3 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg font-semibold uppercase tracking-wider transition-all">Export Analytics</button>
              </div>
              <table className="w-full text-left">
                <thead className="text-gray-600 text-xs uppercase font-black tracking-widest bg-gray-50 border-b-2 border-gray-200">
                 <tr>
                   <th className="px-6 py-3">Student</th>
                   <th className="px-6 py-3">Predictor</th>
                   <th className="px-6 py-3">Pass Prob.</th>
                   <th className="px-6 py-3">Session State</th>
                   <th className="px-6 py-3">Action</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {students.map((student) => {
                   const score = student.nclexPredictorScore || 0;
                   const prob = student.winProbability || 0;
                   const isRisk = prob < 85;
                   const remStatus = student.remediationStatus || 'None';

                   return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">{student.firstName} {student.lastName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-medium">
                             {score} <span className="text-gray-400">/ 100</span>
                          </div>
                        </td>
                         <td className="px-6 py-4">
                          <div className={`font-bold text-sm ${prob > 90 ? 'text-green-600' : prob > 75 ? 'text-orange-600' : 'text-red-600'}`}>
                            {prob}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col gap-1">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] w-fit font-bold uppercase tracking-tight ${
                               remStatus === 'Validated' ? 'bg-green-100 text-green-700' :
                               remStatus === 'In Progress' ? 'bg-indigo-100 text-indigo-700' :
                               remStatus === 'Assigned' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'
                             }`}>
                               {remStatus === 'None' ? 'No Action' : remStatus}
                             </span>
                             {student.remediationTopic && (
                               <span className="text-[10px] text-gray-400 italic font-medium">{student.remediationTopic}</span>
                             )}
                           </div>
                        </td>
                         <td className="px-6 py-4 text-sm">
                           {remStatus === 'None' && isRisk ? (
                             <button className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold text-xs transition-all whitespace-nowrap">Assign Plan</button>
                           ) : remStatus === 'Assigned' ? (
                             <button className="px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-lg font-semibold text-xs transition-all whitespace-nowrap">Begin Session</button>
                           ) : remStatus === 'In Progress' ? (
                              <button className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold text-xs transition-all whitespace-nowrap">Review Work</button>
                           ) : remStatus === 'Validated' ? (
                              <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap">
                                <CheckCircle className="w-3.5 h-3.5" /> Validated
                              </span>
                           ) : (
                              <span className="px-3 py-1.5 bg-gray-50 text-gray-400 rounded-lg font-semibold text-xs whitespace-nowrap">Monitor</span>
                           )}
                         </td>
                      </tr>
                   );
                   })}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </div>
  );
}
