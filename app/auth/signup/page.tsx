'use client';

import { useState } from 'react';
import { useAuth, UserRole } from '@/lib/auth-context';

export default function SignUpPage() {
  const { signUp } = useAuth();
  const [step, setStep] = useState<'role' | 'details'>('role');
  const [role, setRole] = useState<UserRole>('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectRole(r: UserRole) {
    setRole(r);
    setStep('details');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signUp(name, email, password, role);

    if (result.success) {
      if (role === 'worker') {
        window.location.href = '/dashboard';
      } else if (role === 'admin') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/request';
      }
    } else {
      setError(result.error || 'Sign up failed');
      setLoading(false);
    }
  }

  const roles = [
    {
      key: 'customer' as UserRole,
      icon: '🏠',
      title: 'I need help',
      subtitle: 'Customer',
      description: 'Request emergency repairs and track your jobs in real-time.',
      color: 'var(--blue-50)',
      borderColor: 'var(--blue-200)',
    },
    {
      key: 'worker' as UserRole,
      icon: '🔧',
      title: 'I\'m a professional',
      subtitle: 'Worker',
      description: 'Accept emergency jobs, manage your schedule, and earn money.',
      color: 'var(--color-success-light)',
      borderColor: '#a7f3d0',
    },
  ];

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left — Branding */}
        <div className="auth-branding">
          <a href="/" className="auth-logo">
            <span className="navbar-brand-icon" style={{ width: '44px', height: '44px', fontSize: '1.4rem' }}>⚡</span>
            <span style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800 }}>Craftify</span>
          </a>
          <h1>Join Craftify</h1>
          <p>Create your account to get started with emergency repair services.</p>

          <div className="auth-trust-items">
            <div className="auth-trust-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--blue-50)"/><path d="M6 10l3 3 5-5" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Free to create an account</span>
            </div>
            <div className="auth-trust-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--blue-50)"/><path d="M6 10l3 3 5-5" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Verified professionals only</span>
            </div>
            <div className="auth-trust-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--blue-50)"/><path d="M6 10l3 3 5-5" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Secure payments via Stripe</span>
            </div>
            <div className="auth-trust-item">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="var(--blue-50)"/><path d="M6 10l3 3 5-5" stroke="var(--blue-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Available 24/7 across your city</span>
            </div>
          </div>
        </div>

        {/* Right — Form */}
        <div className="auth-form-panel">
          {step === 'role' ? (
            <>
              <div className="auth-form-header">
                <h2>Choose your role</h2>
                <p>This determines which features you&apos;ll see</p>
              </div>

              <div className="role-selector">
                {roles.map((r) => (
                  <button
                    key={r.key}
                    className="role-card"
                    onClick={() => selectRole(r.key)}
                    style={{
                      '--role-bg': r.color,
                      '--role-border': r.borderColor,
                    } as React.CSSProperties}
                  >
                    <div className="role-card-icon">{r.icon}</div>
                    <div className="role-card-content">
                      <h3>{r.title}</h3>
                      <span className="role-card-subtitle">{r.subtitle}</span>
                      <p>{r.description}</p>
                    </div>
                    <svg className="role-card-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7 4l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>

              <div className="auth-switch" style={{ marginTop: 'var(--space-8)' }}>
                Already have an account?{' '}
                <a href="/auth/signin">Sign in</a>
              </div>
            </>
          ) : (
            <>
              <div className="auth-form-header">
                <button
                  className="auth-back-btn"
                  onClick={() => setStep('role')}
                >
                  ← Change role
                </button>
                <h2>Create your account</h2>
                <p>
                  Signing up as{' '}
                  <span className="auth-role-highlight">
                    {role === 'customer' ? '🏠 Customer' : '🔧 Worker'}
                  </span>
                </p>
              </div>

              {error && (
                <div className="auth-error">{error}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="signup-name">Full Name</label>
                  <input
                    id="signup-name"
                    type="text"
                    className="form-input"
                    placeholder="John Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="signup-email">Email</label>
                  <input
                    id="signup-email"
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
                  <label className="form-label" htmlFor="signup-password">Password</label>
                  <input
                    id="signup-password"
                    type="password"
                    className="form-input"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-full"
                  disabled={loading}
                  id="signup-btn"
                >
                  {loading ? (
                    <><span className="spinner"></span> Creating account...</>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="auth-switch">
                Already have an account?{' '}
                <a href="/auth/signin">Sign in</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
