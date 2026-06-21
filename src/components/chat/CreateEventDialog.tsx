import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, date: string, time: string, location: string, note: string) => void;
}

export const CreateEventDialog: React.FC<CreateEventDialogProps> = ({ isOpen, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim() || !time.trim()) return;
    
    onSubmit(title.trim(), date.trim(), time.trim(), location.trim(), note.trim());
    
    // Reset fields
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setNote('');
  };

  const handleClose = () => {
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setNote('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111b21] w-full max-w-md rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[#00a884]" />
            <h2 className="text-[#e9edef] text-lg font-medium">Create Event</h2>
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
                placeholder="Event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
                autoFocus
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Date (e.g. 15 May 2026)"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Time (e.g. 7:30 PM)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Location (optional)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
            </div>
            
            <div>
              <input
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
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
              disabled={!title.trim() || !date.trim() || !time.trim()}
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
