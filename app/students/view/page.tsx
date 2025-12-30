'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { getStudent, getClinicalLogs, updateStudentNotes } from '@/lib/db';
import { printClinicalLog } from '@/lib/pdf-export';
import { addRecentlyViewed } from '@/lib/recently-viewed';
import { Student, ClinicalLog } from '@/types';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Award,
  Clock,
  Save,
  Edit3,
  Printer
} from 'lucide-react';
import { useState, Suspense, useEffect } from 'react';

function StudentDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [student, setStudent] = useState<Student | null>(null);
  const [studentLogs, setStudentLogs] = useState<ClinicalLog[]>([]);
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      getStudent(id)
        .then(s => {
          if (s) {
            setStudent(s);
            setNotes(s.notes || '');
            // Track recently viewed
            addRecentlyViewed(s);
          }
          setLoading(false);
        })
        .catch(err => {
            console.error("Failed to load student:", err);
            alert("Failed to load student details. Please try again.");
            setLoading(false);
        });
        
      getClinicalLogs(id)
        .then(setStudentLogs)
        .catch(err => {
            console.error("Failed to load logs:", err);
            // Non-critical, just log
        });
    }
  }, [id]);

  if (loading) return <div className="p-8">Loading student profile...</div>;

  if (!id || !student) {
    return <div className="p-8">Student not found.</div>;
  }

  return (
    <div className="container p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className="header-title flex items-center gap-3">
              {student.firstName} {student.lastName}
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                student.status === 'Active' ? 'bg-green-100 text-green-700' : 
                student.status === 'At Risk' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {student.status}
              </span>
            </h1>
            <p className="text-muted">Student ID: {student.id} | Cohort: {student.cohort}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-blue-200 text-[#0f4c75] rounded-lg hover:bg-blue-50 text-sm font-bold bg-white transition-all active:scale-95 shadow-sm">
            <Edit3 className="w-4 h-4" />
            Edit Profile
          </button>
          <button 
            onClick={async () => {
              try {
                  await updateStudentNotes(student.id, notes);
                  setIsEditing(false);
                  alert('Student Record Synchronized Successfully.');
              } catch (e) {
                  console.error("Failed to save notes:", e);
                  alert("Failed to save changes. Please check your connection or try again.");
              }
            }}
            className="btn btn-primary flex items-center gap-2 shadow-lg hover:shadow-indigo-200/50"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Contact & Academic Stats */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-5 h-5 text-indigo-500" />
                <span className="text-sm">{student.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="w-5 h-5 text-indigo-500" />
                <span className="text-sm">{student.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <span className="text-sm">DOB: {student.dob}</span>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-indigo-50 border-indigo-100">
            <h3 className="text-sm font-bold text-[#0f4c75] uppercase tracking-widest mb-4">Academic Standings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase">Current GPA</div>
                <div className="text-2xl font-black text-indigo-700">{student.gpa}</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <div className="text-[10px] text-gray-400 font-bold uppercase">NCLEX Prob.</div>
                <div className="text-2xl font-black text-green-600">{student.winProbability}%</div>
              </div>
            </div>
          </div>
          
          <div className="card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Instructor Notes</h3>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-indigo-600 font-bold text-[10px] uppercase"
              >
                {isEditing ? 'View' : 'Edit'}
              </button>
            </div>
            {isEditing ? (
              <textarea 
                className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[150px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed italic">
                &ldquo;{notes}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Middle & Right Column: Academic Logs & Grades */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Award className="w-4 h-4 text-indigo-600" />
                Transcript & Course Grades
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white border-b text-[10px] uppercase font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-3">Course</th>
                  <th className="px-6 py-3">Semester</th>
                  <th className="px-6 py-3 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.grades?.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-800 text-sm">{g.courseName}</div>
                      <div className="text-[10px] text-gray-400">{g.courseId}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{g.semester}</td>
                    <td className={`px-6 py-4 text-right font-black ${g.grade >= 90 ? 'text-green-600' : g.grade >= 80 ? 'text-indigo-600' : 'text-orange-600'}`}>
                      {g.grade}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-600" />
                Recent Clinical Activity
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {studentLogs.length > 0 ? studentLogs.map(log => (
                <div key={log.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{log.siteName}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="w-3 h-3" /> {log.date}
                    </div>
                    <div className="mt-2 text-xs font-medium bg-gray-100 px-2 py-1 rounded w-fit text-gray-600">
                      {log.patientDiagnosis}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        log.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {log.status}
                      </span>
                      {log.instructorFeedback && (
                        <div className="text-[10px] text-gray-400 mt-2 max-w-[200px] italic">
                          &ldquo;{log.instructorFeedback}&rdquo;
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => student && printClinicalLog(log, student)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Print Clinical Log"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-gray-400 text-sm italic">
                  No clinical logs recorded for this student.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function StudentDetailPage() {
  return (
    <Suspense fallback={<div>Loading student details...</div>}>
      <StudentDetailContent />
    </Suspense>
  );
}
