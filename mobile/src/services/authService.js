import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { validateEmail, validatePassword } from '../utils/validation';
import { setSecureItem, getSecureItem, deleteSecureItem } from './secureStorage';

const SECURE_KEYS = {
  REMEMBERED_EMAIL: 'bclc_remembered_email',
  REMEMBERED_ROLE: 'bclc_remembered_role',
  CACHED_PROFILE: 'bclc_cached_user_profile',
};

export async function getCachedUserProfile(expectedUid) {
  try {
    const raw = await getSecureItem(SECURE_KEYS.CACHED_PROFILE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id) return null;
    if (expectedUid && parsed.id !== expectedUid) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function setCachedUserProfile(profile) {
  try {
    if (!profile?.id) return;
    await setSecureItem(SECURE_KEYS.CACHED_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore storage errors
  }
}

export async function clearCachedUserProfile() {
  try {
    await deleteSecureItem(SECURE_KEYS.CACHED_PROFILE);
  } catch {
    // Ignore storage errors
  }
}

const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

export async function getRememberedEmail() {
  try {
    return (await getSecureItem(SECURE_KEYS.REMEMBERED_EMAIL)) || '';
  } catch {
    return '';
  }
}

export async function getRememberedRole() {
  try {
    const saved = await getSecureItem(SECURE_KEYS.REMEMBERED_ROLE);
    return ['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(saved) ? saved : 'ADMIN';
  } catch {
    return 'ADMIN';
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
    'auth/too-many-requests': 'Too many login attempts. Please try again shortly.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'permission-denied': 'Firestore permission denied. Check Firestore security rules.',
  };

  const err = new Error(map[code] || error?.message || fallback);
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

export async function loadUserProfile(firebaseUser) {
  if (!firebaseUser) return null;

  const [userSnap, configSnap] = await Promise.all([
    getDoc(doc(db, 'users', firebaseUser.uid)),
    getDoc(doc(db, 'system', 'config')).catch(() => null),
  ]);

  if (!userSnap.exists()) {
    throw createAuthError('User profile not found in Firestore.', 'PROFILE_MISSING');
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
  if (configSnap?.exists()) {
    const cfg = configSnap.data();
    if (effectiveRole === 'MANAGER' && !cfg.adminUid && cfg.managerUid === firebaseUser.uid) {
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
      const m = mgrSnap.data();
      manager = {
        id: m.id || firebaseUser.uid,
        managerName: m.manager_name,
        email: m.email,
        branch: m.branch || 'All Branches',
      };
    } else {
      manager = {
        id: firebaseUser.uid,
        managerName: 'Branch Manager',
        email: userData.email || firebaseUser.email,
        branch: 'All Branches',
      };
    }
  } else if (effectiveRole === 'EMPLOYEE') {
    const empSnap = await getDoc(doc(db, 'employees', firebaseUser.uid));
    if (!empSnap.exists()) {
      await signOut(auth).catch(() => {});
      throw createAuthError('Employee profile not found.', 'EMPLOYEE_PROFILE_MISSING');
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

  const name =
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
    name,
    manager,
    employee,
  };
}

export async function login({ email, password, rememberMe = true, role = '' }) {
  const emailError = validateEmail(email);
  if (emailError) throw createAuthError(emailError, 'VALIDATION_ERROR');

  const passwordError = validatePassword(password);
  if (passwordError) throw createAuthError(passwordError, 'VALIDATION_ERROR');

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    const profile = await loadUserProfile(credential.user);

    if (role && profile.role !== role) {
      await signOut(auth).catch(() => {});
      await clearCachedUserProfile();
      const label = ROLE_LABELS[profile.role] || profile.role;
      throw createAuthError(
        `This account is registered as ${label}. Please select the ${label} login tab.`,
        'ROLE_MISMATCH'
      );
    }

    await setSecureItem(SECURE_KEYS.REMEMBERED_ROLE, profile.role).catch(() => {});
    if (rememberMe) {
      await setSecureItem(SECURE_KEYS.REMEMBERED_EMAIL, normalizedEmail);
    } else {
      await deleteSecureItem(SECURE_KEYS.REMEMBERED_EMAIL);
    }
    await setCachedUserProfile(profile);

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
      message: 'Password recovery instructions have been sent to your email address.',
    };
  } catch (error) {
    throw normalizeFirebaseError(error, 'Unable to send password reset email.');
  }
}

export async function logout() {
  await clearCachedUserProfile();
  await signOut(auth);
}

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
