import React, { useEffect, type ReactNode } from 'react';
import { setupAuthListener } from '../../services/authListener';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  useEffect(() => {
    // Register the Firebase auth listener when the provider mounts
    const unsubscribe = setupAuthListener();

    // Cleanup the listener when the provider unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
};
