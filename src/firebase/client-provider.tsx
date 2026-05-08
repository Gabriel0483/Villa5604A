
'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { initializeFirebase } from './index';
import { isFirebaseConfigValid } from './config';

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const firebaseData = useMemo(() => {
    try {
      if (!isFirebaseConfigValid) return null;
      return initializeFirebase();
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return null;
    }
  }, []);

  if (!firebaseData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Firebase Configuration Error</h1>
          <p className="text-muted-foreground">
            Your Firebase API key or Project ID is missing. Please ensure you have linked your project in the Firebase console or set the appropriate environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider 
      firebaseApp={firebaseData.firebaseApp} 
      firestore={firebaseData.firestore} 
      auth={firebaseData.auth}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
}
