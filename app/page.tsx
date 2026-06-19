'use client';

import { useAuth } from '@/lib/auth-context';

export default function HomePage() {
  const { user } = useAuth();

  const categories = [
    {
      icon: '🔧',
      title: 'Plumbing',
      desc: 'Burst pipes, leaks, blocked drains',
      color: 'var(--blue-50)',
      iconBg: 'var(--blue-100)',
    },
    {
      icon: '⚡',
      title: 'Electrical',
      desc: 'Power outage, short circuit, wiring',
      color: '#fef9ee',
      iconBg: '#fef3c7',
    },
    {
      icon: '🔥',
      title: 'Heating',
      desc: 'Boiler failure, no hot water, radiators',
      color: '#fef2f2',
      iconBg: '#fee2e2',
    },
    {
      icon: '🔑',
      title: 'Locksmith',
      desc: 'Locked out, broken lock, key snapped',
      color: '#ecfdf5',
      iconBg: '#d1fae5',
    },
  ];

  const trustBadges = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--blue-400)" strokeWidth="1.5"/>
          <path d="M10 5v5l3 2" stroke="var(--blue-400)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Under 30 min',
      desc: 'Average response time',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--blue-400)" strokeWidth="1.5"/>
          <path d="M7 10l2 2 4-4" stroke="var(--blue-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Verified Pros',
      desc: 'KYC checked workers',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="var(--blue-400)" strokeWidth="1.5"/>
          <path d="M8 12l2-4 2 4M9 11h2" stroke="var(--blue-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Fair Pricing',
      desc: 'Dynamic & transparent',
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="hero-eyebrow-dot"></span>
              Bremen · Live Now
            </div>

            <h1 className="hero-title">
              Emergency trades,<br />
              <span className="gradient-text">at your door.</span>
            </h1>

            <p className="hero-desc">
              Burst pipe? Power out? Locked out? Connect instantly with
              verified Handwerker near you. Dynamic pricing, no hidden fees.
            </p>

            <div className="hero-actions">
              <a
                href={user ? '/request' : '/auth/signup'}
                className="btn btn-primary btn-lg hero-cta-primary"
              >
                Post an Emergency
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M4 9h10M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
              <a
                href={user?.role === 'worker' ? '/workers' : '/auth/signup'}
                className="btn btn-ghost btn-lg hero-cta-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M11.5 2.5l4 4-9.5 9.5H2v-4L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Join as Worker
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-visual">
              <div className="hero-card hero-card-1">
                <div className="hero-card-icon" style={{ background: 'var(--blue-50)' }}>🔧</div>
                <div>
                  <div className="hero-card-title">Plumber dispatched</div>
                  <div className="hero-card-sub">ETA 12 min · €150</div>
                </div>
                <span className="badge badge-accepted">En Route</span>
              </div>
              <div className="hero-card hero-card-2">
                <div className="hero-card-icon" style={{ background: '#fef3c7' }}>⚡</div>
                <div>
                  <div className="hero-card-title">Electrician needed</div>
                  <div className="hero-card-sub">Price: €225 (escalated)</div>
                </div>
                <span className="badge badge-open">Open</span>
              </div>
              <div className="hero-card hero-card-3">
                <div className="hero-card-icon" style={{ background: '#d1fae5' }}>✅</div>
                <div>
                  <div className="hero-card-title">Lock replaced</div>
                  <div className="hero-card-sub">Paid €180 via Stripe</div>
                </div>
                <span className="badge badge-paid">Paid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="trust-badges">
          {trustBadges.map((badge) => (
            <div key={badge.title} className="trust-badge">
              <div className="trust-badge-icon">{badge.icon}</div>
              <div>
                <div className="trust-badge-title">{badge.title}</div>
                <div className="trust-badge-desc">{badge.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="categories-section">
        <div className="categories-inner">
          <h2 className="section-title">What do you need?</h2>
          <p className="section-subtitle">Select a category to get started</p>

          <div className="category-grid">
            {categories.map((cat) => (
              <a
                key={cat.title}
                href={user ? '/request' : '/auth/signup'}
                className="category-card"
                style={{ '--cat-bg': cat.color, '--cat-icon-bg': cat.iconBg } as React.CSSProperties}
              >
                <div className="category-card-icon">{cat.icon}</div>
                <div className="category-card-body">
                  <h3>{cat.title}</h3>
                  <p>{cat.desc}</p>
                </div>
                <svg className="category-card-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 4l6 6-6 6" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — horizontal timeline style */}
      <section className="how-section-v2">
        <div className="how-inner-v2">
          <div className="how-header-v2">
            <h2>How it works</h2>
            <p>From request to repair in minutes, not hours</p>
          </div>

          <div className="timeline-row">
            <div className="timeline-step">
              <div className="timeline-step-num">1</div>
              <div className="timeline-step-connector"></div>
              <h3>Post your emergency</h3>
              <p>Describe the problem, set your location, and choose a starting price.</p>
            </div>
            <div className="timeline-step">
              <div className="timeline-step-num">2</div>
              <div className="timeline-step-connector"></div>
              <h3>Workers get notified</h3>
              <p>Nearby verified professionals receive instant alerts via email &amp; WhatsApp.</p>
            </div>
            <div className="timeline-step">
              <div className="timeline-step-num">3</div>
              <h3>Job done, get paid</h3>
              <p>Once complete, payment is processed securely through Stripe. Simple.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / stats bar */}
      <section className="stats-bar">
        <div className="stats-bar-inner">
          {[
            { value: '500+', label: 'Jobs completed' },
            { value: '<30 min', label: 'Avg. response' },
            { value: '4.8/5', label: 'Worker rating' },
            { value: '8', label: 'Service categories' },
          ].map((stat) => (
            <div key={stat.label} className="stats-bar-item">
              <div className="stats-bar-value">{stat.value}</div>
              <div className="stats-bar-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner">
          <div className="cta-banner-content">
            <h2>Ready to get started?</h2>
            <p>
              Whether you need a plumber at midnight or want to earn as a verified professional
              — create your free account in 30 seconds.
            </p>
            <div className="cta-banner-actions">
              <a href="/auth/signup" className="btn btn-white btn-lg">
                Create Free Account
              </a>
              <a href="/auth/signin" className="btn btn-outline-white btn-lg">
                Sign In
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-v2">
        <div className="footer-v2-inner">
          <div className="footer-v2-brand">
            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--space-3)' }}>
              <span className="navbar-brand-icon" style={{ width: '32px', height: '32px', fontSize: '1rem' }}>⚡</span>
              <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--gray-900)' }}>Craftify</span>
            </div>
            <p>Emergency repair services dispatched in minutes. Available 24/7 across your city.</p>
          </div>

          <div className="footer-v2-links">
            <div className="footer-v2-col">
              <h4>Platform</h4>
              <a href="/request">Request Help</a>
              <a href="/dashboard">Dashboard</a>
              <a href="/workers">Workers</a>
            </div>
            <div className="footer-v2-col">
              <h4>Account</h4>
              <a href="/auth/signin">Sign In</a>
              <a href="/auth/signup">Create Account</a>
            </div>
            <div className="footer-v2-col">
              <h4>Services</h4>
              <a href="/request">Plumbing</a>
              <a href="/request">Electrical</a>
              <a href="/request">Locksmith</a>
              <a href="/request">Heating</a>
            </div>
          </div>
        </div>

        <div className="footer-v2-bottom">
          <p>© 2026 Craftify Emergency. All rights reserved.</p>
          <p>Built with Next.js · Supabase · Stripe Connect</p>
        </div>
      </footer>
    </>
  );
}
