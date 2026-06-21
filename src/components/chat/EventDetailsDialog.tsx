import React from 'react';
import { X, CalendarDays } from 'lucide-react';

interface EventDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fullText: string;
}

export const EventDetailsDialog: React.FC<EventDetailsDialogProps> = ({ isOpen, onClose, fullText }) => {
  if (!isOpen) return null;

  // Android parity: Android replaces "EVENT\n" or "📅 EVENT\n" with ""
  // It relies on the messageText already containing the 'Title: ', 'Date: ', etc. formatting
  const formattedText = fullText
    .replace("📅 EVENT\n", "")
    .replace("EVENT\n", "")
    .trim();

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-[#111b21] w-full max-w-sm rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-[#53bdeb]" />
            <h2 className="text-[#e9edef] text-lg font-medium">Event Details</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#aebac1] hover:text-[#e9edef] transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#e9edef] text-[15px] whitespace-pre-wrap leading-relaxed">
            {formattedText}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800/50 flex justify-end bg-[#202c33]/30">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#53bdeb] text-[#111b21] font-medium hover:bg-[#47a1c8] transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
