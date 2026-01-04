

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Paperclip, X, FileText, BookOpen } from 'lucide-react';
import { searchDocuments } from '@/lib/db';
import { generateText } from '@/lib/ai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  attachment?: {
    name: string;
    type: string;
  };
}

export default function AssistantPage() {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; type: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([
     {
       id: 'welcome',
       role: 'assistant',
       content: "Hello! I'm your NursEd Co-Instructor. I can help you with nursing education questions, find information in your Knowledge Base, and provide guidance on VBON regulations or NCLEX standards. How can I assist you today?"
     }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;

    const userMessage = input.trim();
    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: userMessage,
        attachment: attachment || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);
    setStreamingContent('');

    try {
        // Step 1: Perform RAG search for relevant context
        let contextSources: string[] = [];
        let context = '';

        try {
            const results = await searchDocuments(userMessage);
            if (results && results.length > 0) {
                contextSources = results.slice(0, 5); // Top 5 results
                context = contextSources.join('\n\n---\n\n');
            }
        } catch (searchError) {
            console.warn('Knowledge base search failed, proceeding without context:', searchError);
        }

        // Step 2: Build prompt with context (if available)
        const systemContext = context
            ? `You have access to the following information from the NursEd Knowledge Base:\n\n${context}\n\n---\n\nUse this information to answer the question if relevant. If the knowledge base content doesn't contain the answer, use your nursing education expertise to provide a helpful response. Always prioritize accuracy and cite VBON regulations or NCLEX standards when applicable.`
            : `You are a nursing education assistant. Answer questions about nursing education, VBON regulations, NCLEX preparation, clinical skills, and curriculum planning. Be accurate, helpful, and cite standards when applicable.`;

        const fullPrompt = `${systemContext}\n\nInstructor Question: ${userMessage}\n\nProvide a clear, professional response:`;

        // Step 3: Generate response with streaming
        const response = await generateText({
            prompt: fullPrompt,
            onChunk: (chunk) => {
                setStreamingContent(prev => prev + chunk);
            }
        });

        // Step 4: Add final message with sources
        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            sources: contextSources.length > 0 ? contextSources : undefined
        };

        setStreamingContent('');
        setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
        console.error("AI generation failed:", error);
        setStreamingContent('');

        // Provide helpful error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let userFriendlyMessage = "I encountered an error generating a response.";

        if (errorMessage.includes('API key')) {
            userFriendlyMessage = "Please configure your AI API key in Settings to enable AI-powered responses.";
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userFriendlyMessage = "Unable to reach the AI service. Please check your internet connection.";
        }

        setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: userFriendlyMessage
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment({ name: file.name, type: file.type });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="p-3 bg-linear-to-br from-violet-600 to-purple-600 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black bg-linear-to-r from-gray-900 via-violet-900 to-purple-900 bg-clip-text text-transparent mb-1">
              AI Co-Instructor
            </h1>
            <p className="text-gray-600 text-lg font-medium">Multi-modal upload & regulatory-aligned evaluations</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${
               m.role === 'user' ? 'bg-[#0f4c75] text-white' : 'bg-indigo-50 text-indigo-600'
             }`}>
               {m.role === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
             </div>
             <div className={`max-w-[80%] rounded-2xl p-4 ${
               m.role === 'user'
                 ? 'bg-[#0f4c75] text-white rounded-tr-none'
                 : 'bg-indigo-50/30 text-gray-800 rounded-tl-none border border-indigo-100'
             }`}>
               <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>

               {/* Show sources for AI messages */}
               {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                 <div className="mt-4 pt-3 border-t border-indigo-200/50">
                   <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-2">
                     <BookOpen className="w-3.5 h-3.5" />
                     Sources from Knowledge Base
                   </div>
                   <div className="space-y-1.5">
                     {m.sources.slice(0, 3).map((source, idx) => (
                       <div
                         key={idx}
                         className="text-xs text-gray-600 bg-white/60 rounded-lg p-2 border border-indigo-100/50 line-clamp-2"
                       >
                         {source.substring(0, 150)}{source.length > 150 ? '...' : ''}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
          </div>
        ))}

        {/* Streaming message */}
        {isLoading && streamingContent && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
               <Bot className="w-6 h-6" />
             </div>
             <div className="max-w-[80%] bg-indigo-50/30 text-gray-800 rounded-2xl rounded-tl-none border border-indigo-100 p-4">
               <div className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</div>
               <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5" />
             </div>
          </div>
        )}

        {/* Loading indicator (before streaming starts) */}
        {isLoading && !streamingContent && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
               <Bot className="w-6 h-6" />
             </div>
             <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 rounded-tl-none">
               <div className="flex items-center gap-2 text-gray-500 text-sm">
                 <div className="flex gap-1">
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                   <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                 </div>
                 Searching knowledge base & generating response...
               </div>
             </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-2">
        {attachment && (
          <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 p-2 rounded-lg w-fit animate-in slide-in-from-bottom-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-700">{attachment.name}</span>
            <button 
              onClick={() => setAttachment(null)}
              className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-indigo-600" />
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              className="w-full p-4 pl-12 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f4c75] shadow-sm"
              value={input}
              placeholder="Paste rubric or ask to grade the attached submission..."
              onChange={handleInputChange}
            />
            <label className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#0f4c75] cursor-pointer transition-colors">
              <Paperclip className="w-5 h-5" />
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleFileChange}
              />
            </label>
          </div>
          <button 
            type="submit" 
            disabled={isLoading || (!input.trim() && !attachment)}
            className="p-4 bg-[#0f4c75] text-white rounded-xl hover:bg-[#0a3d61] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center uppercase font-bold tracking-widest">Supports PDF, PNG, and JPEG uploads for AI Analysis</p>
      </div>
    </div>
  );
}
