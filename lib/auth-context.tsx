'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'customer' | 'worker' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'craftify_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from localStorage on mount
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    // Demo auth — in production this would hit Supabase Auth
    // Check if there's a stored user with this email
    try {
      const storedUsers = JSON.parse(localStorage.getItem('craftify_users') || '[]');
      const found = storedUsers.find((u: User & { password: string }) => u.email === email && u.password === password);

      if (found) {
        const userData: User = { id: found.id, name: found.name, email: found.email, role: found.role };
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return { success: true };
      }

      // Fallback demo accounts
      const demoAccounts: Record<string, { name: string; role: UserRole }> = {
        'customer@demo.com': { name: 'Demo Customer', role: 'customer' },
        'worker@demo.com': { name: 'Demo Worker', role: 'worker' },
        'admin@demo.com': { name: 'Demo Admin', role: 'admin' },
      };

      if (demoAccounts[email] && password === 'demo123') {
        const account = demoAccounts[email];
        const userData: User = {
          id: crypto.randomUUID(),
          name: account.name,
          email,
          role: account.role,
        };
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return { success: true };
      }

      return { success: false, error: 'Invalid email or password' };
    } catch {
      return { success: false, error: 'Sign in failed' };
    }
  }

  async function signUp(name: string, email: string, password: string, role: UserRole) {
    try {
      const userData: User = {
        id: crypto.randomUUID(),
        name,
        email,
        role,
      };

      // Store in localStorage registry
      const storedUsers = JSON.parse(localStorage.getItem('craftify_users') || '[]');
      storedUsers.push({ ...userData, password });
      localStorage.setItem('craftify_users', JSON.stringify(storedUsers));

      // Log in immediately
      setUser(userData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return { success: true };
    } catch {
      return { success: false, error: 'Sign up failed' };
    }
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/';
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
