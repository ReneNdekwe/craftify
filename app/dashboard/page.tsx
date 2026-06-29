'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

interface DashboardStats {
  total: number;
  open: number;
  accepted: number;
  paid: number;
  cancelled: number;
  totalPlatformRevenue: number;
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

interface KycRecord {
  worker_id: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  id_url: string | null;
  license_url: string | null;
  insurance_url: string | null;
}

interface Worker {
  id: string;
  name: string;
  email: string;
  status: string;
  kyc?: KycRecord | KycRecord[] | null;
}

const KYC_DOCS = [
  { key: 'id' as const, label: 'Government ID', field: 'id_url' as const, icon: '🪪' },
  { key: 'license' as const, label: 'Trade License', field: 'license_url' as const, icon: '📜' },
  { key: 'insurance' as const, label: 'Insurance Proof', field: 'insurance_url' as const, icon: '🛡️' },
];

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function AdminDashboardView({ jobs, workers, fetchJobs }: { jobs: Job[], workers: Worker[], fetchJobs: () => void }) {
  const totalGrossVolume = jobs.filter(j => j.status === 'PAID').reduce((sum, j) => sum + Number(j.current_price || j.base_price), 0);
  const platformRevenue = jobs.filter(j => j.status === 'PAID').reduce((sum, j) => sum + Number(j.platform_fee || 0), 0);
  const openJobs = jobs.filter(j => j.status === 'OPEN').length;
  const escalatedJobs = jobs.filter(j => j.escalation_count > 0).length;
  
  const activeWorkers = workers.filter(w => w.status === 'ACTIVE').length;
  
  // A worker is pending KYC if their kyc record is 'PENDING'
  const pendingKycWorkers = workers.filter(w => {
    const kyc = Array.isArray(w.kyc) ? w.kyc[0] : w.kyc;
    return kyc?.status === 'PENDING' && kyc.id_url && kyc.license_url && kyc.insurance_url;
  });

  const recentJobs = [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <div className="dash-page-inner">
      <div className="dash-header">
        <div className="dash-header-top">
          <div>
            <p className="dash-greeting">{getGreeting()}, Admin 👋</p>
            <h1 className="dash-title">Business Operations</h1>
            <p className="dash-subtitle">Real-time overview of your platform health and financials</p>
          </div>
          <div className="dash-actions">
            <button className="dash-btn-refresh" onClick={fetchJobs}>
              <span className="refresh-icon">↻</span> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="dash-stats">
        <div className="dash-stat dash-stat--emerald">
          <div className="dash-stat-header">
            <div className="dash-stat-icon">📈</div>
          </div>
          <div className="dash-stat-value">€{totalGrossVolume.toFixed(2)}</div>
          <div className="dash-stat-label">Total Gross Volume</div>
        </div>
        <div className="dash-stat dash-stat--blue">
          <div className="dash-stat-header">
            <div className="dash-stat-icon">💰</div>
          </div>
          <div className="dash-stat-value">€{platformRevenue.toFixed(2)}</div>
          <div className="dash-stat-label">Platform Revenue</div>
        </div>
        <div className="dash-stat dash-stat--amber">
          <div className="dash-stat-header">
            <div className="dash-stat-icon">👷</div>
          </div>
          <div className="dash-stat-value">{activeWorkers} / {workers.length}</div>
          <div className="dash-stat-label">Active Workers</div>
        </div>
        <div className="dash-stat dash-stat--indigo">
          <div className="dash-stat-header">
            <div className="dash-stat-icon">⚠️</div>
          </div>
          <div className="dash-stat-value">{escalatedJobs}</div>
          <div className="dash-stat-label">Escalated Jobs</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)', marginTop: 'var(--space-6)' }}>
        {/* Main Feed Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--gray-200)' }}>
            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, marginBottom: 'var(--space-4)', color: 'var(--gray-900)' }}>Latest Jobs</h2>
            {recentJobs.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: 'var(--fs-sm)' }}>No jobs found on the platform yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {recentJobs.map(job => (
                  <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', background: 'var(--gray-50)', borderRadius: 'var(--radius-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span style={{ fontSize: '1.5rem', background: 'var(--blue-50)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>{job.categories?.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--gray-900)' }}>{job.categories?.name} - {job.address.split(',')[0]}</div>
                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-500)' }}>{formatDate(job.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className={`dash-badge dash-badge--${job.status.toLowerCase()}`}>{job.status}</span>
                      <a href={`/job/${job.id}`} className="dash-view-btn">View</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
              <button className="btn btn-ghost" onClick={() => window.location.href = '/dashboard?tab=jobs'}>View All Jobs</button>
            </div>
          </div>
          
        </div>

        {/* Sidebar Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          
          {/* Action Required: Pending KYC */}
          <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-xs)', border: '1px solid var(--gray-200)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: 'var(--gray-900)' }}>KYC Approvals</h2>
            </div>
            
            {pendingKycWorkers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingKycWorkers.map(w => (
                  <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--gray-100)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{w.name}</div>
                      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-500)' }}>Documents uploaded</div>
                    </div>
                    <a href="/workers" className="dash-btn-accent" style={{ fontSize: 'var(--fs-xs)', padding: '4px 10px', textDecoration: 'none' }}>Review</a>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--gray-400)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: 'var(--space-4) 0' }}>All caught up! No pending KYCs.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, open: 0, accepted: 0, paid: 0, cancelled: 0,
    totalPlatformRevenue: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // KYC state (workers only)
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    // Determine if we should show the jobs tab from URL (for admin)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('tab') === 'jobs') {
        setStatusFilter('OPEN'); // or just not empty to show jobs
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    fetchJobs();
    if (user?.role === 'worker') fetchKyc();
    if (user?.role === 'admin') fetchWorkers();
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, user, authLoading]);

  async function fetchKyc() {
    if (!user?.id) return;
    setKycLoading(true);
    try {
      const res = await fetch(`/api/kyc?workerId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (data.kyc) setKyc(data.kyc);
    } catch (err) {
      console.error('Failed to fetch KYC:', err);
    } finally {
      setKycLoading(false);
    }
  }

  async function fetchWorkers() {
    try {
      const res = await fetch('/api/workers');
      const data = await res.json();
      if (data.workers) setWorkers(data.workers);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    }
  }

  async function handleKycUpload(docType: string, file: File) {
    if (!user?.id) return;
    setUploadingDoc(docType);
    try {
      const fd = new FormData();
      fd.append('workerId', user.id);
      fd.append('docType', docType);
      fd.append('file', file);
      const res = await fetch('/api/kyc', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.kyc) {
        setKyc(data.kyc);
        showToast(`${docType === 'id' ? 'Government ID' : docType === 'license' ? 'Trade License' : 'Insurance'} uploaded`, 'success');
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploadingDoc(null);
    }
  }

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
            totalPlatformRevenue: data.jobs
              .filter((j: Job) => j.status === 'PAID')
              .reduce((sum: number, j: Job) => sum + Number(j.platform_fee || 0), 0),
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

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  // If Admin and NO status filter selected, show operations overview
  // (If they pick a status filter, it'll show the regular jobs table so they can still browse jobs)
  if (user?.role === 'admin' && !statusFilter) {
    return (
      <div className="dash-page">
        <AdminDashboardView jobs={jobs} workers={workers} fetchJobs={fetchJobs} />
        {/* We still render tabs so admin can switch to table view */}
        <div className="dash-page-inner" style={{ paddingTop: 0 }}>
          <div className="dash-tabs" style={{ marginTop: 'var(--space-6)' }}>
            {['', 'OPEN', 'ACCEPTED', 'PAID', 'CANCELLED'].map((status) => (
              <button
                key={status}
                className={`dash-tab ${statusFilter === status ? 'dash-tab--active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status ? status : 'Operations Overview'}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const dashTitle =
    user?.role === 'admin' ? 'Job Feed' :
    user?.role === 'worker' ? 'Available Jobs' :
    'My Emergencies';

  const dashSubtitle =
    user?.role === 'admin' ? 'Browse all platform jobs' :
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
              {user ? (
                <>
                  <p className="dash-greeting">{getGreeting()}, {user?.name || 'there'} 👋</p>
                  <h1 className="dash-title">{dashTitle}</h1>
                  <p className="dash-subtitle">{dashSubtitle}</p>
                </>
              ) : (
                <>
                  <h1 className="dash-title">Available Local Jobs</h1>
                  <p className="dash-subtitle">Explore open repair requests in your area. Sign up as a worker to accept them.</p>
                </>
              )}
            </div>
            <div className="dash-actions">
              <button className="dash-btn-refresh" onClick={fetchJobs}>
                <span className="refresh-icon">↻</span> Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KYC Section — Workers Only */}
        {user?.role === 'worker' && (
          <div style={{
            marginBottom: 'var(--space-6)',
            padding: 'var(--space-6)',
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--gray-200)',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
              <div>
                <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 800, color: 'var(--gray-900)' }}>🛡️ KYC Verification</h2>
                <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-500)', marginTop: '2px' }}>
                  Upload your documents to get verified and start accepting jobs.
                </p>
              </div>
              {kyc && (
                <span className={`kyc-badge kyc-badge--${kyc.status.toLowerCase()}`} style={{ fontSize: 'var(--fs-xs)' }}>
                  {kyc.status === 'VERIFIED' ? '✅ Verified' : kyc.status === 'REJECTED' ? '❌ Rejected' : '⏳ Pending Review'}
                </span>
              )}
            </div>

            {kycLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <div className="spinner" style={{ margin: '0 auto' }}></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
                {KYC_DOCS.map(doc => {
                  const url = kyc?.[doc.field] || null;
                  const isUploading = uploadingDoc === doc.key;
                  return (
                    <div
                      key={doc.key}
                      style={{
                        padding: 'var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${url ? '#bbf7d0' : 'var(--gray-200)'}`,
                        background: url ? '#f0fdf4' : 'var(--gray-50)',
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{doc.icon}</div>
                      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--gray-900)', marginBottom: 'var(--space-1)' }}>
                        {doc.label}
                      </div>
                      {url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: 'var(--fs-xs)', color: '#15803d', fontWeight: 600 }}>✓ Uploaded</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 'var(--fs-xs)', padding: '2px 10px' }}
                            onClick={() => fileInputRefs.current[doc.key]?.click()}
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 'var(--fs-xs)', padding: '4px 14px', marginTop: 'var(--space-2)' }}
                          onClick={() => fileInputRefs.current[doc.key]?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                      )}
                      <input
                        ref={el => { fileInputRefs.current[doc.key] = el; }}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleKycUpload(doc.key, file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {kyc && kyc.id_url && kyc.license_url && kyc.insurance_url && kyc.status === 'PENDING' && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent)', fontWeight: 600, marginTop: 'var(--space-4)', textAlign: 'center' }}>
                All documents uploaded — your verification is under review.
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        {user && (
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
                <div className="dash-stat-value">€{stats.totalPlatformRevenue.toFixed(2)}</div>
                <div className="dash-stat-label">Platform Revenue</div>
              </div>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        {user && (
          <div className="dash-tabs">
            {/* If admin, the first tab goes back to Operations Overview */}
            {user.role === 'admin' && (
              <button
                className={`dash-tab ${statusFilter === '' ? 'dash-tab--active' : ''}`}
                onClick={() => setStatusFilter('')}
              >
                Operations Overview
              </button>
            )}
            
            {(user.role === 'admin' ? ['OPEN', 'ACCEPTED', 'PAID', 'CANCELLED'] : ['', 'OPEN', 'ACCEPTED', 'PAID', 'CANCELLED']).map((status) => (
              <button
                key={status}
                className={`dash-tab ${statusFilter === status ? 'dash-tab--active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status || 'All Jobs'}
              </button>
            ))}
          </div>
        )}

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
                  <th>Base Price</th>
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
                      <span className="dash-price dash-price--muted">€{Number(job.base_price).toFixed(2)}</span>
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
