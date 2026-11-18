import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  login as loginApi,
  logout as logoutApi,
  setupManager as setupManagerApi,
  loadUserProfile,
  subscribeToAuthChanges,
  getCachedUserProfile,
  setCachedUserProfile,
  clearCachedUserProfile,
} from '../services/authService';

const AuthContext = createContext(null);

const REVOCATION_ERROR_CODES = new Set([
  'ACCOUNT_INACTIVE',
  'PROFILE_MISSING',
  'EMPLOYEE_PROFILE_MISSING',
]);

export function AuthProvider({ children }) {
  // Hydrate immediately from the cached profile if present so mobile launches
  // stay signed in instantly with zero login flash.
  const [user, setUser] = useState(() => getCachedUserProfile());
  const [isVerifying, setIsVerifying] = useState(() => !getCachedUserProfile());

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (!firebaseUser) {
        clearCachedUserProfile();
        setUser(null);
        setIsVerifying(false);
        return;
      }

      // Immediately restore cached profile for this UID so brief offline/4G delays
      // on mobile never kick the user back to the login screen.
      const cached = getCachedUserProfile(firebaseUser.uid);
      if (cached) {
        setUser(cached);
        setIsVerifying(false);
      }

      try {
        const profile = await loadUserProfile(firebaseUser);
        setCachedUserProfile(profile);
        setUser(profile);
      } catch (err) {
        // ONLY sign out / clear user on explicit account revocation or missing profile.
        // Transient mobile network errors MUST NOT log the user out.
        if (REVOCATION_ERROR_CODES.has(err?.code)) {
          clearCachedUserProfile();
          setUser(null);
        } else if (!cached) {
          // No cached profile exists yet and Firestore couldn't be reached; keep minimal
          // auth state or wait for reconnect without clearing Firebase Auth persistence.
          setUser((prev) => prev || null);
        }
      } finally {
        setIsVerifying(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = Boolean(user);

  const login = useCallback(async ({ email, password, rememberMe = true, role }) => {
    const result = await loginApi({ email, password, rememberMe, role });
    setCachedUserProfile(result.user);
    setUser(result.user);
    return result;
  }, []);

  const completeManagerSetup = useCallback(async ({ email, password }) => {
    const result = await setupManagerApi({ email, password });
    setCachedUserProfile(result.user);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    clearCachedUserProfile();
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isVerifying,
      isAuthenticated,
      login,
      completeManagerSetup,
      logout,
    }),
    [user, isVerifying, isAuthenticated, login, completeManagerSetup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
