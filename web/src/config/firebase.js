import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    `https://${import.meta.env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Primary Firebase app instance (guarded so the Login UI still renders if env vars aren't injected yet)
export const app = isFirebaseConfigured
  ? getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

// Firebase Authentication with durable local persistence (IndexedDB + localStorage fallback)
// so mobile / Capacitor / PWA sessions remain signed in across app restarts until manual logout.
let authInstance = null;
if (app) {
  try {
    authInstance = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    // Already initialized (e.g., Vite HMR)
    authInstance = getAuth(app);
  }
}
export const auth = authInstance;

// Cloud Firestore Database
export const db = app ? getFirestore(app) : null;

// Firebase Realtime Database (used for live branch check-in presence sync)
export const rtdb = app ? getDatabase(app) : null;

// Firebase Analytics (browser-guarded)
export let analytics = null;
if (app && typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported) => {
      if (supported && firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics optional in restricted environments
    });
}

/**
 * Secondary Firebase Auth instance used ONLY when the central Manager creates
 * a new Employee Auth account, preventing the Manager's active session from signing out.
 */
export function getSecondaryAuth() {
  if (!isFirebaseConfigured) return null;
  const existing = getApps().find((a) => a.name === 'EmployeeProvisioningApp');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'EmployeeProvisioningApp');
  return getAuth(secondaryApp);
}
