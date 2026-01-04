import { useState, useEffect } from 'react';
import { loadStudents, updateStudentSkills, saveSkillValidation, getSkillValidations } from '@/lib/db';
import { Student, SkillValidation } from '@/types';
import { useToast } from '@/components/Toast';
import { Modal, FormField, Input, Textarea } from '@/components';
import { exportSkillsMatrixToCSV } from '@/lib/csv-export';
import {
  Target,
  CheckCircle2,
  Circle,
  AlertCircle,
  TrendingUp,
  Users,
  Award,
  Download,
  Filter,
  Search,
  Calendar,
  MapPin,
  User
} from 'lucide-react';

// VBON Required Skills for PN Program
const CORE_SKILLS = [
  { id: 'vitals', category: 'Basic Care', name: 'Vital Signs Assessment', required: true },
  { id: 'handwashing', category: 'Infection Control', name: 'Hand Hygiene & PPE', required: true },
  { id: 'bedmaking', category: 'Basic Care', name: 'Bed Making (Occupied/Unoccupied)', required: true },
  { id: 'catheter', category: 'Elimination', name: 'Urinary Catheterization', required: true },
  { id: 'injection-im', category: 'Medication Admin', name: 'IM Injection', required: true },
  { id: 'injection-subq', category: 'Medication Admin', name: 'SubQ Injection', required: true },
  { id: 'iv-insertion', category: 'IV Therapy', name: 'Peripheral IV Insertion', required: true },
  { id: 'wound-care', category: 'Wound Management', name: 'Sterile Dressing Change', required: true },
  { id: 'ng-tube', category: 'Nutrition', name: 'NG Tube Insertion & Care', required: true },
  { id: 'trach-care', category: 'Respiratory', name: 'Tracheostomy Care', required: true },
  { id: 'cpr', category: 'Emergency', name: 'CPR & Emergency Response', required: true },
  { id: 'med-calc', category: 'Medication Admin', name: 'Medication Dosage Calculation', required: true },
  { id: 'glucose', category: 'Assessment', name: 'Blood Glucose Monitoring', required: true },
  { id: 'ekg', category: 'Cardiac', name: 'ECG/EKG Application', required: false },
  { id: 'ostomy', category: 'Elimination', name: 'Ostomy Care', required: false },
];

type SkillProficiency = 'not-started' | 'beginner' | 'competent' | 'proficient' | 'expert';

export default function SkillsMatrixPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'not-started' | 'in-progress' | 'completed'>('all');
  const [updatingSkills, setUpdatingSkills] = useState<Set<string>>(new Set());

  // Skill validation metadata state
  const [skillValidations, setSkillValidations] = useState<Map<string, SkillValidation>>(new Map());
  const [validationDate, setValidationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [validationLocation, setValidationLocation] = useState<string>('');
  const [validatedBy, setValidatedBy] = useState<string>('');
  const [validationNotes, setValidationNotes] = useState<string>('');

  useEffect(() => {
    loadStudents().then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  // Fetch skill validations for all students
  useEffect(() => {
    const fetchValidations = async () => {
      const validationsMap = new Map<string, SkillValidation>();
      for (const student of students) {
        try {
          const validations = await getSkillValidations(student.id);
          for (const validation of validations) {
            // Key by studentId-skillId for quick lookup
            validationsMap.set(`${validation.studentId}-${validation.skillId}`, validation);
          }
        } catch (error) {
          // Backend may not exist yet - silently fail
          console.debug('Could not fetch skill validations:', error);
        }
      }
      setSkillValidations(validationsMap);
    };

    if (students.length > 0) {
      fetchValidations();
    }
  }, [students]);

  // Get student skills from database - check validation data first, then fall back to skillsCompleted
  const getStudentSkillProficiency = (studentId: string, skillId: string): SkillProficiency => {
    // First check if we have validation data with proficiency
    const validation = skillValidations.get(`${studentId}-${skillId}`);
    if (validation) {
      return validation.proficiency;
    }

    // Fall back to checking skillsCompleted array
    const student = students.find(s => s.id === studentId);
    if (student?.skillsCompleted?.includes(skillId)) {
      return 'proficient';
    }
    return 'not-started';
  };

  // Get validation metadata for a skill
  const getSkillValidationData = (studentId: string, skillId: string): SkillValidation | undefined => {
    return skillValidations.get(`${studentId}-${skillId}`);
  };

  const [showProficiencyModal, setShowProficiencyModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<{ studentId: string; skillId: string } | null>(null);
  const [selectedProficiency, setSelectedProficiency] = useState<SkillProficiency>('not-started');

  const handleSkillClick = async (studentId: string, skillId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const currentProficiency = getStudentSkillProficiency(studentId, skillId);
    const existingValidation = getSkillValidationData(studentId, skillId);

    setSelectedSkill({ studentId, skillId });
    setSelectedProficiency(currentProficiency);

    // Pre-populate validation fields if existing validation data exists
    if (existingValidation) {
      setValidationDate(existingValidation.validatedDate || new Date().toISOString().split('T')[0]);
      setValidationLocation(existingValidation.validatedLocation || '');
      setValidatedBy(existingValidation.validatedBy || '');
      setValidationNotes(existingValidation.notes || '');
    } else {
      // Reset to defaults for new validation
      setValidationDate(new Date().toISOString().split('T')[0]);
      setValidationLocation('');
      setValidatedBy('');
      setValidationNotes('');
    }

    setShowProficiencyModal(true);
  };

  const handleSaveProficiency = async () => {
    if (!selectedSkill) return;

    const student = students.find(s => s.id === selectedSkill.studentId);
    if (!student) return;

    setUpdatingSkills(prev => new Set(prev).add(`${selectedSkill.studentId}-${selectedSkill.skillId}`));

    try {
      const currentSkills = student.skillsCompleted || [];
      let updatedSkills: string[];

      if (selectedProficiency === 'not-started') {
        // Remove skill if set to not-started
        updatedSkills = currentSkills.filter(id => id !== selectedSkill.skillId);
      } else {
        // Add skill to completed list (for any proficiency level)
        if (!currentSkills.includes(selectedSkill.skillId)) {
          updatedSkills = [...currentSkills, selectedSkill.skillId];
        } else {
          updatedSkills = currentSkills;
        }
      }

      await updateStudentSkills(selectedSkill.studentId, updatedSkills);

      // Save skill validation metadata (if not "not-started")
      if (selectedProficiency !== 'not-started') {
        const validation: SkillValidation = {
          id: `VAL-${Date.now()}`,
          studentId: selectedSkill.studentId,
          skillId: selectedSkill.skillId,
          proficiency: selectedProficiency,
          validatedDate: validationDate,
          validatedLocation: validationLocation || undefined,
          validatedBy: validatedBy || undefined,
          notes: validationNotes || undefined,
          createdAt: new Date().toISOString()
        };

        try {
          await saveSkillValidation(validation);
          // Update local state
          setSkillValidations(prev => {
            const next = new Map(prev);
            next.set(`${validation.studentId}-${validation.skillId}`, validation);
            return next;
          });
        } catch (error) {
          // Backend may not exist yet - just log and continue
          console.debug('Could not save skill validation metadata:', error);
        }
      } else {
        // Remove validation from local state if set to not-started
        setSkillValidations(prev => {
          const next = new Map(prev);
          next.delete(`${selectedSkill.studentId}-${selectedSkill.skillId}`);
          return next;
        });
      }

      // Reload students to get updated data
      const updated = await loadStudents();
      setStudents(updated);

      setShowProficiencyModal(false);
      setSelectedSkill(null);
      toast.success('Proficiency Updated', `Skill proficiency has been set to ${selectedProficiency.replace('-', ' ')}`);
    } catch (error) {
      console.error('Failed to update skill:', error);
      toast.error('Update Failed', 'Failed to update skill proficiency. Please try again.');
    } finally {
      setUpdatingSkills(prev => {
        const next = new Set(prev);
        next.delete(`${selectedSkill.studentId}-${selectedSkill.skillId}`);
        return next;
      });
    }
  };

  const categories = ['all', ...Array.from(new Set(CORE_SKILLS.map(s => s.category)))];
  const filteredSkills = categoryFilter === 'all'
    ? CORE_SKILLS
    : CORE_SKILLS.filter(s => s.category === categoryFilter);

  // Helper to map proficiency to status category
  const getProficiencyStatus = (proficiency: SkillProficiency): 'not-started' | 'in-progress' | 'completed' => {
    if (proficiency === 'not-started') return 'not-started';
    if (proficiency === 'beginner' || proficiency === 'competent') return 'in-progress';
    return 'completed'; // proficient or expert
  };

  // Filter students by search and status filter
  const filteredStudents = students.filter(s => {
    // First filter by search term
    if (!`${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Then filter by status (if not 'all')
    if (statusFilter === 'all') {
      return true;
    }

    // Check if student has ANY skill matching the status filter
    return filteredSkills.some(skill => {
      const proficiency = getStudentSkillProficiency(s.id, skill.id);
      return getProficiencyStatus(proficiency) === statusFilter;
    });
  });

  const getProficiencyColor = (proficiency: SkillProficiency) => {
    switch (proficiency) {
      case 'expert': return 'bg-emerald-500';
      case 'proficient': return 'bg-green-500';
      case 'competent': return 'bg-blue-500';
      case 'beginner': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const getProficiencyIcon = (proficiency: SkillProficiency) => {
    if (proficiency === 'expert' || proficiency === 'proficient') {
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    } else if (proficiency === 'not-started') {
      return <Circle className="w-5 h-5 text-gray-300" />;
    }
    return <AlertCircle className="w-5 h-5 text-yellow-600" />;
  };

  // Calculate cohort stats
  const totalSkills = CORE_SKILLS.length;
  const avgCompletion = students.length > 0
    ? Math.round(
        students.reduce((sum, student) => {
          const completed = CORE_SKILLS.filter(skill => {
            const prof = getStudentSkillProficiency(student.id, skill.id);
            return prof === 'proficient' || prof === 'expert';
          }).length;
          return sum + (completed / totalSkills) * 100;
        }, 0) / students.length
      )
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading skills data...</p>
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
              <div className="p-3 bg-linear-to-br from-green-600 to-emerald-600 rounded-2xl shadow-lg">
                <Target className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-green-900 to-emerald-900 bg-clip-text text-transparent mb-1">
                  Clinical Skills Matrix
                </h1>
                <p className="text-gray-600 text-lg font-medium">VBON Competency Tracker | Fall 2025 Cohort</p>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  // Pass skill validations to include metadata in export
                  await exportSkillsMatrixToCSV(
                    students,
                    `skills-matrix-${new Date().toISOString().split('T')[0]}.csv`,
                    skillValidations
                  );
                  toast.success('Export Complete', 'Skills matrix with validation metadata exported successfully');
                } catch (error) {
                  console.error('Export failed:', error);
                  toast.error('Export Failed', 'Failed to export skills matrix. Please try again.');
                }
              }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              <Download className="w-5 h-5" />
              Export Matrix
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Target className="w-6 h-6 text-indigo-600" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{totalSkills}</div>
              <div className="text-sm text-gray-500 font-medium">Total Skills</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{avgCompletion}%</div>
              <div className="text-sm text-gray-500 font-medium">Cohort Avg Completion</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">{students.length}</div>
              <div className="text-sm text-gray-500 font-medium">Active Students</div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-amber-100 rounded-xl">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-black text-gray-900 mb-1">
                {CORE_SKILLS.filter(s => s.required).length}
              </div>
              <div className="text-sm text-gray-500 font-medium">Required Skills</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer shadow-sm font-medium"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[180px]">
              <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'not-started' | 'in-progress' | 'completed')}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none cursor-pointer shadow-sm font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Skills Matrix Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-linear-to-r from-indigo-600 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider sticky left-0 bg-indigo-600 z-10">
                    Student
                  </th>
                  {filteredSkills.map(skill => (
                    <th
                      key={skill.id}
                      className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider min-w-[140px]"
                      title={skill.name}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs opacity-70">{skill.category}</span>
                        <span className="text-sm">{skill.name.substring(0, 20)}{skill.name.length > 20 ? '...' : ''}</span>
                        {skill.required && (
                          <span className="bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-black">
                            REQUIRED
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={filteredSkills.length + 2} className="px-6 py-12 text-center text-gray-500">
                      No students found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student, idx) => {
                    const completedSkills = filteredSkills.filter(skill => {
                      const prof = getStudentSkillProficiency(student.id, skill.id);
                      return prof === 'proficient' || prof === 'expert';
                    }).length;
                    const progress = Math.round((completedSkills / filteredSkills.length) * 100);

                    return (
                      <tr
                        key={student.id}
                        className={`hover:bg-indigo-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-6 py-4 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                          <div className="font-bold text-gray-900">{student.firstName} {student.lastName}</div>
                          <div className="text-xs text-gray-500">{student.id}</div>
                        </td>
                        {filteredSkills.map(skill => {
                          const proficiency = getStudentSkillProficiency(student.id, skill.id);
                          const isUpdating = updatingSkills.has(`${student.id}-${skill.id}`);
                          const validation = getSkillValidationData(student.id, skill.id);

                          // Build tooltip with validation metadata
                          let tooltipText = isUpdating ? 'Updating...' : 'Click to set proficiency';
                          if (validation && proficiency !== 'not-started') {
                            const parts = [`Proficiency: ${proficiency.replace('-', ' ')}`];
                            if (validation.validatedDate) {
                              parts.push(`Validated: ${new Date(validation.validatedDate).toLocaleDateString()}`);
                            }
                            if (validation.validatedBy) {
                              parts.push(`By: ${validation.validatedBy}`);
                            }
                            if (validation.validatedLocation) {
                              parts.push(`Location: ${validation.validatedLocation}`);
                            }
                            tooltipText = parts.join('\n');
                          }

                          return (
                            <td
                              key={skill.id}
                              className="px-4 py-4 text-center cursor-pointer hover:bg-indigo-100/50 transition-colors group relative"
                              onClick={() => !isUpdating && handleSkillClick(student.id, skill.id)}
                              title={tooltipText}
                            >
                              <div className="flex flex-col items-center gap-1">
                                {isUpdating ? (
                                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  getProficiencyIcon(proficiency)
                                )}
                                <div className={`w-16 h-2 rounded-full ${getProficiencyColor(proficiency)}`} />
                                <span className="text-[10px] text-gray-500 font-medium uppercase">
                                  {proficiency.replace('-', ' ')}
                                </span>
                                {/* Show validation indicator */}
                                {validation && proficiency !== 'not-started' && (
                                  <div className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" title="Validated" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-2xl font-black text-indigo-600">{progress}%</div>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-linear-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Proficiency Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-600">Not Started</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">Beginner</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">Competent</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Proficient</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-600">Expert</span>
            </div>
          </div>
        </div>

      {/* Proficiency Selection Modal */}
      <Modal
        isOpen={showProficiencyModal}
        onClose={() => {
          setShowProficiencyModal(false);
          setSelectedSkill(null);
        }}
        title="Set Skill Proficiency & Validation"
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowProficiencyModal(false);
                setSelectedSkill(null);
              }}
              className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProficiency}
              disabled={updatingSkills.has(selectedSkill ? `${selectedSkill.studentId}-${selectedSkill.skillId}` : '')}
              className="btn btn-primary px-8 shadow-md whitespace-nowrap disabled:opacity-50"
            >
              {updatingSkills.has(selectedSkill ? `${selectedSkill.studentId}-${selectedSkill.skillId}` : '') ? 'Saving...' : 'Save Validation'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {selectedSkill && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Student:</strong> {students.find(s => s.id === selectedSkill.studentId)?.firstName} {students.find(s => s.id === selectedSkill.studentId)?.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Skill:</strong> {CORE_SKILLS.find(s => s.id === selectedSkill.skillId)?.name}
                </p>
              </div>

              <FormField label="Proficiency Level" required>
                <select
                  value={selectedProficiency}
                  onChange={(e) => setSelectedProficiency(e.target.value as SkillProficiency)}
                  className="w-full px-4 py-2.5 border-2 rounded-xl text-sm font-medium border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="not-started">Not Started</option>
                  <option value="beginner">Beginner</option>
                  <option value="competent">Competent</option>
                  <option value="proficient">Proficient</option>
                  <option value="expert">Expert</option>
                </select>
              </FormField>

              {/* Validation Metadata Section - Only show when not "not-started" */}
              {selectedProficiency !== 'not-started' && (
                <div className="border-t border-gray-200 pt-6 space-y-4">
                  <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Validation Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Validation Date" required>
                      <Input
                        type="date"
                        value={validationDate}
                        onChange={(e) => setValidationDate(e.target.value)}
                      />
                    </FormField>

                    <FormField label="Validated By" hint="Instructor name or initials">
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="text"
                          value={validatedBy}
                          onChange={(e) => setValidatedBy(e.target.value)}
                          placeholder="e.g., J. Smith, RN"
                          className="pl-10"
                        />
                      </div>
                    </FormField>
                  </div>

                  <FormField label="Validation Location" hint="Clinical site or skills lab">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        value={validationLocation}
                        onChange={(e) => setValidationLocation(e.target.value)}
                        placeholder="e.g., Page Memorial Hospital - Skills Lab"
                        className="pl-10"
                      />
                    </div>
                  </FormField>

                  <FormField label="Notes" hint="Optional comments or observations">
                    <Textarea
                      value={validationNotes}
                      onChange={(e) => setValidationNotes(e.target.value)}
                      placeholder="Any additional notes about the validation..."
                      rows={3}
                    />
                  </FormField>
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-xs text-indigo-800 font-medium">
                  <strong>Proficiency Levels:</strong>
                </p>
                <ul className="text-xs text-indigo-700 mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Not Started:</strong> Student has not attempted this skill</li>
                  <li><strong>Beginner:</strong> Student requires supervision and guidance</li>
                  <li><strong>Competent:</strong> Student can perform skill independently with occasional guidance</li>
                  <li><strong>Proficient:</strong> Student performs skill consistently and accurately</li>
                  <li><strong>Expert:</strong> Student demonstrates mastery and can teach others</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
