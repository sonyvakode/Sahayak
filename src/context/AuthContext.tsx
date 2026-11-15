import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { AuthUser, GroupInfo, SupportedLanguage } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  group: GroupInfo | null;
  loading: boolean;
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  loginDemo: (userId: string, pin?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  const refreshSession = async () => {
    try {
      const data = await apiFetch<{ user: AuthUser; group: GroupInfo }>('/api/auth/me');
      setUser(data.user);
      setGroup(data.group);
      const savedLang = localStorage.getItem('sahayak_lang') as SupportedLanguage | null;
      setLanguageState(savedLang || data.user.preferredLanguage || 'en');
    } catch {
      setUser(null);
      setGroup(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedLang = localStorage.getItem('sahayak_lang') as SupportedLanguage | null;
    if (savedLang) setLanguageState(savedLang);
    refreshSession();
  }, []);

  const loginDemo = async (userId: string, pin?: string): Promise<AuthUser> => {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, pin }),
    });
    localStorage.setItem('sahayak_token', data.token);
    setUser(data.user);
    await refreshSession();
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    localStorage.removeItem('sahayak_token');
    setUser(null);
    setGroup(null);
  };

  const setLanguage = async (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('sahayak_lang', lang);
    if (user) {
      try {
        await apiFetch('/api/settings/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ preferredLanguage: lang }),
        });
      } catch {
        // offline tolerant
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        loading,
        language,
        setLanguage,
        loginDemo,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
