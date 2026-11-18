import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';
import { firebaseSecureStorageAdapter } from '../services/secureStorage';

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL:
    process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ||
    `https://${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Persistent Firebase Auth across app restarts & phone reboots until manual logout.
// Uses hardware-backed iOS Keychain / Android Keystore on native, and localStorage on web.
let authInstance;
try {
  if (
    Platform.OS !== 'web' &&
    typeof FirebaseAuth.getReactNativePersistence === 'function'
  ) {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: FirebaseAuth.getReactNativePersistence(firebaseSecureStorageAdapter),
    });
  } else if (FirebaseAuth.browserLocalPersistence) {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: [
        FirebaseAuth.indexedDBLocalPersistence,
        FirebaseAuth.browserLocalPersistence,
      ].filter(Boolean),
    });
  } else {
    authInstance = FirebaseAuth.getAuth(app);
  }
} catch {
  // Already initialized (e.g., Fast Refresh)
  authInstance = FirebaseAuth.getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === 'EmployeeProvisioningApp');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'EmployeeProvisioningApp');
  return FirebaseAuth.getAuth(secondaryApp);
}
