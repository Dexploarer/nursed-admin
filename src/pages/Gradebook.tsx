
import { loadStudents } from '@/lib/db';
import { Student } from '@/types';
import { 
  Search, 
  Download, 
  TrendingUp, 
  Users, 
  FileCheck,
  Plus,
  Bot
} from 'lucide-react';
import { useState, useEffect } from 'react';

const COURSES = [
  { id: 'N101', name: 'Foundations of Nursing' },
  { id: 'N102', name: 'Pharmacology I' },
  { id: 'N103', name: 'Med-Surg Nursing I' },
  { id: 'N104', name: 'Adult Health' },
];

export default function GradebookPage() {
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].id);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents().then(data => {
      setStudents(data);
      setLoading(false);
    });
  }, []);

  const validGpas = students.filter(s => s.gpa !== undefined).map(s => s.gpa as number);
  const avgGpa = validGpas.length ? (validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2) : '0.00';

  return (
    <div className="container p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="header-title flex items-center gap-2">
            Professional Gradebook
          </h1>
          <p className="text-muted">Academic Record Management | Fall 2025 Cycle</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-[#0f4c75] text-[#0f4c75] rounded-lg hover:bg-blue-50 text-sm font-bold bg-white transition-colors">
            <Download className="w-4 h-4" />
            Export Grades (VBON Format)
          </button>
          <button 
            onClick={() => window.location.href = '/assistant'}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-bold shadow-md transition-all active:scale-95"
          >
            <Bot className="w-4 h-4" />
            Grade with AI
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Post New Grades
          </button>
        </div>
      </header>

      {/* Gradebook Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 flex flex-col justify-between border-t-4 border-t-indigo-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase">Cohort Average GPA</div>
              <div className="text-3xl font-black mt-2 text-indigo-700">{avgGpa}</div>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-indigo-500 font-bold uppercase">Academic Excellence Zone</div>
        </div>

        <div className="card p-6 flex flex-col justify-between border-t-4 border-t-green-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase">Pass Rate (&gt;=75%)</div>
              <div className="text-3xl font-black mt-2 text-green-700">92%</div>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-green-500 font-bold uppercase">Target: 100% NCLEX readiness</div>
        </div>

        <div className="card p-6 flex flex-col justify-between border-t-4 border-t-orange-600">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-gray-500 text-xs font-bold uppercase">Total Assignments</div>
              <div className="text-3xl font-black mt-2 text-orange-700">24</div>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 text-[10px] text-orange-500 font-bold uppercase">Med-Surg I in progress</div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div className="flex gap-4">
             {COURSES.map(course => (
               <button 
                  key={course.id}
                  onClick={() => setSelectedCourse(course.id)}
                  className={`px-4 py-2 text-xs font-bold transition-all rounded-md ${
                    selectedCourse === course.id 
                    ? 'bg-[#0f4c75] text-white shadow-md' 
                    : 'text-gray-500 hover:bg-gray-100'
                  }`}
               >
                 {course.name}
               </button>
             ))}
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-2 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Filter cohort..." 
               className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c75]"
             />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-white border-b text-[10px] uppercase font-bold text-gray-400">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Test 1</th>
              <th className="px-6 py-4">Test 2</th>
              <th className="px-6 py-4">Clinical Eval</th>
              <th className="px-6 py-4">Final Score</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
               <tr><td colSpan={6} className="text-center py-8">Loading grades...</td></tr>
            ) : students.map(student => {
               // Safe grade lookup
               const gradeObj = student.grades?.find(g => g.courseId === selectedCourse);
               const grade = gradeObj ? gradeObj.grade : 0;
               
               return (
                 <tr key={student.id} className="hover:bg-gray-50 group">
                    <td className="px-6 py-4">
                       <div className="font-bold text-gray-800">{student.firstName} {student.lastName}</div>
                       <div className="text-[10px] text-gray-400">GPA: {student.gpa}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">88%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">92%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">PASS</td>
                    <td className="px-6 py-4">
                       <span className="font-black text-indigo-700">{grade}%</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                         Number(grade) >= 80 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                       }`}>
                         {Number(grade) >= 80 ? 'EXEMPT' : 'CORE'}
                       </span>
                    </td>
                 </tr>
               );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
