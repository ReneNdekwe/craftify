'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'customer' | 'worker' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (name: string, email: string, phone: string, password: string, role: UserRole, lat?: string, lon?: string) => Promise<{ success: boolean; error?: string }>;
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
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
        return { success: true };
      }

      return { success: false, error: data.error || 'Invalid email or password' };
    } catch {
      return { success: false, error: 'Sign in failed' };
    }
  }

  async function signUp(name: string, email: string, phone: string, password: string, role: UserRole, lat?: string, lon?: string) {
    try {
      let dbId = crypto.randomUUID();

      if (role === 'worker') {
        const res = await fetch('/api/workers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, latitude: lat, longitude: lon }),
        });
        if (!res.ok) throw new Error('Worker creation failed');
        const data = await res.json();
        if (data.worker?.id) dbId = data.worker.id;
      } else if (role === 'customer') {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone }),
        });
        if (!res.ok) throw new Error('Customer creation failed');
        const data = await res.json();
        if (data.customer?.id) dbId = data.customer.id;
      }

      const userData: User = {
        id: dbId,
        name,
        email,
        phone,
        role,
      };

      // Removed local registry array entirely. 
      // User is now safely persisted in the Supabase database above.

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
