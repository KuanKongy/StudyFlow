import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for development
const mockUser: User = {
  id: 'user-1',
  authId: 'auth0|123',
  email: 'alex@studyflow.com',
  username: 'Nam Le',
  name: 'Alex Chen',
  createdAt: '2024-01-01T10:00:00Z',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth state
    const storedAuth = localStorage.getItem('studyflow_auth');
    if (storedAuth) {
      setUser(mockUser);
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    localStorage.setItem('studyflow_auth', 'true');
    setUser(mockUser);
  };

  const logout = () => {
    localStorage.removeItem('studyflow_auth');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
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
