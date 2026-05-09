
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * FirebaseErrorListener
 * 
 * This component listens for global Firestore permission errors.
 * The notification UI has been removed per user request, so this listener
 * now handles errors silently.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handlePermissionError = (error: any) => {
      // Permission errors are now handled silently without showing a toast notification.
      // This prevents intrusive UI overlays while allowing the error to be 
      // captured by standard error reporting if needed.
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.removeListener('permission-error', handlePermissionError);
    };
  }, []);

  return null;
}
