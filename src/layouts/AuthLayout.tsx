import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-[100dvh] w-full bg-[#121212] text-slate-200 font-sans">
      <Outlet />
    </div>
  );
};
