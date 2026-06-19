'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function SignInPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(email, password);

    if (result.success) {
      // Redirect based on role — read from localStorage to get role
      const stored = localStorage.getItem('craftify_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'worker') {
          window.location.href = '/dashboard';
        } else if (user.role === 'admin') {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/request';
        }
      } else {
        window.location.href = '/';
      }
    } else {
      setError(result.error || 'Sign in failed');
      setLoading(false);
    }
  }

  function fillDemo(type: 'customer' | 'worker' | 'admin') {
    const emails = {
      customer: 'customer@demo.com',
      worker: 'worker@demo.com',
      admin: 'admin@demo.com',
    };
    setEmail(emails[type]);
    setPassword('demo123');
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left — Branding */}
        <div className="auth-branding">
          <a href="/" className="auth-logo">
            <span className="navbar-brand-icon" style={{ width: '44px', height: '44px', fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800 }}>Craftify</span>
          </a>
          <h1>Welcome back</h1>
          <p>Sign in to your account to manage jobs, track workers, or request emergency help.</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🏠</div>
              <div>
                <strong>Customers</strong>
                <span>Request help and track your emergency jobs</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">🔧</div>
              <div>
                <strong>Workers</strong>
                <span>Accept jobs, manage your profile, and get paid</span>
              </div>
            </div>
            <div className="auth-feature-item">
              <div className="auth-feature-icon">📊</div>
              <div>
                <strong>Admins</strong>
                <span>Full dashboard access and platform management</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="auth-form-panel">
          <div className="auth-form-header">
            <h2>Sign In</h2>
            <p>Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="auth-error">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="signin-email">Email</label>
              <input
                id="signin-email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signin-password">Password</label>
              <input
                id="signin-password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              id="signin-btn"
            >
              {loading ? (
                <><span className="spinner"></span> Signing in...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="auth-demo-section">
            <p className="auth-demo-label">Quick demo login</p>
            <div className="auth-demo-buttons">
              <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('customer')}>
                Customer
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('worker')}>
                Worker
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fillDemo('admin')}>
                Admin
              </button>
            </div>
          </div>

          <div className="auth-switch">
            Don&apos;t have an account?{' '}
            <a href="/auth/signup">Create one</a>
          </div>
        </div>
      </div>
    </div>
  );
}
