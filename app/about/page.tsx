'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function AboutPage() {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: 'var(--space-16) var(--space-6)' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
          <h1 style={{ fontSize: 'var(--fs-4xl)', fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 'var(--space-3)' }}>
            Home repairs,{' '}
            <span style={{ color: 'var(--color-accent)' }}>simplified.</span>
          </h1>
          <p style={{ fontSize: 'var(--fs-base)', color: 'var(--gray-500)', maxWidth: '440px', margin: '0 auto' }}>
            Craftify connects homeowners with verified local tradespeople — fast, transparent, and fair.
          </p>
        </div>

        {/* Value pills */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-12)',
          flexWrap: 'wrap'
        }}>
          {[
            { icon: '🛡️', label: 'KYC-Verified Pros' },
            { icon: '⏱️', label: '<30 Min Response' },
            { icon: '💎', label: '0% Commission' },
          ].map(v => (
            <div key={v.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-5)',
              background: 'white',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--gray-200)',
              fontSize: 'var(--fs-sm)',
              fontWeight: 600,
              color: 'var(--gray-700)',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span>{v.icon}</span>
              <span>{v.label}</span>
            </div>
          ))}
        </div>

        {/* Stat callout */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-8)',
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--gray-200)',
          marginBottom: 'var(--space-12)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 'var(--fs-5xl)', fontWeight: 900, color: 'var(--navy-700)', letterSpacing: '-0.04em' }}>100%</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-500)', fontWeight: 500, marginTop: '2px' }}>
            of labor fees go directly to the worker — we only charge a small dispatch fee
          </div>
        </div>

        {/* CTA */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-10) var(--space-6)',
          background: 'linear-gradient(135deg, var(--navy-700) 0%, var(--navy-900) 100%)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'white', marginBottom: 'var(--space-4)' }}>
            Need a repair?
          </h2>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={user ? '/request' : '/auth/signup'} className="btn btn-primary" style={{ fontWeight: 600 }}>
              Request a Pro
            </Link>
            <Link href="/auth/signup" className="btn btn-outline-white" style={{ fontWeight: 600 }}>
              Join as Worker
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
