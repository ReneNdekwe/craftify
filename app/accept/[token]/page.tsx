'use client';

import { use, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
interface JobDetails {
  id: string;
  status: string;
  description: string;
  address: string;
  current_price: number;
  platform_fee: number;
  worker_payout: number;
  escalation_count: number;
  created_at: string;
  accepted_at: string | null;
  categories: { name: string; icon: string } | null;
  customers: { name: string } | null;
  workers: { name: string; email: string; phone: string } | null;
}

interface NearbyWorker {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating: number;
  jobs_completed: number;
}

export default function AcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [workers, setWorkers] = useState<NearbyWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedJobInfo, setAcceptedJobInfo] = useState<{
    id: string;
    workerPayout: number;
    acceptedAt: string;
  } | null>(null);

  useEffect(() => {
    fetchJobByToken();
    fetchWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJobByToken() {
    try {
      const res = await fetch(`/api/jobs/by-token?token=${token}`);
      const data = await res.json();
      if (data.job) {
        setJob(data.job);
        if (data.job.status !== 'OPEN') setAlreadyTaken(true);
      } else {
        setError('Job not found. This link may have expired.');
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setError('Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchWorkers() {
    try {
      const res = await fetch('/api/workers?status=ACTIVE');
      const data = await res.json();
      if (data.workers) setWorkers(data.workers);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  }

  async function handleAccept() {
    if (!user || user.role !== 'worker') {
      setError('You must be logged in as an active worker to accept this job.');
      return;
    }
    const workerId = user.id;
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptToken: token, workerId }),
      });
      const data = await res.json();

      if (data.success) {
        setAccepted(true);
        setAcceptedJobInfo({
          id: data.job.id,
          workerPayout: data.job.workerPayout,
          acceptedAt: data.job.acceptedAt,
        });
      } else if (data.alreadyTaken) {
        setAlreadyTaken(true);
      } else {
        setError(data.error || 'Failed to accept job.');
      }
    } catch (err) {
      console.error('Accept error:', err);
      setError('Network error. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
        <p className="mt-4" style={{ color: 'var(--gray-400)' }}>Loading job details...</p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card">
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, var(--gray-600), var(--gray-500))' }}>
              <h1>Link Invalid</h1>
              <p>This accept link is no longer valid</p>
            </div>
            <div className="accept-body">
              <p style={{ textAlign: 'center', color: 'var(--gray-500)' }}>{error}</p>
            </div>
            <div className="accept-actions">
              <a href="/" className="btn btn-ghost w-full" style={{ textAlign: 'center' }}>
                ← Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyTaken && job) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card">
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, var(--gray-600), var(--gray-500))' }}>
              <h1>Job Already Taken</h1>
              <p>Another worker was faster</p>
            </div>
            <div className="accept-body">
              <div className="accept-detail-row">
                <span className="accept-detail-label">Category</span>
                <span className="accept-detail-value">{job.categories?.icon} {job.categories?.name}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Status</span>
                <span className="badge badge-accepted">{job.status}</span>
              </div>
              {job.workers && (
                <div className="accept-detail-row">
                  <span className="accept-detail-label">Accepted By</span>
                  <span className="accept-detail-value">{job.workers.name}</span>
                </div>
              )}
              <p style={{ marginTop: 'var(--space-6)', textAlign: 'center', fontSize: 'var(--fs-sm)', color: 'var(--gray-400)' }}>
                Don&apos;t worry — new repair jobs come in frequently. Stay active!
              </p>
            </div>
            <div className="accept-actions">
              <a href="/dashboard" className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                View Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accepted && acceptedJobInfo) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card">
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <h1>Job Accepted!</h1>
              <p>You&apos;re on your way to help</p>
            </div>
            <div className="accept-body">
              <div className="accept-detail-row">
                <span className="accept-detail-label">Category</span>
                <span className="accept-detail-value">{job?.categories?.icon} {job?.categories?.name}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Address</span>
                <span className="accept-detail-value">{job?.address}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Payment</span>
                <span className="accept-payout" style={{ fontSize: 'var(--fs-base)', color: 'var(--gray-700)' }}>Collect directly from customer</span>
              </div>
              <div style={{
                marginTop: 'var(--space-6)',
                padding: 'var(--space-4)',
                background: 'var(--color-success-light)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-success-text)' }}>
                  The customer has been notified. Please head to the address above.
                </p>
              </div>
            </div>
            <div className="accept-actions">
              <a href={`/job/${acceptedJobInfo.id}`} className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                View Job Details
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="accept-container">
        <div className="accept-card">
          <div className="accept-header">
            <h1>New Repair Job Available</h1>
            <p>Review the details and accept to get started</p>
          </div>

          <div className="accept-body">
            {error && (
              <div className="toast toast-error" style={{ position: 'relative', top: 0, right: 0, marginBottom: 'var(--space-4)', maxWidth: '100%' }}>
                {error}
              </div>
            )}

            <div className="accept-detail-row">
              <span className="accept-detail-label">Category</span>
              <span className="accept-detail-value">{job?.categories?.icon} {job?.categories?.name}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Customer</span>
              <span className="accept-detail-value">{job?.customers?.name || 'Anonymous'}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Address</span>
              <span className="accept-detail-value">{job?.address}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Description</span>
              <span className="accept-detail-value" style={{ maxWidth: '280px', textAlign: 'right' }}>
                {job?.description}
              </span>
            </div>


            {!user || user.role !== 'worker' ? (
              <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-warning-light)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-warning-text)', fontWeight: 600 }}>
                    Worker Authentication Required
                  </p>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-warning-text)', marginTop: 'var(--space-2)' }}>
                    You must be logged in as an active worker to accept this job.
                  </p>
                  <a href="/auth" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                    Log In
                  </a>
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginTop: 'var(--space-6)' }}>
                <div style={{
                  padding: 'var(--space-4)',
                  background: 'var(--color-success-light)',
                  borderRadius: 'var(--radius-md)',
                  textAlign: 'center',
                  border: '1px solid var(--color-success)'
                }}>
                  <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-success-text)' }}>
                    You are logged in as <strong>{user.name}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="accept-actions">
            <button
              className="btn btn-primary btn-xl w-full"
              onClick={handleAccept}
              disabled={accepting || !user || user.role !== 'worker'}
              id="accept-job-btn"
            >
              {accepting ? (
                <><span className="spinner"></span> Accepting...</>
              ) : (
                'Accept This Job'
              )}
            </button>
            <p style={{
              textAlign: 'center',
              fontSize: 'var(--fs-xs)',
              color: 'var(--gray-400)',
              marginTop: 'var(--space-3)',
            }}>
              First worker to accept wins. Be quick!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
