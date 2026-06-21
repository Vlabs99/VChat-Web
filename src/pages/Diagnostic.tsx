import React, { useEffect, useState } from 'react';
import app, { auth, db, storage } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export const Diagnostic: React.FC = () => {
  const [status, setStatus] = useState({
    app: false,
    auth: false,
    db: false,
    storage: false,
  });
  
  const [dbTest, setDbTest] = useState<{ status: 'idle' | 'testing' | 'success' | 'error', message: string }>({
    status: 'idle',
    message: ''
  });

  useEffect(() => {
    setStatus({
      app: !!app,
      auth: !!auth,
      db: !!db,
      storage: !!storage,
    });

    const testFirestore = async () => {
      setDbTest({ status: 'testing', message: 'Testing Firestore connection...' });
      try {
        // Attempt a read on a dummy collection.
        // If security rules block it, it will fail with "Missing or insufficient permissions." (Which means it IS connected)
        // If missing env config, it will fail with API key error.
        await getDocs(collection(db, '_vchat_diagnostic_ping'));
        setDbTest({ status: 'success', message: 'Connected to Firestore. Read successful or returned empty.' });
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          setDbTest({ status: 'success', message: 'Connected to Firestore. Read blocked by security rules (Expected behavior).' });
        } else {
          setDbTest({ status: 'error', message: `Firestore Error: ${error.message || error.code}` });
        }
      }
    };

    if (db) {
      testFirestore();
    }
  }, []);

  return (
    <div className="p-8 text-white bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Firebase Diagnostic</h1>
      <div className="space-y-2 mb-6">
        <p>Firebase App Initialized: {status.app ? '✅ Yes' : '❌ No'}</p>
        <p>Auth Initialized: {status.auth ? '✅ Yes' : '❌ No'}</p>
        <p>Firestore Initialized: {status.db ? '✅ Yes' : '❌ No'}</p>
        <p>Storage Initialized: {status.storage ? '✅ Yes' : '❌ No'}</p>
      </div>

      <h2 className="text-xl font-semibold mb-2">Firestore Connectivity Test</h2>
      <div id="diagnostic-result" className={`p-4 rounded-md ${dbTest.status === 'error' ? 'bg-red-900/50' : dbTest.status === 'success' ? 'bg-green-900/50' : 'bg-slate-800'}`}>
        <p><strong>Status:</strong> <span id="status-text">{dbTest.status}</span></p>
        <p><strong>Message:</strong> <span id="message-text">{dbTest.message}</span></p>
      </div>
    </div>
  );
};
