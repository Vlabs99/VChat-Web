import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../types/auth';

export const setupAuthListener = (): (() => void) => {
  const { setUser, clearUser, setError } = useAuthStore.getState();

  // Attach Firebase observer for authentication state changes
  const unsubscribe = onAuthStateChanged(
    auth,
    (firebaseUser) => {
      if (firebaseUser) {
        // Map standard Firebase user properties to our internal User type
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        setUser(user); // Also sets isLoading to false inside the store
      } else {
        clearUser(); // Also sets isLoading to false inside the store
      }
    },
    (error) => {
      console.error('Firebase Auth Listener Error:', error);
      setError(error.message);
      clearUser();
    }
  );

  // Return the unsubscribe function for cleanup
  return unsubscribe;
};
