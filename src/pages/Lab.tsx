

import { useState } from 'react';
import Editor from '@/components/Editor';
import { generateText, generateImage } from '@/lib/ai';
import { useToast } from '@/components/Toast';
import {
  HelpCircle,
  BookOpen,
  MessageSquare,
  Sparkles,
  RefreshCcw,
  Book,
  FileText,
  BrainCircuit,
  ClipboardCheck
} from 'lucide-react';

export default function StudioPage() {
  const [content, setContent] = useState('<h2>Course Material Outline</h2><p>Select a goal from the sidebar to begin generating materials with AI.</p>');
  const [isGenerating, setIsGenerating] = useState(false);
  const [annotations, setAnnotations] = useState<{ id: number; text: string; comment: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const toast = useToast();

  
  const generateMaterial = async (type: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setContent('');

    try {
      let accumulatedText = '';

      await generateText({
        prompt: `Generate a ${type} for nursing students.`,
        type,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          setContent(accumulatedText);
        }
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate content';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditorAction = (action: string, selectedText: string) => {
    if (!selectedText) {
      setErrorMessage("Please select some text first!");
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    
    if (action === 'cite') {
      const id = Date.now();
      setAnnotations([...annotations, { 
        id, 
        text: selectedText, 
        comment: "Suggesting citation: Page 42, Med-Surg Clinical Guide." 
      }]);
    } else {
      // Simulate action feedback without blocking alert
      setIsGenerating(true);
      setTimeout(() => setIsGenerating(false), 1000);
    }
  };

  const submitReview = () => {
    setIsGenerating(true);
    setTimeout(() => {
      // Simulate "selective correction"
      setContent(prev => prev + `<p className="bg-blue-50 p-2 rounded"><em>AI Correction based on your feedback:</em> The section on JVD has been clarified to specify positioning at 45 degrees.</p>`);
      setAnnotations([]);
      setIsGenerating(false);
    }, 2000);
  };

  const generateVisual = async (prompt: string) => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      // Check if context option is selected
      const includeContext = (document.getElementById('include-context') as HTMLInputElement)?.checked;
      const style = (document.getElementById('visual-style') as HTMLSelectElement)?.value || 'medical-illustration';
      let cleanContext = '';

      if (includeContext) {
        // Strip HTML tags to get raw text context
        cleanContext = content.replace(/<[^>]*>?/gm, '');
      }

      const result = await generateImage({
        prompt,
        context: cleanContext,
        style,
      });

      if (result && result.url) {
        // Append image to content
        setContent(prev => prev + `<br /><img src="${result.url}" alt="${prompt}" class="rounded-xl shadow-lg my-4 max-w-md mx-auto" /><br /><p class="text-center text-sm text-gray-500 italic">Figure 1: AI Generated Visual for "${prompt}"</p>`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate visual';
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
      // Clear input
      const input = document.getElementById('visual-prompt') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      {/* Sidebar Controls */}
      <aside className="w-80 border-r bg-white p-6 overflow-y-auto space-y-8 shadow-sm z-10">
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">NGN & Clinical Tools</h2>
          <div className="grid gap-3">
            <button 
              onClick={() => generateMaterial('ngn-case')}
              className="flex items-center gap-3 w-full p-4 rounded-xl border border-gray-100 hover:border-[#0f4c75] hover:bg-blue-50 transition-all group text-left shadow-sm"
            >
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg group-hover:bg-[#0f4c75] group-hover:text-white transition-colors">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-800">NGN Case Study</div>
                <div className="text-xs text-gray-400">6-Step Clinical Judgment</div>
              </div>
            </button>
            
            <button 
              onClick={() => generateMaterial('preceptor-eval')}
              className="flex items-center gap-3 w-full p-4 rounded-xl border border-gray-100 hover:border-[#0f4c75] hover:bg-blue-50 transition-all group text-left shadow-sm"
            >
              <div className="p-2 bg-teal-100 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-gray-800">Preceptor Tool</div>
                <div className="text-xs text-gray-400">Clinical Eval Checklist</div>
              </div>
            </button>

              <button 
                onClick={() => generateMaterial('lesson')}
                className="flex items-center gap-3 w-full p-4 rounded-xl border border-gray-100 hover:border-[#0f4c75] hover:bg-blue-50 transition-all group text-left"
              >
               <div className="p-2 bg-purple-100 text-purple-700 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                 <BookOpen className="w-5 h-5" />
               </div>
               <div>
                 <div className="font-bold text-gray-800">Review Guide</div>
                 <div className="text-xs text-gray-400">Topic Summary</div>
               </div>
              </button>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Visuals Engine</h3>
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      id="visual-prompt"
                      placeholder="e.g. 'Leg ulcer', 'chest x-ray'"
                      className="flex-1 text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
                   <button 
                      onClick={() => {
                        const prompt = (document.getElementById('visual-prompt') as HTMLInputElement).value;
                        if(prompt) generateVisual(prompt);
                      }}
                      className="p-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-600 hover:text-white transition-colors"
                      title="Generate Image"
                   >
                     <p className="sr-only">Generate</p>
                     <Sparkles className="w-5 h-5" />
                   </button>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="include-context" 
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="include-context" className="text-xs text-gray-500 select-none cursor-pointer">
                      include context
                    </label>
                   </div>
                   
                   <select 
                      id="visual-style" 
                      className="text-xs p-1 border border-gray-200 rounded text-gray-600 bg-white focus:outline-none focus:border-indigo-400"
                      defaultValue="medical-illustration"
                   >
                      <option value="photographic">Photographic (X-Rays, Wounds)</option>
                      <option value="medical-illustration">Medical Illustration (Anatomy)</option>
                      <option value="diagram">Diagram/Chart (Infographic)</option>
                   </select>
                </div>
              </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Compliance Review</h2>
          <div className="space-y-4">
             {annotations.length > 0 ? (
               <div className="space-y-3">
                 {annotations.map(ann => (
                   <div key={ann.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm">
                     <div className="font-bold text-yellow-800 mb-1 flex items-center gap-2">
                       <MessageSquare className="w-4 h-4" /> Focus: &quot;{ann.text.substring(0, 20)}...&quot;
                     </div>
                     <div className="text-yellow-700">{ann.comment}</div>
                   </div>
                 ))}
                 <button 
                  onClick={submitReview}
                  className="w-full btn btn-primary py-3 rounded-xl shadow-md"
                 >
                   <RefreshCcw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                   Apply Corrections
                 </button>
               </div>
             ) : (
               <div className="text-center p-6 border-2 border-dashed border-gray-100 rounded-xl">
                 <HelpCircle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                 <p className="text-xs text-gray-400 italic">Select text in the editor to annotate or ask AI to revise.</p>
               </div>
             )}
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 bg-gray-50 relative p-8 h-full flex flex-col min-w-0">
        <header className="flex justify-between items-center mb-6">
           <div>
              <h1 className="header-title flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
                Curriculum Lab
              </h1>
              <p className="text-muted italic">Advanced Lab for LPN Curriculum & NCLEX Generation</p>
           </div>
           <div className="flex gap-2">
              <button className="btn btn-outline flex items-center gap-2 bg-white">
                <Book className="w-4 h-4 text-gray-400" />
                Audit Sources
              </button>
              <button
                onClick={async () => {
                  if (!content || content.trim() === '') {
                    toast.error('No Content', 'Please generate or add content before exporting');
                    return;
                  }
                  try {
                    const { exportLabContentToPDF } = await import('@/lib/lab-export');
                    await exportLabContentToPDF(content, 'Lab Content');
                    toast.success('Export Complete', 'Lab content exported successfully');
                  } catch (error) {
                    console.error('Export failed:', error);
                    toast.error('Export Failed', 'Failed to export PDF. Please try again.');
                  }
                }}
                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
           </div>
        </header>

        {errorMessage && (
           <div className="mb-4 mx-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
             <div className="w-2 h-2 rounded-full bg-red-500"></div>
             {errorMessage}
             <button onClick={() => setErrorMessage(null)} className="ml-auto px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 rounded-lg transition-all">Dismiss</button>
           </div>
        )}

        <div className="flex-1 relative">
           {isGenerating && (
             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center rounded-xl">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
                   <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="font-bold text-gray-800 italic animate-pulse">Agent is generating audit-ready material...</p>
                </div>
             </div>
           )}
           <Editor 
            content={content} 
            onChange={setContent} 
            onAction={handleEditorAction}
           />
        </div>
      </main>
    </div>
  );
}
