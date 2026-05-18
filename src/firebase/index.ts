import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';

export function initializeFirebase() {
  if (!isFirebaseConfigValid) {
    throw new Error('Firebase configuration is missing or invalid. Please ensure your environment variables are set or link your project in the Firebase console.');
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Use initializeFirestore with singleton-safe pattern.
  // experimentalForceLongPolling and experimentalAutoDetectLongPolling are required 
  // in proxied/containerized environments to prevent connection timeouts.
  let firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
    });
  } catch (err) {
    // If Firestore was already initialized (e.g. during HMR), use the existing instance
    firestore = getFirestore(firebaseApp);
  }
  
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-memo-firebase';
export * from './auth/use-user';
