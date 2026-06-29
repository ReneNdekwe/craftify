'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const pathname = usePathname();

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth/')) return null;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <a href="/" className="navbar-brand">
          <span className="navbar-brand-icon">⚡</span>
          Craftify
        </a>

        <div className="navbar-links">
          <a href="/about" className={`navbar-link${pathname === '/about' ? ' active' : ''}`}>
            About Us
          </a>
          <a href="/careers" className={`navbar-link${pathname === '/careers' ? ' active' : ''}`}>
            Careers
          </a>

          {loading ? null : user ? (
            <>
              {/* Role-based navigation */}
              {user.role === 'customer' && (
                <>
                  <a href="/request" className={`navbar-link${pathname === '/request' ? ' active' : ''}`}>
                    Request Help
                  </a>
                  <a href="/dashboard" className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}>
                    My Jobs
                  </a>
                </>
              )}

              {user.role === 'worker' && (
                <>
                  <a href="/dashboard" className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}>
                    Available Jobs
                  </a>
                </>
              )}

              {user.role === 'admin' && (
                <>
                  <a href="/dashboard" className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}>
                    Dashboard
                  </a>
                  <a href="/workers" className={`navbar-link${pathname === '/workers' ? ' active' : ''}`}>
                    Workers
                  </a>
                  <a href="/request" className={`navbar-link${pathname === '/request' ? ' active' : ''}`}>
                    New Job
                  </a>
                </>
              )}

              {/* User menu */}
              <div className="navbar-user">
                <span className="navbar-user-name">{user.name}</span>
                <span className="navbar-role-badge">{user.role}</span>
                <button className="btn btn-ghost btn-sm" onClick={signOut}>
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Signed out state */}
              <a href="/dashboard" className={`navbar-link${pathname === '/dashboard' ? ' active' : ''}`}>
                Available Jobs
              </a>
              <a href="/auth/signin" className="btn btn-ghost btn-sm" style={{ marginLeft: 'var(--space-2)' }}>
                Sign In
              </a>
              <a href="/auth/signup" className="btn btn-primary btn-sm">
                Create Account
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
