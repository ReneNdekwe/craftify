'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface KycData {
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  id_url: string | null;
  license_url: string | null;
  insurance_url: string | null;
}

interface Worker {
  id: string;
  name: string;
  email: string;
  phone: string;
  category_id: string;
  latitude: number;
  longitude: number;
  status: 'ACTIVE' | 'INACTIVE';
  stripe_account_id: string | null;
  rating: number;
  jobs_completed: number;
  created_at: string;
  categories: { name: string; icon: string } | null;
  kyc?: KycData | KycData[] | null;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  categoryId: '',
  latitude: '52.3676',
  longitude: '4.9041',
  stripeAccountId: '',
};

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarClass(categoryName: string | undefined) {
  if (!categoryName) return 'dash-worker-avatar--default';
  const lower = categoryName.toLowerCase();
  if (lower.includes('plumb')) return 'dash-worker-avatar--plumber';
  if (lower.includes('electr')) return 'dash-worker-avatar--electrician';
  if (lower.includes('lock')) return 'dash-worker-avatar--locksmith';
  if (lower.includes('hvac') || lower.includes('heat') || lower.includes('cool')) return 'dash-worker-avatar--hvac';
  return 'dash-worker-avatar--default';
}

function deriveKyc(worker: Worker): KycData {
  const kyc = Array.isArray(worker.kyc) ? worker.kyc[0] : worker.kyc;
  if (kyc) return kyc;
  return { status: 'PENDING', id_url: null, license_url: null, insurance_url: null };
}

function KycBadge({ kyc }: { kyc: KycData }) {
  const config = {
    VERIFIED: { label: 'Verified', icon: '✅', cls: 'kyc-badge--verified' },
    PENDING:  { label: 'Pending',  icon: '⏳', cls: 'kyc-badge--pending' },
    REJECTED: { label: 'Rejected', icon: '❌', cls: 'kyc-badge--rejected' },
  };
  const c = config[kyc.status];
  return (
    <span className={`kyc-badge ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  );
}

function KycChecklist({ kyc }: { kyc: KycData }) {
  const items = [
    { label: 'Government ID', done: !!kyc.id_url },
    { label: 'Trade License', done: !!kyc.license_url },
    { label: 'Insurance', done: !!kyc.insurance_url },
  ];
  return (
    <div className="kyc-checklist">
      {items.map(item => (
        <div key={item.label} className={`kyc-check-item ${item.done ? 'kyc-check-item--done' : ''}`}>
          <span className="kyc-check-icon">{item.done ? '✓' : '○'}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const stars = [];
  const rounded = Math.round(Number(rating) * 2) / 2;
  for (let i = 1; i <= 5; i++) {
    if (i <= rounded) {
      stars.push(<span key={i} className="dash-star dash-star--filled">★</span>);
    } else if (i - 0.5 === rounded) {
      stars.push(<span key={i} className="dash-star dash-star--half">★</span>);
    } else {
      stars.push(<span key={i} className="dash-star">★</span>);
    }
  }
  return <span className="dash-stars">{stars}</span>;
}

export default function WorkersPage() {
  const { user, loading: authLoading } = useAuth();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [kycFilter, setKycFilter] = useState<string>('');
  const [reviewingKyc, setReviewingKyc] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== 'admin') {
      window.location.href = '/dashboard';
      return;
    }
    fetchWorkers();
    fetchCategories();
  }, [authLoading, user]);

  async function fetchWorkers() {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('categoryId', categoryFilter);
      const url = `/api/workers${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.workers) setWorkers(data.workers);
    } catch (err) {
      console.error('Failed to fetch workers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([
        { id: 'demo-1', name: 'Plumber', icon: '🔧' },
        { id: 'demo-2', name: 'Electrician', icon: '⚡' },
        { id: 'demo-3', name: 'Locksmith', icon: '🔑' },
        { id: 'demo-4', name: 'HVAC', icon: '❄️' },
      ]);
    }
  }

  useEffect(() => {
    fetchWorkers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      setFormData({ ...formData, [target.name]: target.checked });
    } else {
      setFormData({ ...formData, [target.name]: target.value });
    }
  }

  function openCreateModal() {
    setEditingWorker(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(worker: Worker) {
    const kyc = deriveKyc(worker);
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      email: worker.email,
      phone: worker.phone,
      categoryId: worker.category_id,
      latitude: worker.latitude.toString(),
      longitude: worker.longitude.toString(),
      stripeAccountId: worker.stripe_account_id || '',
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingWorker ? 'PUT' : 'POST';
      const body = editingWorker
        ? {
            id: editingWorker.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            categoryId: formData.categoryId,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            stripeAccountId: formData.stripeAccountId || null,
          }
        : {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            categoryId: formData.categoryId,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
            stripeAccountId: formData.stripeAccountId || null,
          };

      const res = await fetch('/api/workers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        showToast(editingWorker ? 'Worker updated' : 'Worker created', 'success');
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }

      setShowModal(false);
      fetchWorkers();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleWorkerStatus(worker: Worker) {
    const newStatus = worker.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: worker.id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Worker ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`, 'success');
        fetchWorkers();
      }
    } catch (err) {
      console.error('Toggle error:', err);
      showToast('Failed to update status', 'error');
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const activeCount = workers.filter(w => w.status === 'ACTIVE').length;
  const inactiveCount = workers.filter(w => w.status === 'INACTIVE').length;
  const verifiedCount = workers.filter(w => deriveKyc(w).status === 'VERIFIED').length;

  // Apply KYC filter client-side
  const filteredWorkers = kycFilter
    ? workers.filter(w => deriveKyc(w).status === kycFilter)
    : workers;

  if (loading || authLoading || user?.role !== 'admin') {
    return (
      <div className="dash-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
          <p style={{ color: 'var(--gray-400)', marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
            {authLoading ? 'Verifying access...' : 'Loading workers...'}
          </p>
        </div>
      </div>
    );
  }

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
              <h1 className="dash-title">Workers</h1>
              <p className="dash-subtitle" style={{ fontSize: 'var(--fs-sm)', marginTop: '2px' }}>
                {workers.length} total · {verifiedCount} verified
              </p>
            </div>
            <button className="dash-btn-accent" onClick={openCreateModal} id="add-worker-btn">
              + Add Worker
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="dash-stats">
          <div className="dash-stat dash-stat--blue">
            <div className="dash-stat-value">{workers.length}</div>
            <div className="dash-stat-label">Total</div>
          </div>
          <div className="dash-stat dash-stat--emerald">
            <div className="dash-stat-value">{activeCount}</div>
            <div className="dash-stat-label">Active</div>
          </div>
          <div className="dash-stat" style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0' }}>
            <div className="dash-stat-value" style={{ color: '#15803d' }}>{verifiedCount}</div>
            <div className="dash-stat-label">KYC Verified</div>
          </div>
          <div className="dash-stat dash-stat--amber">
            <div className="dash-stat-value">{workers.length - verifiedCount}</div>
            <div className="dash-stat-label">KYC Pending</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="dash-tabs">
            {['', 'ACTIVE', 'INACTIVE'].map((status) => (
              <button
                key={status}
                className={`dash-tab ${statusFilter === status ? 'dash-tab--active' : ''}`}
                onClick={() => setStatusFilter(status)}
              >
                {status === '' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
          <div className="dash-tabs">
            {['', 'VERIFIED', 'PENDING', 'REJECTED'].map((kyc) => (
              <button
                key={kyc}
                className={`dash-tab ${kycFilter === kyc ? 'dash-tab--active' : ''}`}
                onClick={() => setKycFilter(kyc)}
              >
                {kyc === '' ? 'All KYC' : kyc === 'VERIFIED' ? '✅ Verified' : kyc === 'PENDING' ? '⏳ Pending' : '❌ Rejected'}
              </button>
            ))}
          </div>
          <select
            className="form-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ maxWidth: '200px', fontSize: 'var(--fs-sm)', padding: 'var(--space-2) var(--space-3)' }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        </div>

        {/* Workers Grid */}
        {filteredWorkers.length === 0 ? (
          <div className="dash-empty">
            <div className="dash-empty-icon">👷</div>
            <h3>No workers found</h3>
            <p>
              {statusFilter || categoryFilter || kycFilter
                ? 'No workers match the current filters.'
                : 'Get started by adding your first worker.'}
            </p>
            {!statusFilter && !categoryFilter && !kycFilter && (
              <button className="dash-btn-accent mt-6" onClick={openCreateModal}>
                + Add Your First Worker
              </button>
            )}
          </div>
        ) : (
          <div className="dash-workers-grid">
            {filteredWorkers.map((worker, idx) => {
              const kyc = deriveKyc(worker);
              return (
                <div
                  key={worker.id}
                  className="dash-worker-card"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Card header: avatar + name + badges */}
                  <div className="dash-worker-header">
                    <div className={`dash-worker-avatar ${getAvatarClass(worker.categories?.name)}`}>
                      {getInitials(worker.name)}
                    </div>
                    <div className="dash-worker-info">
                      <div className="dash-worker-name">{worker.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <span className="dash-worker-category">
                          {worker.categories?.icon} {worker.categories?.name || 'Uncategorized'}
                        </span>
                        <span className={`dash-badge dash-badge--${worker.status.toLowerCase()}`}>
                          {worker.status}
                        </span>
                        <KycBadge kyc={kyc} />
                      </div>
                    </div>
                  </div>

                  {/* KYC Checklist */}
                  <KycChecklist kyc={kyc} />

                  {/* Contact + stats */}
                  <div className="dash-worker-details">
                    <div className="dash-worker-detail">
                      <span className="dash-worker-detail-icon">📧</span>
                      <span className="dash-worker-detail-text">{worker.email}</span>
                    </div>
                    <div className="dash-worker-detail">
                      <span className="dash-worker-detail-icon">📱</span>
                      <span className="dash-worker-detail-text">{worker.phone}</span>
                    </div>
                    <div className="dash-worker-detail">
                      <span className="dash-worker-detail-icon">⭐</span>
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <StarRating rating={worker.rating} />
                        <span className="dash-worker-rating-text">
                          {Number(worker.rating).toFixed(1)} · {worker.jobs_completed} jobs
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="dash-worker-actions">
                    <button
                      className="dash-worker-action"
                      onClick={() => openEditModal(worker)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={`dash-worker-action ${worker.status === 'ACTIVE' ? 'dash-worker-action--danger' : 'dash-worker-action--primary'}`}
                      onClick={() => toggleWorkerStatus(worker)}
                    >
                      {worker.status === 'ACTIVE' ? '⏸ Deactivate' : '▶ Activate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="dash-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="dash-modal" onClick={(e) => e.stopPropagation()}>
              <div className="dash-modal-header">
                <h2>{editingWorker ? '✏️ Edit Worker' : '➕ Add Worker'}</h2>
                <button className="dash-modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="dash-modal-body">
                <form onSubmit={handleSave}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="modal-name">Full Name</label>
                    <input id="modal-name" name="name" type="text" className="form-input" placeholder="John Smith" value={formData.name} onChange={handleChange} required />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="modal-email">Email</label>
                      <input id="modal-email" name="email" type="email" className="form-input" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="modal-phone">Phone</label>
                      <input id="modal-phone" name="phone" type="tel" className="form-input" placeholder="+49 151 12345678" value={formData.phone} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="modal-category">Category</label>
                    <select id="modal-category" name="categoryId" className="form-select" value={formData.categoryId} onChange={handleChange} required>
                      <option value="">Select category...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label" htmlFor="modal-lat">Latitude</label>
                      <input id="modal-lat" name="latitude" type="number" step="0.0001" className="form-input" value={formData.latitude} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="modal-lng">Longitude</label>
                      <input id="modal-lng" name="longitude" type="number" step="0.0001" className="form-input" value={formData.longitude} onChange={handleChange} required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="modal-stripe">Stripe Account ID</label>
                    <input id="modal-stripe" name="stripeAccountId" type="text" className="form-input" placeholder="acct_xxxxxxxxxxxx (optional)" value={formData.stripeAccountId} onChange={handleChange} />
                    <p className="form-hint">Required for receiving payments via Stripe Connect.</p>
                  </div>

                  {/* KYC Verification Section */}
                  {editingWorker && (
                    <div style={{
                      marginTop: 'var(--space-4)',
                      padding: 'var(--space-5)',
                      background: 'var(--gray-50)',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--gray-200)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                        <h3 style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--gray-900)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          🛡️ KYC Verification
                        </h3>
                        <KycBadge kyc={deriveKyc(editingWorker)} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                          { label: 'Government ID', url: deriveKyc(editingWorker).id_url },
                          { label: 'Trade License', url: deriveKyc(editingWorker).license_url },
                          { label: 'Insurance Proof', url: deriveKyc(editingWorker).insurance_url },
                        ].map((doc, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--fs-sm)', padding: 'var(--space-2)', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)' }}>
                            <span style={{ fontWeight: 500, color: 'var(--gray-700)' }}>{doc.label}</span>
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>View Document ↗</a>
                            ) : (
                              <span style={{ color: 'var(--gray-400)' }}>Missing</span>
                            )}
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ flex: 1, padding: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}
                          disabled={reviewingKyc || deriveKyc(editingWorker).status === 'VERIFIED'}
                          onClick={async () => {
                            setReviewingKyc(true);
                            try {
                              const res = await fetch('/api/kyc/review', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ workerId: editingWorker.id, status: 'VERIFIED' })
                              });
                              if (res.ok) {
                                showToast('KYC Approved!', 'success');
                                fetchWorkers();
                                setShowModal(false);
                              } else showToast('Failed to approve KYC', 'error');
                            } finally { setReviewingKyc(false); }
                          }}
                        >
                          {reviewingKyc ? 'Saving...' : '✅ Approve KYC'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ flex: 1, padding: 'var(--space-2)', fontSize: 'var(--fs-sm)', color: '#dc2626', border: '1px solid #fca5a5' }}
                          disabled={reviewingKyc || deriveKyc(editingWorker).status === 'REJECTED'}
                          onClick={async () => {
                            setReviewingKyc(true);
                            try {
                              const res = await fetch('/api/kyc/review', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ workerId: editingWorker.id, status: 'REJECTED' })
                              });
                              if (res.ok) {
                                showToast('KYC Rejected', 'success');
                                fetchWorkers();
                                setShowModal(false);
                              } else showToast('Failed to reject KYC', 'error');
                            } finally { setReviewingKyc(false); }
                          }}
                        >
                          ❌ Reject KYC
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 mt-6">
                    <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="dash-btn-accent" style={{ flex: 2 }} disabled={saving} id="save-worker-btn">
                      {saving ? (
                        <><span className="spinner"></span> Saving...</>
                      ) : (
                        editingWorker ? 'Update Worker' : 'Add Worker'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="dash-footer-bar">
          <p>
            {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} shown · {activeCount} active · {inactiveCount} inactive · {verifiedCount} verified
          </p>
        </div>
      </div>
    </div>
  );
}
