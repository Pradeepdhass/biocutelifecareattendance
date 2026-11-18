import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { validateEmail, validatePassword } from '../utils/validation';

const STORAGE_KEYS = {
  REMEMBERED_EMAIL: 'bclc_remembered_email',
  REMEMBERED_ROLE: 'bclc_remembered_role',
  CACHED_PROFILE: 'bclc_cached_user_profile',
};

const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

/**
 * Detects whether the app is running inside the native Capacitor mobile app,
 * an installed PWA, or a mobile browser so sessions ALWAYS persist until manual logout.
 */
export function isMobilePersistentEnvironment() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.Capacitor?.isNativePlatform?.()) return true;
    if (window.matchMedia?.('(display-mode: standalone)')?.matches) return true;
    if (window.navigator?.standalone === true) return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '');
  } catch {
    return false;
  }
}

export function getCachedUserProfile(expectedUid) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CACHED_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    if (expectedUid && parsed.id !== expectedUid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedUserProfile(profile) {
  try {
    if (!profile?.id) return;
    window.localStorage.setItem(STORAGE_KEYS.CACHED_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearCachedUserProfile() {
  try {
    window.localStorage.removeItem(STORAGE_KEYS.CACHED_PROFILE);
  } catch {
    // Ignore restricted storage
  }
}

export function getRememberedEmail() {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL) || '';
  } catch {
    return '';
  }
}

export function getRememberedRole() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEYS.REMEMBERED_ROLE);
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(saved) ? saved : 'ADMIN';
  } catch {
    return 'ADMIN';
  }
}

function setRememberedPreferences(email, role, rememberMe) {
  try {
    if (role) {
      window.localStorage.setItem(STORAGE_KEYS.REMEMBERED_ROLE, role);
    }
    if (rememberMe && email) {
      window.localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, email.trim());
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.REMEMBERED_EMAIL);
    }
  } catch {
    // Ignore restricted storage
  }
}

export function normalizeFirebaseError(error, fallback = 'Request failed. Please try again.') {
  if (error?.isCustomAuthError) return error;

  const code = error?.code || '';
  const map = {
    'auth/invalid-credential': 'Invalid email address or password.',
    'auth/wrong-password': 'Invalid email address or password.',
    'auth/user-not-found': 'No account found for this email address.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/email-already-in-use': 'An account with this email address already exists.',
    'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/operation-not-allowed':
      'Email/Password sign-in is not enabled yet. Enable it in Firebase Console → Authentication → Sign-in method.',
    'permission-denied':
      'Firestore permission denied. Publish the latest firestore.rules in Firebase Console → Firestore Database → Rules.',
  };

  const message = map[code] || error?.message || fallback;
  const err = new Error(message);
  err.code = code || 'FIREBASE_ERROR';
  err.isCustomAuthError = true;
  return err;
}

function createAuthError(message, code = 'AUTH_ERROR') {
  const err = new Error(message);
  err.code = code;
  err.isCustomAuthError = true;
  return err;
}

/**
 * Loads the authenticated user's role (ADMIN, MANAGER, EMPLOYEE) and profile from Firestore.
 * Seamlessly upgrades an existing legacy central Manager setup account to ADMIN.
 */
export async function loadUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const [userSnap, configSnap] = await Promise.all([
    getDoc(doc(db, 'users', firebaseUser.uid)),
    getDoc(doc(db, 'system', 'config')).catch(() => null),
  ]);

  if (!userSnap.exists()) {
    throw createAuthError(
      'User role record not found in Firestore. Please complete initial setup or contact the Admin.',
      'PROFILE_MISSING'
    );
  }

  const userData = userSnap.data();
  if (userData.is_active === false) {
    await signOut(auth).catch(() => {});
    throw createAuthError(
      'Your account is deactivated. Please contact the Admin.',
      'ACCOUNT_INACTIVE'
    );
  }

  let effectiveRole = userData.role;

  // Seamless one-time upgrade for legacy central setup account -> ADMIN
  if (configSnap?.exists()) {
    const cfg = configSnap.data();
    if (
      effectiveRole === 'MANAGER' &&
      !cfg.adminUid &&
      cfg.managerUid === firebaseUser.uid
    ) {
      effectiveRole = 'ADMIN';
      await Promise.allSettled([
        updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'ADMIN' }),
        updateDoc(doc(db, 'system', 'config'), {
          adminUid: firebaseUser.uid,
          adminEmail: userData.email || firebaseUser.email,
        }),
      ]);
    }
  }

  let manager = null;
  let employee = null;

  if (effectiveRole === 'MANAGER') {
    const mgrSnap = await getDoc(doc(db, 'managers', firebaseUser.uid)).catch(() => null);
    if (mgrSnap?.exists()) {
      const mgrData = mgrSnap.data();
      manager = {
        id: mgrData.id || firebaseUser.uid,
        managerCode: mgrData.manager_code || `MGR-${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
        managerName: mgrData.manager_name,
        email: mgrData.email,
        branch: mgrData.branch || 'All Branches',
      };
    } else {
      manager = {
        id: firebaseUser.uid,
        managerCode: `MGR-${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
        managerName: 'Branch Manager',
        email: userData.email || firebaseUser.email,
        branch: 'All Branches',
      };
    }
  } else if (effectiveRole === 'EMPLOYEE') {
    const empSnap = await getDoc(doc(db, 'employees', firebaseUser.uid));
    if (!empSnap.exists()) {
      await signOut(auth).catch(() => {});
      throw createAuthError(
        'Employee profile not found for this account.',
        'EMPLOYEE_PROFILE_MISSING'
      );
    }
    const empData = empSnap.data();
    employee = {
      id: empData.id || firebaseUser.uid,
      employeeCode: empData.employee_code || `EMP-${firebaseUser.uid.slice(0, 6).toUpperCase()}`,
      employeeName: empData.employee_name,
      email: empData.email,
      branch: empData.branch,
    };
  }

  const displayName =
    effectiveRole === 'ADMIN'
      ? 'Central Admin'
      : effectiveRole === 'MANAGER'
      ? manager?.managerName || 'Manager'
      : employee?.employeeName || 'Employee';

  return {
    id: firebaseUser.uid,
    email: userData.email || firebaseUser.email,
    role: effectiveRole,
    isActive: Boolean(userData.is_active),
    name: displayName,
    manager,
    employee,
  };
}

/**
 * Checks Firestore system/config to determine whether the central ADMIN exists.
 */
export async function getSetupStatus() {
  try {
    const configSnap = await getDoc(doc(db, 'system', 'config'));
    return {
      adminExists: configSnap.exists(),
      managerExists: configSnap.exists(),
      branches: ['Coimbatore', 'Chennai'],
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to check Firebase setup status.');
  }
}

/**
 * One-time secure creation of the central ADMIN account in Firebase Auth + Firestore.
 */
export async function setupAdmin({ email, password }) {
  const emailError = validateEmail(email);
  if (emailError) throw createAuthError(emailError, 'VALIDATION_ERROR');
  if (!password || password.length < 8) {
    throw createAuthError('Admin password must be at least 8 characters.', 'VALIDATION_ERROR');
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingConfig = await getDoc(doc(db, 'system', 'config'));
    if (existingConfig.exists()) {
      throw createAuthError(
        'Central Admin account is already configured. Only one Admin account is permitted.',
        'ADMIN_ALREADY_EXISTS'
      );
    }

    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const uid = credential.user.uid;

    await setDoc(doc(db, 'users', uid), {
      id: uid,
      email: normalizedEmail,
      role: 'ADMIN',
      is_active: true,
    });

    await setDoc(doc(db, 'system', 'config'), {
      adminUid: uid,
      adminEmail: normalizedEmail,
      branches: ['Coimbatore', 'Chennai'],
      initializedAt: serverTimestamp(),
    });

    setRememberedPreferences(normalizedEmail, 'ADMIN', true);
    const profile = await loadUserProfile(credential.user);
    setCachedUserProfile(profile);
    return { user: profile };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to create central Admin account.');
  }
}

// Alias for compatibility
export const setupManager = setupAdmin;

/**
 * Signs in an Admin, Manager, or active Employee via Firebase Authentication
 * and verifies that the account matches the selected login role tab.
 */
export async function login({ email, password, rememberMe = true, role = '' }) {
  const emailError = validateEmail(email);
  if (emailError) throw createAuthError(emailError, 'VALIDATION_ERROR');

  const passwordError = validatePassword(password);
  if (passwordError) throw createAuthError(passwordError, 'VALIDATION_ERROR');

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // On mobile / Capacitor / PWA, ALWAYS persist auth locally so users stay signed in
    // across app restarts & phone reboots until they explicitly tap Logout.
    const shouldPersistLocally = rememberMe || isMobilePersistentEnvironment();
    await setPersistence(
      auth,
      shouldPersistLocally ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const profile = await loadUserProfile(credential.user);

    if (role && profile.role !== role) {
      await signOut(auth).catch(() => {});
      clearCachedUserProfile();
      const actualLabel = ROLE_LABELS[profile.role] || profile.role;
      throw createAuthError(
        `This account is registered as ${actualLabel}. Please select the ${actualLabel} login tab.`,
        'ROLE_MISMATCH'
      );
    }

    setRememberedPreferences(normalizedEmail, profile.role, shouldPersistLocally);
    setCachedUserProfile(profile);
    return { user: profile };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Invalid email address or password.');
  }
}

export async function requestPasswordReset(email) {
  const emailError = validateEmail(email);
  if (emailError) throw createAuthError(emailError, 'VALIDATION_ERROR');

  try {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
    return {
      success: true,
      message:
        'Password recovery instructions have been sent to your email address via Firebase Authentication.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to send password reset email.');
  }
}

export async function resetPassword({ token, password }) {
  const passwordError = validatePassword(password);
  if (passwordError) throw createAuthError(passwordError, 'VALIDATION_ERROR');
  if (!token) throw createAuthError('Action code is required.', 'VALIDATION_ERROR');

  try {
    await confirmPasswordReset(auth, token, password);
    return {
      success: true,
      message: 'Your password has been set successfully. You can now sign in.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to update password. The link may have expired.');
  }
}

export async function activateAccount({ token, password }) {
  return resetPassword({ token, password });
}

export async function logout() {
  clearCachedUserProfile();
  await signOut(auth);
}

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
