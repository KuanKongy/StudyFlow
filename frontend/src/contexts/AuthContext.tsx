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
  error: string | null;
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
  const fetchAttempted = useRef(false);

  const getToken: TokenGetter = useCallback(async () => {
    return getAccessTokenSilently();
  }, [getAccessTokenSilently]);

  const login = useCallback(() => {
    loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    setUser(null);
    setProfileError(null);
    fetchAttempted.current = false;
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

  useEffect(() => {
    if (auth0Loading || !auth0IsAuth || fetchAttempted.current) return;
    fetchAttempted.current = true;

    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);

    fetchMe(getToken)
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err) => {
        console.error('Failed to fetch user profile:', err);
        if (!cancelled) setProfileError(err?.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => { cancelled = true; };
  }, [auth0IsAuth, auth0Loading, getToken]);

  const errorMsg = auth0Error?.message ?? profileError ?? null;
  const stillLoading = auth0Loading || profileLoading || (auth0IsAuth && !user && !errorMsg);

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
        error: errorMsg,
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
