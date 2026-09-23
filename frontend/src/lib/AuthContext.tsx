'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchApi } from './api';

export interface AuthRole {
  id: number;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  is_admin?: boolean;
  is_superadmin?: boolean;
  server_limit: number;
  roles?: AuthRole[];
  permissions?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permissionSlug: string) => boolean;
  hasRole: (roleSlug: string | string[]) => boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  isSuperAdmin: false,
  hasPermission: () => false,
  hasRole: () => false,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

const PUBLIC_PATHS = ['/login', '/register', '/setup', '/auth/callback'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      router.push('/login');
    }
  }, [pathname, router]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('auth_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await fetchApi('/auth/me');
      if (userData && userData.id) {
        setUser(userData);
        setToken(savedToken);
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Initial load
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {}
    }

    refreshUser();
  }, [refreshUser]);

  // Periodic session validation (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('auth_token');
      if (currentToken) {
        fetchApi('/auth/me')
          .then((res) => {
            if (!res || !res.id) {
              logout();
            } else {
              setUser(res);
            }
          })
          .catch(() => {
            logout();
          });
      } else {
        setUser(null);
        setToken(null);
        if (!PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
          router.push('/login');
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pathname, logout, router]);

  // Guard protected routes
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    if (!token && !isPublic) {
      router.push('/login');
    }
  }, [pathname, token, loading, router]);

  const hasPermission = useCallback((perm: string): boolean => {
    if (!user) return false;
    if (user.is_superadmin || user.role === 'superadmin') return true;
    const perms = user.permissions || [];
    if (perms.includes('*')) return true;
    return perms.includes(perm);
  }, [user]);

  const hasRole = useCallback((roles: string | string[]): boolean => {
    if (!user) return false;
    if (user.is_superadmin || user.role === 'superadmin') return true;
    const checkList = Array.isArray(roles) ? roles : [roles];
    const userRoleSlugs = (user.roles || []).map((r) => r.slug.toLowerCase());
    if (user.role) userRoleSlugs.push(user.role.toLowerCase());

    return checkList.some((r) => userRoleSlugs.includes(r.toLowerCase()));
  }, [user]);

  const isAdmin = !!user && (user.is_admin || user.role === 'admin' || user.role === 'superadmin' || hasPermission('settings.view'));
  const isSuperAdmin = !!user && (user.is_superadmin || user.role === 'superadmin');

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin,
        isSuperAdmin,
        hasPermission,
        hasRole,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
