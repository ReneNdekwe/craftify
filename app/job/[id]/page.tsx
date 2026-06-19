'use client';

import { use, useState, useEffect, useCallback } from 'react';

interface JobDetails {
  id: string;
  status: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  base_price: number;
  current_price: number;
  platform_fee: number;
  worker_payout: number;
  escalation_count: number;
  accept_token: string;
  stripe_payment_intent_id: string | null;
  created_at: string;
  last_escalated_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  paid_at: string | null;
  customers: {
    name: string;
    email: string;
    phone: string;
  } | null;
  workers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    rating: number;
    jobs_completed: number;
  } | null;
  categories: {
    name: string;
    icon: string;
  } | null;
}

export default function JobStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs?id=${id}`);
      const data = await res.json();
      if (data.job) {
        setJob(data.job);
      } else {
        setError('Job not found.');
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
      setError('Failed to load job details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
    const interval = setInterval(fetchJob, 10000);
    return () => clearInterval(interval);
  }, [fetchJob]);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleComplete() {
    if (!job?.workers) return;
    setCompleting(true);

    try {
      const res = await fetch('/api/jobs/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          workerId: (job.workers as { id: string }).id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('Job completed and payment processed!', 'success');
        fetchJob();
      } else {
        showToast(data.error || 'Failed to complete job.', 'error');
      }
    } catch (err) {
      console.error('Complete error:', err);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setCompleting(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }

  function getTimeSince(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
        <p className="mt-4" style={{ color: 'var(--gray-400)' }}>Loading job details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Job Not Found</h3>
          <p>{error || 'The job you are looking for does not exist.'}</p>
          <a href="/dashboard" className="btn btn-primary mt-6">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  const timelineSteps = [
    {
      label: 'Request Created',
      description: `Created ${formatDate(job.created_at)}`,
      completed: true,
      active: job.status === 'OPEN',
    },
    {
      label: 'Workers Notified',
      description: job.status === 'OPEN'
        ? `Waiting for a worker to accept... (${getTimeSince(job.created_at)})`
        : 'Workers were notified via Email & WhatsApp',
      completed: true,
      active: job.status === 'OPEN',
    },
    {
      label: 'Job Accepted',
      description: job.accepted_at
        ? `Accepted by ${job.workers?.name || 'Worker'} — ${formatDate(job.accepted_at)}`
        : 'Waiting for a worker to accept',
      completed: ['ACCEPTED', 'COMPLETED', 'PAID'].includes(job.status),
      active: job.status === 'ACCEPTED',
    },
    {
      label: 'Payment Processed',
      description: job.paid_at
        ? `Paid €${Number(job.current_price).toFixed(2)} — ${formatDate(job.paid_at)}`
        : 'Pending completion',
      completed: job.status === 'PAID',
      active: false,
    },
  ];

  return (
    <div className="page-container">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span style={{ fontSize: '1.5rem' }}>{job.categories?.icon}</span>
            <h1 style={{ fontSize: 'var(--fs-2xl)' }}>
              {job.categories?.name || 'Emergency'} Job
            </h1>
            <span className={`badge badge-${job.status.toLowerCase()}`}>{job.status}</span>
          </div>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-400)' }}>
            Job ID: <span className="font-mono">{job.id.substring(0, 8)}...</span> · Created {getTimeSince(job.created_at)}
          </p>
        </div>
        <div className="flex gap-4">
          <a href="/dashboard" className="btn btn-ghost">← Dashboard</a>
          <button className="btn btn-ghost" onClick={fetchJob}>Refresh</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Job Details */}
          <div className="card mb-6">
            <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Job Details</h3>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Category</span>
              <span className="accept-detail-value">{job.categories?.icon} {job.categories?.name}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Description</span>
              <span className="accept-detail-value" style={{ maxWidth: '350px', textAlign: 'right' }}>{job.description}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Address</span>
              <span className="accept-detail-value">{job.address}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Customer</span>
              <span className="accept-detail-value">{job.customers?.name || '—'}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Coordinates</span>
              <span className="accept-detail-value font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                {job.latitude.toFixed(4)}, {job.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="card mb-6">
            <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Pricing</h3>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Starting Price</span>
              <span className="accept-detail-value">€{Number(job.base_price).toFixed(2)}</span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Current Price</span>
              <span className="accept-detail-value" style={{
                fontSize: 'var(--fs-xl)',
                fontWeight: 800,
                color: job.current_price > job.base_price ? 'var(--blue-600)' : 'var(--gray-800)',
              }}>
                €{Number(job.current_price).toFixed(2)}
              </span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Platform Fee (20%)</span>
              <span className="accept-detail-value" style={{ color: 'var(--blue-500)' }}>
                €{Number(job.platform_fee).toFixed(2)}
              </span>
            </div>
            <div className="accept-detail-row">
              <span className="accept-detail-label">Worker Payout (80%)</span>
              <span className="accept-detail-value" style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                €{Number(job.worker_payout).toFixed(2)}
              </span>
            </div>
            {job.escalation_count > 0 && (
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'var(--color-warning-light)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-warning-text)' }}>
                  Price escalated {job.escalation_count}x (+€{job.escalation_count * 75} from base)
                </p>
              </div>
            )}
          </div>

          {/* Worker */}
          {job.workers && (
            <div className="card mb-6">
              <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Assigned Worker</h3>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Name</span>
                <span className="accept-detail-value">{job.workers.name}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Email</span>
                <span className="accept-detail-value">{job.workers.email}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Phone</span>
                <span className="accept-detail-value">{job.workers.phone}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Rating</span>
                <span className="accept-detail-value">⭐ {job.workers.rating}/5</span>
              </div>
            </div>
          )}

          {/* Payment */}
          {job.stripe_payment_intent_id && (
            <div className="card mb-6">
              <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Payment</h3>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Payment ID</span>
                <span className="accept-detail-value font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                  {job.stripe_payment_intent_id}
                </span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Paid At</span>
                <span className="accept-detail-value">{formatDate(job.paid_at)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          <div className="card mb-6">
            <h3 className="mb-6" style={{ fontSize: 'var(--fs-lg)' }}>Status Timeline</h3>
            <div className="status-timeline">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="timeline-item">
                  <div className={`timeline-dot ${step.completed ? (step.active ? 'active' : 'completed') : ''}`}></div>
                  <h4>{step.label}</h4>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Actions</h3>

            {job.status === 'OPEN' && (
              <div>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-4)' }}>
                  Waiting for a worker to accept. Price escalates every 5 minutes.
                </p>
                <a href={`/accept/${job.accept_token}`} className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                  Open Accept Link
                </a>
              </div>
            )}

            {job.status === 'ACCEPTED' && (
              <div>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-4)' }}>
                  Worker is on their way. Mark complete once finished to trigger payment.
                </p>
                <button
                  className="btn btn-primary btn-lg w-full"
                  onClick={handleComplete}
                  disabled={completing}
                  id="complete-job-btn"
                >
                  {completing ? (
                    <><span className="spinner"></span> Processing Payment...</>
                  ) : (
                    'Mark Complete & Pay'
                  )}
                </button>
              </div>
            )}

            {job.status === 'PAID' && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'var(--color-success-light)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-success-text)' }}>
                  This job is complete and payment has been processed.
                </p>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-500)', marginTop: 'var(--space-2)' }}>
                  Receipts have been sent to both customer and worker.
                </p>
              </div>
            )}

            {job.status === 'CANCELLED' && (
              <div style={{
                padding: 'var(--space-4)',
                background: 'var(--color-danger-light)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--color-danger-text)' }}>
                  This job has been cancelled.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .page-container > div:last-of-type {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
