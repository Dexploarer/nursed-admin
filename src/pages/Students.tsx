
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Student } from '@/types';
import { loadStudents, enrollStudent, updateStudent } from '@/lib/db';
import { parseStudentCSV, validateStudents, downloadCSVTemplate } from '@/lib/csv-import';
import { exportStudentsToPDF } from '@/lib/pdf-export';
import { exportStudentsToCSV } from '@/lib/csv-export';
import { undoManager } from '@/lib/undo-manager';
import { Search, MoreVertical, TrendingUp, AlertOctagon, BrainCircuit, Table, BarChart, CheckCircle, Upload, Download, FileSpreadsheet, Users, ChevronUp, ChevronDown, Filter, X } from 'lucide-react';

type SortField = 'name' | 'status' | 'hours' | 'predictor';
type SortDirection = 'asc' | 'desc';

export default function StudentsPage() {
  const [viewMode, setViewMode] = useState<'roster' | 'nclex'>('roster');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ firstName: '', lastName: '', email: '', dob: '' });
  const [importing, setImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Power user features
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadStudents().then(setStudents).catch(console.error);
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

    await enrollStudent(student);
    const updated = await loadStudents();
    setStudents(updated);
    
    setShowModal(false);
    setNewStudent({ firstName: '', lastName: '', email: '', dob: '' });
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const parsedStudents = await parseStudentCSV(file);
      const { valid, errors } = validateStudents(parsedStudents);

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      // Import valid students
      for (const student of valid) {
        await enrollStudent(student);
      }

      // Reload students
      const updated = await loadStudents();
      setStudents(updated);

      if (valid.length > 0) {
        alert(`Successfully imported ${valid.length} student(s)${errors.length > 0 ? `. ${errors.length} errors found.` : '.'}`);
      }

      if (errors.length === 0) {
        setShowImportModal(false);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportErrors([error instanceof Error ? error.message : 'Import failed']);
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
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

    try {
      // Update all selected students
      for (const student of studentsToUpdate) {
        const updated: Student = { ...student, status: newStatus };
        await updateStudent(updated);
      }

      // Reload students
      const updated = await loadStudents();
      setStudents(updated);

      // Add undo action
      undoManager.addAction({
        id: `bulk-status-${Date.now()}`,
        type: 'bulk_update',
        description: `Changed ${selectedStudents.size} student(s) status to ${newStatus}`,
        timestamp: Date.now(),
        undo: async () => {
          for (const student of previousStates) {
            await updateStudent(student);
          }
          const reverted = await loadStudents();
          setStudents(reverted);
        },
        redo: async () => {
          for (const student of studentsToUpdate) {
            const updated: Student = { ...student, status: newStatus };
            await updateStudent(updated);
          }
          const redone = await loadStudents();
          setStudents(redone);
        }
      });

      setSelectedStudents(new Set());
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Failed to update students');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -m-8 p-8">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-2">
              {viewMode === 'roster' ? 'Student Roster' : 'NCLEX Readiness'}
            </h1>
            <p className="text-gray-600 text-lg">Fall 2025 Cohort | {students.length} Students</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white p-1.5 rounded-xl flex shadow-sm border border-gray-200">
               <button
                  onClick={() => setViewMode('roster')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${
                    viewMode === 'roster' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                  }`}
               >
                  <Table className="w-4 h-4" />
                  Roster
               </button>
               <button
                  onClick={() => setViewMode('nclex')}
                  className={`px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-2 transition-all ${
                    viewMode === 'nclex' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                  }`}
               >
                  <BarChart className="w-4 h-4" />
                  NCLEX Dash
               </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => exportStudentsToPDF(students, 'roster')}
                disabled={students.length === 0}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => exportStudentsToCSV(students, `students_${new Date().toISOString().split('T')[0]}.csv`)}
                disabled={students.length === 0}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md disabled:opacity-50 flex items-center gap-2 font-bold transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md flex items-center gap-2 font-bold transition-all"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
              <button
                 onClick={() => setShowModal(true)}
                 className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl font-bold transition-all"
              >
                + Add Student
              </button>
            </div>
          </div>
      </header>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={handleEnroll} className="card w-full max-w-2xl p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#0f4c75] to-[#1a5f8b] text-white">
              <h2 className="text-xl font-bold">Enroll New Student</h2>
              <p className="text-blue-100 text-sm">Fall 2025 Professional Nursing Cycle</p>
            </div>
            <div className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">First Name</label>
                <input 
                  required
                  type="text" 
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent({...newStudent, firstName: e.target.value})}
                  placeholder="e.g. Michael" 
                  className="w-full p-2.5 border rounded-md text-sm focus:ring-2 focus:ring-[#0f4c75] outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last Name</label>
                <input 
                  required
                  type="text" 
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent({...newStudent, lastName: e.target.value})}
                  placeholder="e.g. Scott" 
                  className="w-full p-2.5 border rounded-md text-sm focus:ring-2 focus:ring-[#0f4c75] outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
                  placeholder="m.scott@pctc.edu" 
                  className="w-full p-2.5 border rounded-md text-sm focus:ring-2 focus:ring-[#0f4c75] outline-none" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</label>
                <input 
                  type="date" 
                  value={newStudent.dob}
                  onChange={(e) => setNewStudent({...newStudent, dob: e.target.value})}
                  className="w-full p-2.5 border rounded-md text-sm focus:ring-2 focus:ring-[#0f4c75] outline-none" 
                />
              </div>
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
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                 type="button"
                 onClick={() => setShowModal(false)}
                 className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary px-8 shadow-md">
                Complete Enrollment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl p-0 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#0f4c75] to-[#1a5f8b] text-white">
              <h2 className="text-xl font-bold">Import Students from CSV</h2>
              <p className="text-blue-100 text-sm">Bulk enrollment for Fall 2025</p>
            </div>
            <div className="p-8">
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

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-indigo-600 hover:text-indigo-700 font-medium">
                    Choose a CSV file
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVImport}
                    disabled={importing}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  CSV files only. Maximum 1000 students.
                </p>
              </div>

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
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportErrors([]);
                }}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Roster View */}
      {viewMode === 'roster' && (
        <>
          {/* Bulk Actions Bar */}
          {selectedStudents.size > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-md border-2 border-indigo-200 mb-6 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-black text-indigo-900 text-lg">
                    {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={() => setSelectedStudents(new Set())}
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-bold"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBulkStatusUpdate('Active')}
                    className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 hover:shadow-md text-sm font-bold transition-all"
                  >
                    Mark Active
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('At Risk')}
                    className="px-5 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 hover:shadow-md text-sm font-bold transition-all"
                  >
                    Mark At Risk
                  </button>
                  <button
                    onClick={() => handleBulkStatusUpdate('Graduated')}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-md text-sm font-bold transition-all"
                  >
                    Mark Graduated
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

          <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden transition-all">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-b border-gray-200">
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
                  <th className="px-6 py-4 text-xs font-black text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-gray-100 rounded-full">
                            <Users className="w-12 h-12 text-gray-400" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Students Enrolled Yet</h3>
                        <p className="text-gray-600 mb-6 max-w-md mx-auto">
                          Get started by adding your first student manually or import your entire cohort from a CSV file.
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => setShowImportModal(true)}
                            className="btn btn-outline flex items-center gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Import CSV
                          </button>
                          <button
                            onClick={() => setShowModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                          >
                            <Users className="w-4 h-4" />
                            Add First Student
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16">
                      <div className="text-center">
                        <div className="flex justify-center mb-4">
                          <div className="p-4 bg-gray-100 rounded-full">
                            <Search className="w-12 h-12 text-gray-400" />
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Students Found</h3>
                        <p className="text-gray-600 mb-6">
                          No students match your current search or filter criteria.
                        </p>
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                          className="btn btn-outline"
                        >
                          Clear Filters
                        </button>
                      </div>
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
                    <td className="px-6 py-4 text-gray-400 cursor-pointer hover:text-[#0f4c75]">
                      <MoreVertical className="w-5 h-5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                  <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  NCLEX Remediation Pipeline
                </h3>
                <button className="text-xs text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-wider">Export Analytics</button>
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
                             <button className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] uppercase underline underline-offset-4 decoration-2">Assign Plan</button>
                           ) : remStatus === 'Assigned' ? (
                             <button className="text-orange-600 hover:text-orange-700 font-bold text-[11px] uppercase">Begin Session</button>
                           ) : remStatus === 'In Progress' ? (
                              <button className="text-indigo-600 hover:text-indigo-700 font-bold text-[11px] uppercase">Review Work</button>
                           ) : remStatus === 'Validated' ? (
                              <span className="text-green-600 font-bold text-[11px] uppercase flex items-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Validated
                              </span>
                           ) : (
                              <span className="text-gray-300 font-bold text-[11px] uppercase">Monitor</span>
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
