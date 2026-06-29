'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function RequestSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ jobId: string; message: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found. Are you sure you completed the payment?');
      setLoading(false);
      return;
    }

    async function confirmPayment() {
      try {
        const res = await fetch('/api/jobs/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (data.success && data.job) {
          setResult({
            jobId: data.job.id,
            message: data.message,
          });
        } else {
          setError(data.error || 'Failed to verify payment');
        }
      } catch (err) {
        console.error('Confirmation error:', err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    confirmPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '4px', margin: '0 auto var(--space-4)' }}></div>
          <h2>Verifying Payment...</h2>
          <p style={{ color: 'var(--gray-500)' }}>Please do not close this window.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card" style={{ borderTop: '4px solid var(--error-600)' }}>
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <h1>Payment Issue</h1>
              <p>We could not verify your payment.</p>
            </div>
            <div className="accept-body">
              <p style={{ color: 'var(--gray-800)', marginBottom: 'var(--space-4)' }}>{error}</p>
              <a href="/request" className="btn btn-outline-primary w-full" style={{ textAlign: 'center' }}>
                Return to Request Form
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card">
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <h1>Payment Secured!</h1>
              <p>Your emergency request has been dispatched</p>
            </div>
            <div className="accept-body">
              <div className="accept-detail-row">
                <span className="accept-detail-label">Job ID</span>
                <span className="accept-detail-value font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                  {result.jobId.substring(0, 8)}...
                </span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Status</span>
                <span className="badge badge-open">OPEN</span>
              </div>
              <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)', color: 'var(--gray-500)' }}>
                {result.message}
              </p>
              <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
                Your payment method has been pre-authorized. You will only be charged when the worker completes the job.
              </p>
            </div>
            <div className="accept-actions" style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <a href={`/job/${result.jobId}`} className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                Track Job Status
              </a>
              <a href="/request" className="btn btn-ghost w-full" style={{ textAlign: 'center' }}>
                New Request
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
