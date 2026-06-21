import React, { useState } from 'react';
import { X, BarChart2 } from 'lucide-react';

interface CreatePollDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (question: string, o1: string, o2: string, o3: string, o4: string) => void;
}

export const CreatePollDialog: React.FC<CreatePollDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [o1, setO1] = useState('');
  const [o2, setO2] = useState('');
  const [o3, setO3] = useState('');
  const [o4, setO4] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !o1.trim() || !o2.trim()) return;
    
    onSubmit(question.trim(), o1.trim(), o2.trim(), o3.trim(), o4.trim());
    
    // Reset fields
    setQuestion('');
    setO1('');
    setO2('');
    setO3('');
    setO4('');
  };

  const handleClose = () => {
    setQuestion('');
    setO1('');
    setO2('');
    setO3('');
    setO4('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111b21] w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-[#00a884]" />
            <h2 className="text-[#e9edef] text-lg font-medium">Create Poll</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-[#aebac1] hover:text-[#e9edef] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-5 flex flex-col gap-4">
            <div>
              <input
                type="text"
                placeholder="Poll question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
                autoFocus
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Option 1"
                value={o1}
                onChange={(e) => setO1(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Option 2"
                value={o2}
                onChange={(e) => setO2(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Option 3 (optional)"
                value={o3}
                onChange={(e) => setO3(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Option 4 (optional)"
                value={o4}
                onChange={(e) => setO4(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800/50 flex justify-end gap-3 bg-[#202c33]/30">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-full text-[#00a884] font-medium hover:bg-[#202c33] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!question.trim() || !o1.trim() || !o2.trim()}
              className="px-5 py-2 rounded-full bg-[#00a884] text-[#111b21] font-medium hover:bg-[#00c29a] transition-colors disabled:opacity-50 disabled:hover:bg-[#00a884] flex items-center justify-center min-w-[80px]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
