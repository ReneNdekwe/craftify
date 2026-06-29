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

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
          <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="dash-page">
        <div className="dash-page-inner">
          <div className="dash-empty">
            <div className="dash-empty-icon">🔍</div>
            <h3>Job Not Found</h3>
            <p>{error || 'The job you are looking for does not exist.'}</p>
            <a href="/dashboard" className="dash-btn-accent mt-6" style={{ display: 'inline-flex' }}>← Back to Dashboard</a>
          </div>
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
    <div className="dash-page">
      <div className="dash-page-inner">
        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.message}</div>
        )}

        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-top">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '1.5rem' }}>{job.categories?.icon}</span>
                <h1 className="dash-title" style={{ fontSize: 'var(--fs-2xl)' }}>
                  {job.categories?.name || 'Emergency'} Job
                </h1>
                <span className={`dash-badge dash-badge--${job.status.toLowerCase()}`}>{job.status}</span>
              </div>
              <p className="dash-subtitle">
                Job ID: <span className="font-mono">{job.id.substring(0, 8)}...</span> · Created {getTimeSince(job.created_at)}
              </p>
            </div>
            <div className="dash-actions">
              <a href="/dashboard" className="dash-btn-refresh">← Dashboard</a>
              <button className="dash-btn-refresh" onClick={fetchJob}>
                <span className="refresh-icon">↻</span> Refresh
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-6)', alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Job Details */}
            <div className="dash-detail-card" style={{ animationDelay: '0ms' }}>
              <div className="dash-detail-card-header">
                <div className="dash-detail-card-header-icon">📋</div>
                <span className="dash-detail-card-title">Job Details</span>
              </div>
              <div className="dash-detail-card-body">
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Category</span>
                  <span className="dash-detail-value">{job.categories?.icon} {job.categories?.name}</span>
                </div>
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Description</span>
                  <span className="dash-detail-value" style={{ maxWidth: '350px' }}>{job.description}</span>
                </div>
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Address</span>
                  <span className="dash-detail-value">{job.address}</span>
                </div>
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Customer</span>
                  <span className="dash-detail-value">{job.customers?.name || '—'}</span>
                </div>
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Coordinates</span>
                  <span className="dash-detail-value font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                    {job.latitude.toFixed(4)}, {job.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="dash-detail-card" style={{ animationDelay: '100ms' }}>
              <div className="dash-detail-card-header">
                <div className="dash-detail-card-header-icon" style={{ background: '#ecfdf5' }}>💰</div>
                <span className="dash-detail-card-title">Pricing</span>
              </div>
              <div className="dash-detail-card-body">
                <div className="dash-detail-row">
                  <span className="dash-detail-label">Dispatch Fee Paid</span>
                  <span className="dash-detail-value" style={{
                    fontSize: 'var(--fs-xl)',
                    fontWeight: 800,
                    color: 'var(--blue-600)',
                  }}>
                    €{Number(job.base_price).toFixed(2)}
                  </span>
                </div>
                <div className="dash-escalation-banner" style={{ background: '#f8fafc', color: '#475569', borderLeftColor: '#cbd5e1' }}>
                  <p>💸 Labor and materials must be paid directly to the handworker at the door.</p>
                </div>
              </div>
            </div>

            {/* Worker */}
            {job.workers && (
              <div className="dash-detail-card" style={{ animationDelay: '200ms' }}>
                <div className="dash-detail-card-header">
                  <div className="dash-detail-card-header-icon" style={{ background: '#eef2ff' }}>👷</div>
                  <span className="dash-detail-card-title">Assigned Worker</span>
                </div>
                <div className="dash-detail-card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--gray-50)' }}>
                    <div className="dash-avatar dash-avatar--indigo" style={{ width: '44px', height: '44px', fontSize: '14px' }}>
                      {getInitials(job.workers.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--gray-800)' }}>{job.workers.name}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
                        ⭐ {job.workers.rating}/5 · {job.workers.jobs_completed} jobs completed
                      </div>
                    </div>
                  </div>
                  <div className="dash-detail-row">
                    <span className="dash-detail-label">Email</span>
                    <span className="dash-detail-value">{job.workers.email}</span>
                  </div>
                  <div className="dash-detail-row">
                    <span className="dash-detail-label">Phone</span>
                    <span className="dash-detail-value">{job.workers.phone}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment */}
            {job.stripe_payment_intent_id && (
              <div className="dash-detail-card" style={{ animationDelay: '300ms' }}>
                <div className="dash-detail-card-header">
                  <div className="dash-detail-card-header-icon" style={{ background: '#ecfdf5' }}>💳</div>
                  <span className="dash-detail-card-title">Payment</span>
                </div>
                <div className="dash-detail-card-body">
                  <div className="dash-detail-row">
                    <span className="dash-detail-label">Payment ID</span>
                    <span className="dash-detail-value font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                      {job.stripe_payment_intent_id}
                    </span>
                  </div>
                  <div className="dash-detail-row">
                    <span className="dash-detail-label">Paid At</span>
                    <span className="dash-detail-value">{formatDate(job.paid_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {/* Timeline */}
            <div className="dash-detail-card" style={{ animationDelay: '150ms' }}>
              <div className="dash-detail-card-header">
                <div className="dash-detail-card-header-icon" style={{ background: '#eef2ff' }}>📍</div>
                <span className="dash-detail-card-title">Status Timeline</span>
              </div>
              <div className="dash-detail-card-body" style={{ padding: 'var(--space-6)' }}>
                <div className="dash-timeline">
                  {timelineSteps.map((step, idx) => (
                    <div key={idx} className="dash-timeline-item">
                      <div className={`dash-timeline-dot ${step.completed ? (step.active ? 'dash-timeline-dot--active' : 'dash-timeline-dot--completed') : ''}`}></div>
                      <h4>{step.label}</h4>
                      <p>{step.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="dash-action-card">
              <h3>Actions</h3>

              {job.status === 'OPEN' && (
                <div>
                  <p className="dash-action-hint">
                    Waiting for a worker to accept. Price escalates every 5 minutes.
                  </p>
                  <a href={`/accept/${job.accept_token}`} className="dash-btn-accent" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                    Open Accept Link
                  </a>
                </div>
              )}

              {job.status === 'ACCEPTED' && (
                <div>
                  <p className="dash-action-hint">
                    Worker is on their way. Mark complete once finished to trigger payment.
                  </p>
                  <button
                    className="dash-btn-complete"
                    onClick={handleComplete}
                    disabled={completing}
                    id="complete-job-btn"
                  >
                    {completing ? (
                      <><span className="spinner"></span> Processing Payment...</>
                    ) : (
                      '✅ Mark Complete & Pay'
                    )}
                  </button>
                </div>
              )}

              {job.status === 'PAID' && (
                <div className="dash-status-banner dash-status-banner--success">
                  <p className="dash-status-banner-title">✅ Job Complete</p>
                  <p className="dash-status-banner-desc">
                    Payment has been processed. Receipts sent to both customer and worker.
                  </p>
                </div>
              )}

              {job.status === 'CANCELLED' && (
                <div className="dash-status-banner dash-status-banner--danger">
                  <p className="dash-status-banner-title">❌ Job Cancelled</p>
                  <p className="dash-status-banner-desc">
                    This job has been cancelled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .dash-page-inner > div:last-of-type {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
