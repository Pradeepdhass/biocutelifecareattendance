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

// Primary Firebase app instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Authentication with durable local persistence (IndexedDB + localStorage fallback)
// so mobile / Capacitor / PWA sessions remain signed in across app restarts until manual logout.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  });
} catch {
  // Already initialized (e.g., Vite HMR)
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Cloud Firestore Database
export const db = getFirestore(app);

// Firebase Realtime Database (used for live branch check-in presence sync)
export const rtdb = getDatabase(app);

// Firebase Analytics (browser-guarded)
export let analytics = null;
if (typeof window !== 'undefined') {
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
  const existing = getApps().find((a) => a.name === 'EmployeeProvisioningApp');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'EmployeeProvisioningApp');
  return getAuth(secondaryApp);
}
