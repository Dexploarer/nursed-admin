

import { useState } from 'react';
import { Upload, FileText, CheckCircle, Clock } from 'lucide-react';
import { indexDocument } from '@/lib/db';

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState([
    { id: 1, name: 'VBON_Regs_18VAC90-27.pdf', size: '2.4 MB', status: 'Indexed', date: 'Oct 12, 2025' },
    { id: 2, name: 'NCLEX-PN_Test_Plan_2023.pdf', size: '1.1 MB', status: 'Indexed', date: 'Oct 12, 2025' },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Convert to Array for processing
    const fileArray = Array.from(files);

    const newDocs = fileArray.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      status: 'Processing',
      date: 'Just now'
    }));

    setDocs(current => [...newDocs, ...current]);
    setUploadStatus(`Indexing started for ${files.length} document(s)...`);

    for (const f of fileArray) {
        try {
            // Read file content using the FileReader API (works for dropped files in web/webview)
            // Note: For large files in Tauri, pure fs plugin might be better if we had the path.
            // But dropped files in WebView give us a File object which we can read directly.
            const textContent = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsText(f);
            });
            
            await indexDocument(f.name, textContent);
        } catch (e) {
            console.error('Failed to index:', e);
            setUploadStatus(`Error indexing ${f.name}`);
        }
    }

    setUploadStatus(`Successfully indexed ${files.length} document(s).`);
    
    // update status
    setDocs(current => current.map(d => newDocs.find(nd => nd.id === d.id) ? { ...d, status: 'Indexed' } : d));
  };

  return (
    <div className="container max-w-4xl">
      <header className="mb-8">
        <h1 className="header-title">Knowledge Base</h1>
        <p className="text-muted">Manage the documents your AI Co-Instructor uses for context.</p>
      </header>

      {uploadStatus && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-500" />
            {uploadStatus}
          </div>
          <button onClick={() => setUploadStatus(null)} className="text-xs font-bold hover:underline">Dismiss</button>
        </div>
      )}

      <label 
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors mb-8 cursor-pointer flex flex-col items-center gap-2 ${
          isDragging ? 'border-[#0f4c75] bg-blue-50' : 'border-gray-300 hover:border-[#0f4c75]'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
           e.preventDefault(); 
           setIsDragging(false);
           handleUpload(e.dataTransfer.files);
        }}
      >
        <input 
          type="file" 
          multiple 
          className="hidden" 
          onChange={(e) => handleUpload(e.target.files)} 
        />
        <div className="w-16 h-16 bg-blue-100 text-[#0f4c75] rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-700">Upload Course Documents</h3>
        <p className="text-gray-500 mt-2">Drag and drop syllabus, textbooks, or regulations here.</p>
        <p className="text-sm text-gray-400 mt-1">Supports PDF, DOCX, TXT</p>
      </label>

      <div className="card">
        <h2 className="text-lg font-bold text-[#0f4c75] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Indexed Documents
        </h2>
        
        <div className="divide-y divide-gray-100">
          {docs.map((doc) => (
            <div key={doc.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded text-gray-500">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium text-gray-800">{doc.name}</div>
                  <div className="text-xs text-gray-500">{doc.size} • {doc.date}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {doc.status === 'Indexed' ? (
                   <span className="badge badge-success flex items-center gap-1">
                     <CheckCircle className="w-3 h-3" /> Indexed
                   </span>
                ) : (
                   <span className="badge badge-warning flex items-center gap-1">
                     <Clock className="w-3 h-3" /> Processing
                   </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
