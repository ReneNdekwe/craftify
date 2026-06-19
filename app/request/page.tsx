'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function RequestPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ jobId: string; workersNotified: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    categoryId: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    price: '150',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([
        { id: 'demo-1', name: 'Plumber', icon: '🔧', description: 'Pipe repairs, leaks' },
        { id: 'demo-2', name: 'Electrician', icon: '⚡', description: 'Electrical faults' },
        { id: 'demo-3', name: 'Locksmith', icon: '🔑', description: 'Lockouts' },
        { id: 'demo-4', name: 'HVAC', icon: '❄️', description: 'Heating/AC repairs' },
        { id: 'demo-5', name: 'Glass Repair', icon: '🪟', description: 'Broken windows' },
        { id: 'demo-6', name: 'General Handyman', icon: '🛠️', description: 'General repairs' },
      ]);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleGetLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
        },
        () => {
          setFormData({ ...formData, latitude: '52.3676', longitude: '4.9041' });
        }
      );
    } else {
      setFormData({ ...formData, latitude: '52.3676', longitude: '4.9041' });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const submitData = {
      ...formData,
      latitude: formData.latitude || '52.3676',
      longitude: formData.longitude || '4.9041',
      price: parseFloat(formData.price),
    };

    try {
      const res = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        setResult({
          jobId: data.job.id,
          workersNotified: data.workersNotified,
          message: data.message,
        });
      } else {
        setError(data.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (submitted && result) {
    return (
      <div className="page-container">
        <div className="accept-container">
          <div className="accept-card">
            <div className="accept-header" style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
              <h1>Request Submitted</h1>
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
                <span className="accept-detail-label">Workers Notified</span>
                <span className="accept-detail-value">{result.workersNotified}</span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Status</span>
                <span className="badge badge-open">OPEN</span>
              </div>
              <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)', color: 'var(--gray-500)' }}>
                {result.message}
              </p>
              <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--gray-400)' }}>
                If no worker accepts within 5 minutes, the price will automatically increase by €75 to attract more workers.
              </p>
            </div>
            <div className="accept-actions" style={{ display: 'flex', gap: 'var(--space-4)' }}>
              <a href={`/job/${result.jobId}`} className="btn btn-primary w-full" style={{ textAlign: 'center' }}>
                Track Job Status
              </a>
              <button
                className="btn btn-ghost w-full"
                onClick={() => {
                  setSubmitted(false);
                  setResult(null);
                  setFormData({
                    customerName: formData.customerName,
                    customerEmail: formData.customerEmail,
                    customerPhone: formData.customerPhone,
                    categoryId: '',
                    description: '',
                    address: '',
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    price: '150',
                  });
                }}
              >
                New Request
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: 'var(--fs-3xl)' }}>
            Emergency Request
          </h1>
          <p className="mt-2">
            Describe your emergency and we&apos;ll dispatch the nearest available professional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-glass">
          {error && (
            <div className="toast toast-error" style={{ position: 'relative', top: 0, right: 0, marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          {/* Contact Info */}
          <h3 className="mb-4" style={{ fontSize: 'var(--fs-lg)' }}>Your Details</h3>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="customerName">Full Name</label>
              <input
                id="customerName"
                name="customerName"
                type="text"
                className="form-input"
                placeholder="John Smith"
                value={formData.customerName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="customerPhone">Phone</label>
              <input
                id="customerPhone"
                name="customerPhone"
                type="tel"
                className="form-input"
                placeholder="+31 6 12345678"
                value={formData.customerPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="customerEmail">Email</label>
            <input
              id="customerEmail"
              name="customerEmail"
              type="email"
              className="form-input"
              placeholder="john@example.com"
              value={formData.customerEmail}
              onChange={handleChange}
              required
            />
          </div>

          {/* Emergency Details */}
          <h3 className="mb-4 mt-6" style={{ fontSize: 'var(--fs-lg)' }}>Emergency Details</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="categoryId">Category</label>
            <select
              id="categoryId"
              name="categoryId"
              className="form-select"
              value={formData.categoryId}
              onChange={handleChange}
              required
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name} — {cat.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">What&apos;s the emergency?</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="Describe your emergency in detail..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              className="form-input"
              placeholder="123 Main Street, Amsterdam"
              value={formData.address}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              className="btn btn-ghost mt-2"
              onClick={handleGetLocation}
              style={{ fontSize: 'var(--fs-xs)' }}
            >
              📍 Use my current location
            </button>
          </div>

          {/* Price */}
          <h3 className="mb-4 mt-6" style={{ fontSize: 'var(--fs-lg)' }}>Starting Price</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="price">Offered Price (€)</label>
            <input
              id="price"
              name="price"
              type="number"
              className="form-input"
              placeholder="150"
              min="50"
              max="900"
              step="25"
              value={formData.price}
              onChange={handleChange}
              required
            />
            <p className="form-hint">
              Minimum €50. If no worker accepts, the price increases by €75 every 5 minutes (max €900).
            </p>
          </div>

          {/* Price Breakdown */}
          {formData.price && (
            <div style={{
              background: 'var(--blue-50)',
              border: '1px solid var(--blue-100)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}>
              <div className="accept-detail-row" style={{ borderColor: 'var(--blue-100)' }}>
                <span className="accept-detail-label">Total Price</span>
                <span className="accept-detail-value">€{parseFloat(formData.price).toFixed(2)}</span>
              </div>
              <div className="accept-detail-row" style={{ borderColor: 'var(--blue-100)' }}>
                <span className="accept-detail-label">Platform Fee (20%)</span>
                <span className="accept-detail-value" style={{ color: 'var(--gray-500)' }}>
                  €{(parseFloat(formData.price) * 0.2).toFixed(2)}
                </span>
              </div>
              <div className="accept-detail-row">
                <span className="accept-detail-label">Worker Receives (80%)</span>
                <span className="accept-detail-value" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                  €{(parseFloat(formData.price) * 0.8).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-xl w-full"
            disabled={loading}
            id="submit-request-btn"
          >
            {loading ? (
              <><span className="spinner"></span> Dispatching...</>
            ) : (
              'Submit Emergency Request'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
