'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Category {
  id: string;
  name: string;
  icon: string;
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function openCreateModal() {
    setEditingWorker(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function openEditModal(worker: Worker) {
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
  const avgRating = workers.length > 0
    ? (workers.reduce((sum, w) => sum + Number(w.rating), 0) / workers.length).toFixed(1)
    : '—';
  const totalCompleted = workers.reduce((sum, w) => sum + w.jobs_completed, 0);

  if (loading || authLoading || user?.role !== 'admin') {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: '6rem' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }}></div>
        <p className="mt-4" style={{ color: 'var(--gray-400)' }}>
          {authLoading ? 'Verifying access...' : 'Loading workers...'}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container-wide">
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: 'var(--fs-3xl)' }}>Worker Management</h1>
          <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--space-1)' }}>
            Manage your team of emergency service professionals
          </p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={openCreateModal} id="add-worker-btn">
          + Add Worker
        </button>
      </div>

      {/* Stats */}
      <div className="grid-4 mb-8">
        <div className="card-stat">
          <div className="stat-value">{workers.length}</div>
          <div className="stat-label">Total Workers</div>
        </div>
        <div className="card-stat">
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="card-stat">
          <div className="stat-value" style={{ color: 'var(--blue-500)' }}>⭐ {avgRating}</div>
          <div className="stat-label">Avg Rating</div>
        </div>
        <div className="card-stat">
          <div className="stat-value" style={{ color: 'var(--blue-600)' }}>{totalCompleted}</div>
          <div className="stat-label">Jobs Completed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
        <div className="flex gap-2">
          {['', 'ACTIVE', 'INACTIVE'].map((status) => (
            <button
              key={status}
              className={`btn ${statusFilter === status ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === '' ? 'All' : status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </button>
          ))}
        </div>
        <select
          className="form-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ maxWidth: '250px' }}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
          ))}
        </select>
      </div>

      {/* Workers Grid */}
      {workers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👷</div>
          <h3>No workers found</h3>
          <p>
            {statusFilter || categoryFilter
              ? 'No workers match the current filters.'
              : 'Get started by adding your first worker.'}
          </p>
          {!statusFilter && !categoryFilter && (
            <button className="btn btn-primary mt-6" onClick={openCreateModal}>
              + Add Your First Worker
            </button>
          )}
        </div>
      ) : (
        <div className="grid-3">
          {workers.map((worker) => (
            <div key={worker.id} className="card" style={{ cursor: 'default' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: worker.status === 'ACTIVE' ? 'var(--blue-50)' : 'var(--gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>
                    {worker.categories?.icon || '🛠️'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 'var(--fs-base)', marginBottom: '2px' }}>{worker.name}</h4>
                    <span className={`badge badge-${worker.status.toLowerCase()}`}>
                      {worker.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-500)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ width: '16px', textAlign: 'center' }}>📧</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{worker.email}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ width: '16px', textAlign: 'center' }}>📱</span>
                  <span>{worker.phone}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ width: '16px', textAlign: 'center' }}>🏷️</span>
                  <span>{worker.categories?.name || 'Uncategorized'}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ width: '16px', textAlign: 'center' }}>⭐</span>
                  <span>{Number(worker.rating).toFixed(1)}/5 · {worker.jobs_completed} jobs</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ width: '16px', textAlign: 'center' }}>📍</span>
                  <span className="font-mono" style={{ fontSize: 'var(--fs-xs)' }}>
                    {worker.latitude.toFixed(3)}, {worker.longitude.toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-4" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 'var(--space-4)' }}>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1, fontSize: 'var(--fs-xs)' }}
                  onClick={() => openEditModal(worker)}
                >
                  Edit
                </button>
                <button
                  className={`btn ${worker.status === 'ACTIVE' ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ flex: 1, fontSize: 'var(--fs-xs)' }}
                  onClick={() => toggleWorkerStatus(worker)}
                >
                  {worker.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingWorker ? 'Edit Worker' : 'Add Worker'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

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
                  <input id="modal-phone" name="phone" type="tel" className="form-input" placeholder="+31 6 12345678" value={formData.phone} onChange={handleChange} required />
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

              <div className="flex gap-4 mt-6">
                <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving} id="save-worker-btn">
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
      )}

      {/* Footer */}
      <div style={{
        marginTop: 'var(--space-8)',
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--color-border)',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
          {workers.length} worker{workers.length !== 1 ? 's' : ''} total · {activeCount} active · {inactiveCount} inactive
        </p>
      </div>
    </div>
  );
}
