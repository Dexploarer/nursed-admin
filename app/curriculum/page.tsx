
import { seedModules, seedStandards } from '@/lib/data';
import { Link as LinkIcon } from 'lucide-react';

export default function CurriculumPage() {
  return (
    <div className="container">
      <header className="mb-8">
        <h1 className="header-title">Curriculum Map</h1>
        <p className="text-muted">Align Syllabus with NCLEX-PN 2023/2026 Test Plans</p>
      </header>

      <div className="space-y-6">
        {seedModules.map((module) => (
          <div key={module.id} className="card p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-xs font-bold text-[#0f4c75] bg-blue-50 px-2 py-1 rounded inline-block mb-2">
                  Week {module.week}
                </div>
                <h2 className="text-xl font-bold text-[#2d3436]">{module.title}</h2>
                <p className="text-gray-600 mt-1">{module.description}</p>
              </div>
              <button className="btn btn-outline text-xs">
                Edit Alignment
              </button>
            </div>

            <div className="border-t pt-4 mt-2">
               <h3 className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 mb-3">
                 <LinkIcon className="w-3 h-3" />
                 Mapped Standards
               </h3>
               <div className="grid gap-2">
                 {module.mappedNclexCategories.map(catId => {
                   const standard = seedStandards.find(s => s.id === catId);
                   return (
                     <div key={catId} className="flex gap-3 items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                        <span className="font-mono text-xs bg-white border px-1 rounded text-gray-500">{standard?.code}</span>
                        <span className="text-gray-700">{standard?.description}</span>
                     </div>
                   );
                 })}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
