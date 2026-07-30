import { createContext, useContext, ReactNode, useCallback, useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { User } from '@/types';
import { fetchMe, TokenGetter } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  getToken: TokenGetter;
  refreshUser: () => Promise<void>;
  /** Re-attempts the profile fetch after a transient failure. */
  retryProfile: () => void;
  /** True when sign-in failed; UI should show a static message only (never raw Auth0 errors). */
  error: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    isAuthenticated: auth0IsAuth,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    error: auth0Error,
  } = useAuth0();

  const [user, setUser] = useState<User | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Bumping this re-runs the profile fetch after a transient failure —
  // a single failed /api/me must not strand the user until a hard reload.
  const [fetchAttempt, setFetchAttempt] = useState(0);
  const fetchInFlight = useRef(false);

  const getToken: TokenGetter = useCallback(async () => {
    return getAccessTokenSilently();
  }, [getAccessTokenSilently]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    setUser(null);
    setProfileError(null);
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

  const refreshUser = useCallback(async () => {
    try {
      const u = await fetchMe(getToken);
      setUser(u);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  }, [getToken]);

  const retryProfile = useCallback(() => {
    setProfileError(null);
    setFetchAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    if (auth0Loading || !auth0IsAuth || user || profileError || fetchInFlight.current) return;
    fetchInFlight.current = true;

    let cancelled = false;
    setProfileLoading(true);

    fetchMe(getToken)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        console.error('Failed to fetch user profile:', err);
        if (!cancelled) setProfileError(err?.message ?? String(err));
      })
      .finally(() => {
        fetchInFlight.current = false;
        if (!cancelled) setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [auth0IsAuth, auth0Loading, user, profileError, fetchAttempt, getToken]);

  useEffect(() => {
    if (auth0Error) console.error('Auth0 error:', auth0Error);
  }, [auth0Error]);

  const authFailed = auth0Error != null || profileError != null;
  const stillLoading =
    auth0Loading || profileLoading || (auth0IsAuth && !user && !authFailed);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: auth0IsAuth && !!user,
        isLoading: stillLoading,
        login,
        logout,
        getToken,
        refreshUser,
        retryProfile,
        error: authFailed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
