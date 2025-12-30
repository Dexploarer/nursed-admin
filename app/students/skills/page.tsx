'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStudents, updateStudentSkills } from '@/lib/db';
import { exportStudentsToPDF } from '@/lib/pdf-export';
import { Student } from '@/types';
import { CheckCircle, XCircle, Search, Save, Download, Loader2 } from 'lucide-react';

const LPN_SKILLS = [
  { id: 'S1', category: 'Med-Surg', name: 'Medication Administration' },
  { id: 'S2', category: 'Med-Surg', name: 'Trach Care/Suctioning' },
  { id: 'S3', category: 'Med-Surg', name: 'Foley Catheterization' },
  { id: 'S4', category: 'Med-Surg', name: 'NG Tube Placement' },
  { id: 'S5', category: 'Med-Surg', name: 'Wound Care (Stage 3+)' },
  { id: 'S6', category: 'Leadership', name: 'Directing CNAs/Staff' },
];

export default function SkillsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [competencies, setCompetencies] = useState<Record<string, Set<string>>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await loadStudents();
        setStudents(data);

        // Initialize competencies from student data
        const initial: Record<string, Set<string>> = {};
        data.forEach(s => {
          initial[s.id] = new Set(s.skillsCompleted || []);
        });
        setCompetencies(initial);
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Auto-save with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const autoSaveTimer = setTimeout(async () => {
      setSaving(true);
      try {
        for (const studentId of Object.keys(competencies)) {
          const skills = Array.from(competencies[studentId] || []);
          await updateStudentSkills(studentId, skills);
        }
        setHasUnsavedChanges(false);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setSaving(false);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [competencies, hasUnsavedChanges]);

  const toggleSkill = (studentId: string, skillId: string) => {
    setCompetencies(prev => {
      const next = { ...prev };
      const currentSkills = new Set(next[studentId] || []);
      if (currentSkills.has(skillId)) {
        currentSkills.delete(skillId);
      } else {
        currentSkills.add(skillId);
      }
      next[studentId] = currentSkills;
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Save all student skills to database
      for (const studentId of Object.keys(competencies)) {
        const skills = Array.from(competencies[studentId] || []);
        await updateStudentSkills(studentId, skills);
      }
      alert('Skills Competency Ledger saved successfully!');
    } catch (error) {
      console.error('Failed to save skills:', error);
      alert('Failed to save skills. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [competencies]);

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName} ${s.id}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading skills ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="header-title flex items-center gap-2">
            Skills Competency Ledger
          </h1>
          <p className="text-muted">VBON 18VAC90-27-80 Compliance | Fall 2025 Cohort</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setExporting(true);
              try {
                await exportStudentsToPDF(students, 'skills');
              } catch (error) {
                console.error('Export failed:', error);
                alert('Failed to export PDF. Please try again.');
              } finally {
                setExporting(false);
              }
            }}
            disabled={exporting || students.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-[#0f4c75] rounded-lg hover:bg-blue-50 text-sm font-bold bg-white disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${exporting ? 'animate-pulse' : ''}`} />
            {exporting ? 'Exporting...' : 'PDF Audit Trail'}
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : 'Save Ledger'}
          </button>
        </div>
      </header>

      <div className="card mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search students or skills..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f4c75] focus:border-transparent"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-[#0f4c75] text-white">
            <tr>
              <th className="px-6 py-4 sticky left-0 bg-[#0f4c75] z-10 w-64 border-r border-[#1a5f8b]">Student Name</th>
              {LPN_SKILLS.map(skill => (
                <th key={skill.id} className="px-4 py-4 text-xs font-bold uppercase tracking-wider text-center border-r border-[#1a5f8b]">
                  <div className="w-32 mx-auto">{skill.name}</div>
                  <div className="text-[9px] font-normal text-blue-200 mt-1">{skill.category}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">
                  No students found.
                </td>
              </tr>
            ) : filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold text-gray-800 border-r bg-white sticky left-0 z-10">
                  {student.firstName} {student.lastName}
                  <div className="text-[10px] text-gray-400 font-normal">VBON ID: {student.id}</div>
                </td>
                {LPN_SKILLS.map(skill => {
                  const hasSkill = competencies[student.id]?.has(skill.id);
                  return (
                    <td key={skill.id} className="px-4 py-3 text-center border-r">
                      <button
                        onClick={() => toggleSkill(student.id, skill.id)}
                        className={`p-1.5 rounded-full transition-all duration-200 ${
                          hasSkill 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {hasSkill ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <XCircle className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500 italic">
          💡 Click checkmarks to toggle skill competency. Changes are auto-saved.
        </div>
        <div className="text-sm flex items-center gap-2">
          {saving && (
            <span className="text-indigo-600 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Auto-saving...
            </span>
          )}
          {!saving && lastSaved && (
            <span className="text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Last saved: {lastSaved}
            </span>
          )}
          {!saving && hasUnsavedChanges && !lastSaved && (
            <span className="text-gray-500">Unsaved changes</span>
          )}
        </div>
      </div>
    </div>
  );
}
