import { useState, useEffect } from 'react';
import { loadStudents } from '@/lib/db';
import { Student } from '@/types';
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
  Search
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

interface StudentSkill {
  skillId: string;
  proficiency: SkillProficiency;
  lastValidated?: Date;
  validatedBy?: string;
}

export default function SkillsMatrixPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    loadStudents().then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  // Mock student skills data (in real app, this would come from database)
  const getStudentSkillProficiency = (studentId: string, skillId: string): SkillProficiency => {
    const seed = studentId.charCodeAt(0) + skillId.charCodeAt(0);
    const proficiencies: SkillProficiency[] = ['not-started', 'beginner', 'competent', 'proficient', 'expert'];
    return proficiencies[seed % proficiencies.length];
  };

  const categories = ['all', ...Array.from(new Set(CORE_SKILLS.map(s => s.category)))];
  const filteredSkills = categoryFilter === 'all'
    ? CORE_SKILLS
    : CORE_SKILLS.filter(s => s.category === categoryFilter);

  const filteredStudents = students.filter(s =>
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 -m-8 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Target className="w-10 h-10 text-indigo-600" />
                Clinical Skills Matrix
              </h1>
              <p className="text-gray-600 text-lg">VBON Competency Tracker | Fall 2025 Cohort</p>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all font-semibold">
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
          </div>
        </div>

        {/* Skills Matrix Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
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
                          return (
                            <td key={skill.id} className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {getProficiencyIcon(proficiency)}
                                <div className={`w-16 h-2 rounded-full ${getProficiencyColor(proficiency)}`} />
                                <span className="text-[10px] text-gray-500 font-medium uppercase">
                                  {proficiency.replace('-', ' ')}
                                </span>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-2xl font-black text-indigo-600">{progress}%</div>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-2 rounded-full transition-all"
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
    </div>
  );
}
