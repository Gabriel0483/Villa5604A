
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig, isFirebaseConfigValid } from './config';

export function initializeFirebase() {
  if (!isFirebaseConfigValid) {
    throw new Error('Firebase configuration is missing or invalid. Please ensure your environment variables are set or link your project in the Firebase console.');
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Use initializeFirestore to configure experimental settings for connectivity.
  // experimentalForceLongPolling is often required in proxied/containerized environments.
  const firestore = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });
  
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-memo-firebase';
export * from './auth/use-user';
