'use client';

import Link from 'next/link';

export default function CareersPage() {
  const jobs = [
    { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Bremen / Hybrid', type: 'Full-time' },
    { title: 'Product Designer (UX/UI)', dept: 'Design', location: 'Remote', type: 'Full-time' },
    { title: 'Operations Manager', dept: 'Operations', location: 'Bremen', type: 'Full-time' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'var(--space-16) var(--space-6)' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h1 style={{ fontSize: 'var(--fs-4xl)', fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 'var(--space-3)' }}>
            Build with{' '}
            <span style={{ color: 'var(--color-accent)' }}>Craftify</span>
          </h1>
          <p style={{ fontSize: 'var(--fs-base)', color: 'var(--gray-500)', maxWidth: '400px', margin: '0 auto' }}>
            Help us connect homeowners with trusted local professionals.
          </p>
        </div>

        {/* Open Positions */}
        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--gray-900)', marginBottom: 'var(--space-4)' }}>
          Open Positions
        </h2>
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--gray-200)',
          overflow: 'hidden',
          marginBottom: 'var(--space-12)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {jobs.map((job, idx) => (
            <div
              key={job.title}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-4) var(--space-5)',
                borderBottom: idx === jobs.length - 1 ? 'none' : '1px solid var(--gray-100)',
                transition: 'background 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--gray-900)' }}>{job.title}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-400)', marginTop: '2px' }}>
                  {job.dept} · {job.location} · {job.type}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ borderRadius: 'var(--radius-full)', fontSize: 'var(--fs-xs)', padding: 'var(--space-1) var(--space-4)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  alert(`Send your CV to careers@craftify.app — mention "${job.title}".`);
                }}
              >
                Apply
              </button>
            </div>
          ))}
        </div>

        {/* Tradesperson CTA */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          padding: 'var(--space-5) var(--space-6)',
          background: 'var(--navy-50)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--navy-200)',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 800, color: 'var(--navy-800)' }}>Skilled tradesperson?</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--navy-500)', marginTop: '2px' }}>
              Join our verified network — set your hours, keep 100% of labor fees.
            </div>
          </div>
          <Link href="/auth/signup" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap' }}>
            Apply as Partner
          </Link>
        </div>

      </div>
    </div>
  );
}
