import React, { useState } from 'react';
import { X, User } from 'lucide-react';

interface CreateContactDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, number: string) => void;
}

export const CreateContactDialog: React.FC<CreateContactDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;
    
    onSubmit(name.trim(), number.trim());
    
    // Reset fields
    setName('');
    setNumber('');
  };

  const handleClose = () => {
    setName('');
    setNumber('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111b21] w-full max-w-sm rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[#53bdeb]" />
            <h2 className="text-[#e9edef] text-lg font-medium">Send Contact</h2>
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
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#53bdeb] border border-transparent transition-all"
                autoFocus
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Phone Number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#53bdeb] border border-transparent transition-all"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800/50 flex justify-end gap-3 bg-[#202c33]/30">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 rounded-full text-[#53bdeb] font-medium hover:bg-[#202c33] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !number.trim()}
              className="px-5 py-2 rounded-full bg-[#53bdeb] text-[#111b21] font-medium hover:bg-[#47a1c8] transition-colors disabled:opacity-50 disabled:hover:bg-[#53bdeb] flex items-center justify-center min-w-[80px]"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
