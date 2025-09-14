"use client";
import { useState, useEffect, useContext, createContext } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, getCurrentUser, isAuthenticated, logout as authLogout } from '../lib/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated()) {
        try {
          const userData = await getCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuth(true);
          } else {
            setUser(null);
            setIsAuth(false);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          setUser(null);
          setIsAuth(false);
        }
      } else {
        const localUser = getUser();
        if (localUser) {
          setUser(localUser);
          setIsAuth(true);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuth(true);
  };

  const logout = () => {
    authLogout();
    setUser(null);
    setIsAuth(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated: isAuth,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useRequireAuth = (redirectTo = '/') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
};

export const useRequireRole = (requiredRole, redirectTo = '/') => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(redirectTo);
      } else if (user.role !== requiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, requiredRole, redirectTo]);

  return { user, loading };
};
