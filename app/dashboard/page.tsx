'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';

interface DashboardStats {
  total: number;
  open: number;
  accepted: number;
  paid: number;
  cancelled: number;
  totalRevenue: number;
  totalPlatformFees: number;
}

interface Job {
  id: string;
  status: string;
  description: string;
  address: string;
  base_price: number;
  current_price: number;
  platform_fee: number;
  worker_payout: number;
  escalation_count: number;
  created_at: string;
  accepted_at: string | null;
  paid_at: string | null;
  customers: { name: string; email: string } | null;
  workers: { name: string; email: string; phone: string } | null;
  categories: { name: string; icon: string } | null;
}

const AVATAR_COLORS = ['blue', 'emerald', 'amber', 'rose', 'indigo'] as const;

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, open: 0, accepted: 0, paid: 0, cancelled: 0,
    totalRevenue: 0, totalPlatformFees: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, user, authLoading]);

  async function fetchJobs() {
    try {
      let url = statusFilter
        ? `/api/jobs?status=${statusFilter}`
        : '/api/jobs';

      // If user is a customer or worker, only request their own jobs
      if (user?.role === 'customer' && user.id) {
        url += (url.includes('?') ? '&' : '?') + `customerId=${encodeURIComponent(user.id)}`;
      } else if (user?.role === 'worker' && user.id) {
        url += (url.includes('?') ? '&' : '?') + `workerId=${encodeURIComponent(user.id)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.jobs) {
        setJobs(data.jobs);

        if (!statusFilter) {
          const s: DashboardStats = {
            total: data.jobs.length,
            open: data.jobs.filter((j: Job) => j.status === 'OPEN').length,
            accepted: data.jobs.filter((j: Job) => j.status === 'ACCEPTED').length,
            paid: data.jobs.filter((j: Job) => j.status === 'PAID').length,
            cancelled: data.jobs.filter((j: Job) => j.status === 'CANCELLED').length,
            totalRevenue: data.jobs
              .filter((j: Job) => j.status === 'PAID')
              .reduce((sum: number, j: Job) => {
                if (user?.role === 'worker') return sum + Number(j.worker_payout);
                return sum + Number(j.current_price);
              }, 0),
            totalPlatformFees: data.jobs
              .filter((j: Job) => j.status === 'PAID')
              .reduce((sum: number, j: Job) => sum + Number(j.platform_fee), 0),
          };
          setStats(s);
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function triggerEscalation() {
    setEscalating(true);
    try {
      const res = await fetch('/api/jobs/escalate', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        showToast(`${data.escalatedCount} job(s) escalated`, 'success');
        fetchJobs();
      } else {
        showToast('Escalation failed', 'error');
      }
    } catch (err) {
      console.error('Escalation error:', err);
      showToast('Escalation failed', 'error');
    } finally {
      setEscalating(false);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
          <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const dashTitle =
    user?.role === 'admin' ? 'Admin Dashboard' :
    user?.role === 'worker' ? 'Available Jobs' :
    'My Emergencies';

  const dashSubtitle =
    user?.role === 'admin' ? 'Real-time overview of all emergency jobs' :
    user?.role === 'worker' ? 'Emergency requests that you can accept and fulfill' :
    'Track your emergency repair requests';

  return (
    <div className="dash-page">
      <div className="dash-page-inner">
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="dash-header">
          <div className="dash-header-top">
            <div>
              <p className="dash-greeting">{getGreeting()}, {user?.name || 'there'} 👋</p>
              <h1 className="dash-title">{dashTitle}</h1>
              <p className="dash-subtitle">{dashSubtitle}</p>
            </div>
            <div className="dash-actions">
              <button className="dash-btn-refresh" onClick={fetchJobs}>
                <span className="refresh-icon">↻</span> Refresh
              </button>
              {user?.role === 'admin' && (
                <button
                  className="dash-btn-accent"
                  onClick={triggerEscalation}
                  disabled={escalating}
                >
                  {escalating ? (
                    <><span className="spinner"></span> Escalating...</>
                  ) : (
                    '⚡ Trigger Escalation'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dash-stats">
          <div className="dash-stat dash-stat--blue">
            <div className="dash-stat-header">
              <div className="dash-stat-icon">📊</div>
            </div>
            <div className="dash-stat-value">{stats.total}</div>
            <div className="dash-stat-label">Total Jobs</div>
          </div>

          <div className="dash-stat dash-stat--amber">
            <div className="dash-stat-header">
              <div className="dash-stat-icon">⏳</div>
            </div>
            <div className="dash-stat-value">{stats.open}</div>
            <div className="dash-stat-label">Open</div>
          </div>

          <div className="dash-stat dash-stat--indigo">
            <div className="dash-stat-header">
              <div className="dash-stat-icon">✅</div>
            </div>
            <div className="dash-stat-value">{stats.accepted}</div>
            <div className="dash-stat-label">Accepted</div>
          </div>

          {user?.role === 'admin' && (
            <div className="dash-stat dash-stat--emerald">
              <div className="dash-stat-header">
                <div className="dash-stat-icon">💰</div>
              </div>
              <div className="dash-stat-value">€{stats.totalPlatformFees.toFixed(2)}</div>
              <div className="dash-stat-label">Platform Revenue</div>
            </div>
          )}
          {user?.role === 'worker' && (
            <div className="dash-stat dash-stat--emerald">
              <div className="dash-stat-header">
                <div className="dash-stat-icon">💰</div>
              </div>
              <div className="dash-stat-value">€{stats.totalRevenue.toFixed(2)}</div>
              <div className="dash-stat-label">My Earnings</div>
            </div>
          )}
          {user?.role === 'customer' && (
            <div className="dash-stat dash-stat--rose">
              <div className="dash-stat-header">
                <div className="dash-stat-icon">💳</div>
              </div>
              <div className="dash-stat-value">€{stats.totalRevenue.toFixed(2)}</div>
              <div className="dash-stat-label">Total Spent</div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="dash-tabs">
          {['', 'OPEN', 'ACCEPTED', 'PAID', 'CANCELLED'].map((status) => (
            <button
              key={status}
              className={`dash-tab ${statusFilter === status ? 'dash-tab--active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {status || 'All Jobs'}
            </button>
          ))}
        </div>

        {/* Jobs Table */}
        {jobs.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">📋</div>
            <h3>No jobs found</h3>
            <p>
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} jobs at the moment.`
                : 'No jobs have been created yet. Submit your first emergency request!'}
            </p>
          </div>
        ) : (
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Customer</th>
                  <th>Worker</th>
                  <th>Status</th>
                  <th>{user?.role === 'worker' ? 'Payout' : 'Price'}</th>
                  {user?.role === 'admin' && <th>Fee (20%)</th>}
                  <th>Escalations</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span style={{
                          width: '32px', height: '32px', borderRadius: 'var(--radius-md)',
                          background: 'var(--blue-50)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0,
                        }}>
                          {job.categories?.icon}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                          {job.categories?.name}
                        </span>
                      </span>
                    </td>
                    <td>
                      {job.customers ? (
                        <div className="dash-user-cell">
                          <div className={`dash-avatar dash-avatar--${getAvatarColor(job.customers.name)}`}>
                            {getInitials(job.customers.name)}
                          </div>
                          <div>
                            <div className="dash-user-name">{job.customers.name}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-300)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {job.workers ? (
                        <div className="dash-user-cell">
                          <div className={`dash-avatar dash-avatar--${getAvatarColor(job.workers.name)}`}>
                            {getInitials(job.workers.name)}
                          </div>
                          <div>
                            <div className="dash-user-name">{job.workers.name}</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-300)', fontSize: 'var(--fs-xs)' }}>Unassigned</span>
                      )}
                    </td>
                    <td>
                      <span className={`dash-badge dash-badge--${job.status.toLowerCase()}`}>
                        {job.status}
                      </span>
                    </td>
                    <td>
                      {user?.role === 'worker' ? (
                        <span className="dash-price dash-price--success">€{Number(job.worker_payout).toFixed(2)}</span>
                      ) : (
                        <span className="dash-price dash-price--muted">€{Number(job.current_price).toFixed(2)}</span>
                      )}
                    </td>
                    {user?.role === 'admin' && (
                      <td>
                        <span className="dash-price dash-price--primary">€{Number(job.platform_fee).toFixed(2)}</span>
                      </td>
                    )}
                    <td>
                      {job.escalation_count > 0 ? (
                        <span className="dash-badge dash-badge--escalation">↑ {job.escalation_count}×</span>
                      ) : (
                        <span style={{ color: 'var(--gray-300)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
                      {formatDate(job.created_at)}
                    </td>
                    <td>
                      <a href={`/job/${job.id}`} className="dash-view-btn">
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
