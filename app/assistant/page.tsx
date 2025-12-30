
'use client';

import { useState } from 'react';
import { Send, Bot, User, Sparkles, Paperclip, X, FileText } from 'lucide-react';
import { searchDocuments } from '@/lib/db';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
       content: "Hello! I'm your NursEd Co-Instructor. I can help you find information in your Knowledge Base. Ask me about VBON regulations or NCLEX standards." 
     }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    
    const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        attachment: attachment || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
        // Perform RAG search
        const results = await searchDocuments(input);
        
        let responseContent = '';
        if (results && results.length > 0) {
            responseContent = "Here is what I found in the Knowledge Base:\n\n" + results.map(r => `• ${r}`).join('\n\n');
        } else {
            responseContent = "I couldn't find any specific information in the Knowledge Base matching your query.";
        }

        const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: responseContent
        };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        console.error("Search failed", error);
        setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: "I encountered an error searching the database."
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
    <div className="container h-[calc(100vh-100px)] flex flex-col">
      <header className="mb-4 flex justify-between items-center text-indigo-700">
        <div>
           <h1 className="header-title flex items-center gap-2">
             <Sparkles className="w-6 h-6 text-indigo-600" />
             AI Grading Assistant
           </h1>
           <p className="text-muted">Multi-modal upload & regulatory-aligned evaluations.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto mb-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-6">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
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
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse">
               <Bot className="w-6 h-6" />
             </div>
             <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-4 rounded-tl-none text-gray-500 text-sm">
               Analyzing submission...
             </div>
          </div>
        )}
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
