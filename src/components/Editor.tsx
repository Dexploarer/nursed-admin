

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import BubbleMenuExtension from '@tiptap/extension-bubble-menu';
import { Scissors, Quote, CheckCircle } from 'lucide-react';

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  onAction: (action: string, selectedText: string) => void;
}

const Editor = ({ content, onChange, onAction }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Placeholder.configure({
        placeholder: 'Generation will appear here...',
      }),
      BubbleMenuExtension,
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const handleAction = (action: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    onAction(action, selectedText);
  };

  return (
    <div className="relative border border-gray-200 rounded-xl bg-white shadow-sm h-full flex flex-col overflow-hidden">
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="flex bg-[#0f4c75] text-white rounded-lg shadow-lg overflow-hidden border border-white/10">
            <button 
              onClick={() => handleAction('proofread')}
              className="p-2 hover:bg-[#0a3d61] transition-colors border-r border-white/10 flex items-center gap-1 text-xs px-3"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Proof
            </button>
            <button 
              onClick={() => handleAction('shorten')}
              className="p-2 hover:bg-[#0a3d61] transition-colors border-r border-white/10 flex items-center gap-1 text-xs px-3"
            >
              <Scissors className="w-3.5 h-3.5" /> Shorten
            </button>
            <button 
              onClick={() => handleAction('enhance')}
              className="p-2 hover:bg-[#0a3d61] transition-colors border-r border-white/10 flex items-center gap-1 text-xs px-3"
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Enhance
            </button>
            <button 
              onClick={() => handleAction('cite')}
              className="p-2 hover:bg-[#0a3d61] transition-colors flex items-center gap-1 text-xs px-3"
            >
              <Quote className="w-3.5 h-3.5" /> Cite
            </button>
          </div>
        </BubbleMenu>
      )}

      <div className="flex-1 p-6 overflow-y-auto prose max-w-none">
        <EditorContent editor={editor} className="h-full focus:outline-none" />
      </div>
    </div>
  );
};

// Help icons
const Sparkles = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);

export default Editor;
