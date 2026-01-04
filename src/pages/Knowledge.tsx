
import { useState } from 'react';
import { FileText, CheckCircle, Clock, BookOpen, Trash2 } from 'lucide-react';
import { indexDocument } from '@/lib/db';
import { FileUpload } from '@/components/FileUpload';
import { useToast } from '@/components/Toast';

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState([
    { id: 1, name: 'VBON_Regs_18VAC90-27.pdf', size: '2.4 MB', status: 'Indexed', date: 'Oct 12, 2025' },
    { id: 2, name: 'NCLEX-PN_Test_Plan_2023.pdf', size: '1.1 MB', status: 'Indexed', date: 'Oct 12, 2025' },
  ]);

  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const toast = useToast();

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const newDocs = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      status: 'Processing',
      date: 'Just now'
    }));

    setDocs(current => [...newDocs, ...current]);
    setUploadStatus(`Indexing started for ${files.length} document(s)...`);
    toast.info('Upload started', `Processing ${files.length} file(s)`);

    for (const f of files) {
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
    <div className="min-h-screen max-w-4xl">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-linear-to-br from-cyan-600 to-blue-600 rounded-2xl shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-cyan-900 to-blue-900 bg-clip-text text-transparent mb-1">
              Knowledge Base
            </h1>
            <p className="text-gray-600 text-lg font-medium">Manage the documents your AI Co-Instructor uses for context</p>
          </div>
        </div>
      </header>

      {uploadStatus && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm flex justify-between items-center animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-500" />
            {uploadStatus}
          </div>
          <button onClick={() => setUploadStatus(null)} className="px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 rounded-lg transition-all">Dismiss</button>
        </div>
      )}

      <FileUpload
        accept=".pdf,.docx,.txt"
        multiple={true}
        maxSize={50}
        onUpload={handleUpload}
        value={uploadedFiles}
        onRemove={(file) => {
          setUploadedFiles(prev => prev.filter(f => f !== file));
        }}
        className="mb-8"
      />

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
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${doc.name}"? This will remove it from the knowledge base.`)) {
                      setDocs(prev => prev.filter(d => d.id !== doc.id));
                      toast.success('Document Deleted', `${doc.name} has been removed from the knowledge base`);
                    }
                  }}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
