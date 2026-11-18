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
  const [user, setUser] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let active = true;

    // Immediately hydrate cached profile from secure storage so the mobile app opens
    // directly into the dashboard without forcing repeated logins.
    getCachedUserProfile()
      .then((cached) => {
        if (active && cached) {
          setUser((prev) => prev || cached);
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (!active) return;

      if (!firebaseUser) {
        await clearCachedUserProfile();
        if (active) {
          setUser(null);
          setIsHydrating(false);
        }
        return;
      }

      const cached = await getCachedUserProfile(firebaseUser.uid);
      if (active && cached) {
        setUser(cached);
        setIsHydrating(false);
      }

      try {
        const profile = await loadUserProfile(firebaseUser);
        await setCachedUserProfile(profile);
        if (active) {
          setUser(profile);
        }
      } catch (err) {
        // ONLY clear session on explicit account deactivation or missing profile.
        // Transient network hiccups on mobile MUST NEVER log the user out.
        if (REVOCATION_ERROR_CODES.has(err?.code)) {
          await clearCachedUserProfile();
          if (active) {
            setUser(null);
          }
        } else if (active && !cached) {
          setUser((prev) => prev || null);
        }
      } finally {
        if (active) {
          setIsHydrating(false);
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async ({ email, password, rememberMe = true, role }) => {
    const result = await loginApi({ email, password, rememberMe, role });
    await setCachedUserProfile(result.user);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await clearCachedUserProfile();
    await logoutApi();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isHydrating,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isHydrating, login, logout]
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
