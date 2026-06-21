import React from 'react';
import { Loader2 } from 'lucide-react';

export const Splash: React.FC = () => {
  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-[#121212]">
      {/* Center Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <img 
          src="/Logo.png" 
          alt="VChat Logo" 
          className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-4"
        />
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-8 tracking-wide">
          VChat
        </h1>
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>

      {/* Bottom Footer */}
      <div className="pb-12 flex flex-col items-center justify-end">
        <span className="text-slate-400 text-sm mb-1">from</span>
        <span className="text-white text-lg font-medium tracking-wide">
          Vishvarajsinh
        </span>
      </div>
    </div>
  );
};
