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

      // If user is a customer, only request their own jobs
      if (user?.role === 'customer' && user.email) {
        url += (url.includes('?') ? '&' : '?') + `customerEmail=${encodeURIComponent(user.email)}`;
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
              .reduce((sum: number, j: Job) => sum + Number(j.current_price), 0),
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

  function getStatusBadge(status: string) {
    const cls = `badge badge-${status.toLowerCase()}`;
    return <span className={cls}>{status}</span>;
  }

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
        <p className="mt-4" style={{ color: 'var(--gray-400)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: 'var(--fs-3xl)' }}>
            {user?.role === 'admin' && 'Admin Dashboard'}
            {user?.role === 'worker' && 'Available Jobs'}
            {user?.role === 'customer' && 'My Emergencies'}
          </h1>
          <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-1)' }}>
            {user?.role === 'admin' && 'Real-time overview of all emergency jobs'}
            {user?.role === 'worker' && 'Emergency requests that you can accept and fulfill'}
            {user?.role === 'customer' && 'Track your emergency repair requests'}
          </p>
        </div>
        <div className="flex gap-4">
          <button className="btn btn-ghost" onClick={fetchJobs}>
            Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              className="btn btn-primary"
              onClick={triggerEscalation}
              disabled={escalating}
            >
              {escalating ? (
                <><span className="spinner"></span> Escalating...</>
              ) : (
                'Trigger Escalation'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-8">
        <div className="card-stat">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="card-stat">
          <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
            {stats.open}
          </div>
          <div className="stat-label">Open</div>
        </div>
        <div className="card-stat">
          <div className="stat-value" style={{ color: 'var(--blue-500)' }}>
            {stats.accepted}
          </div>
          <div className="stat-label">Accepted</div>
        </div>
        {user?.role === 'admin' && (
          <div className="card-stat">
            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
              €{stats.totalPlatformFees.toFixed(2)}
            </div>
            <div className="stat-label">Platform Revenue</div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {['', 'OPEN', 'ACCEPTED', 'PAID', 'CANCELLED'].map((status) => (
          <button
            key={status}
            className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setStatusFilter(status)}
          >
            {status || 'All Jobs'}
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No jobs found</h3>
          <p>
            {statusFilter
              ? `No ${statusFilter.toLowerCase()} jobs at the moment.`
              : 'No jobs have been created yet. Submit your first emergency request!'}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Customer</th>
                <th>Worker</th>
                <th>Status</th>
                <th>Price</th>
                {user?.role === 'admin' && <th>Fee (20%)</th>}
                <th>Escalations</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {job.categories?.icon} {job.categories?.name}
                    </span>
                  </td>
                  <td>{job.customers?.name || '—'}</td>
                  <td>
                    {job.workers?.name || (
                      <span style={{ color: 'var(--gray-300)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>{getStatusBadge(job.status)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                    €{Number(job.current_price).toFixed(2)}
                  </td>
                  {user?.role === 'admin' && (
                    <td style={{ color: 'var(--color-primary)' }}>
                      €{Number(job.platform_fee).toFixed(2)}
                    </td>
                  )}
                  <td>
                    {job.escalation_count > 0 ? (
                      <span className="badge badge-open">↑ {job.escalation_count}x</span>
                    ) : (
                      <span style={{ color: 'var(--gray-300)' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
                    {formatDate(job.created_at)}
                  </td>
                  <td>
                    <a
                      href={`/job/${job.id}`}
                      className="btn btn-ghost"
                      style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'var(--fs-xs)' }}
                    >
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
  );
}
