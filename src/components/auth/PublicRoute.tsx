import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        {/* Placeholder for future LoadingSpinner component */}
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Prevent authenticated users from viewing login/register screens
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  // Render child routes (like Login/Register) if unauthenticated
  return <Outlet />;
};
