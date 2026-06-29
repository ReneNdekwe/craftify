'use client';

import { useState, useEffect } from 'react';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { useAuth } from '@/lib/auth-context';

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export default function RequestPage() {
  const { user } = useAuth();
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
    price: '',
    severity: 'MEDIUM',
  });
  
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<{ severity: string; text: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: user.name || prev.customerName,
        customerEmail: user.email || prev.customerEmail,
        customerPhone: user.phone || prev.customerPhone,
      }));
    }
  }, [user]);

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
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toString();
          const lon = position.coords.longitude.toString();
          
          try {
            // Reverse geocode to get the address string
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            
            if (data && data.display_name) {
              setFormData({
                ...formData,
                address: data.display_name,
                latitude: lat,
                longitude: lon,
              });
            } else {
              setFormData({ ...formData, latitude: lat, longitude: lon, address: 'Location found' });
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
            setFormData({ ...formData, latitude: lat, longitude: lon, address: 'Location found' });
          } finally {
            setLoading(false);
          }
        },
        () => {
          setLoading(false);
          alert('Could not get your location. Please type your address manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  async function handleAiAnalyze() {
    if (!formData.description || formData.description.length < 10) {
      setError('Please provide a bit more detail in the description first.');
      return;
    }

    setAiAnalyzing(true);
    setError(null);
    setAiReasoning(null);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });

      const data = await res.json();

      if (data.success && data.analysis) {
        const { categoryId, severity, suggestedPrice, reasoning } = data.analysis;
        
        setFormData(prev => ({
          ...prev,
          categoryId: categoryId,
          price: suggestedPrice.toString(),
          severity: severity
        }));
        
        setAiReasoning({ severity, text: reasoning });
      } else {
        setError(data.error || 'AI analysis failed.');
      }
    } catch (err) {
      console.error('AI Error:', err);
      setError('Network error during AI analysis.');
    } finally {
      setAiAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.latitude || !formData.longitude) {
      setError('Please select a valid address from the dropdown suggestions so we can find your exact location.');
      return;
    }

    setLoading(true);
    setError(null);

    const submitData = {
      ...formData,
      latitude: formData.latitude,
      longitude: formData.longitude,
      price: parseFloat(formData.price),
      severity: formData.severity,
    };

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to initialize payment');
        setLoading(false);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  // We removed the success state here because Stripe redirects to /request/success 

  return (
    <div className="page-container">
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div className="text-center mb-8">
          <h1 style={{ fontSize: 'var(--fs-3xl)' }}>
            Request a Pro
          </h1>
          <p className="mt-2">
            Describe your repair needs and we&apos;ll dispatch the nearest available professional.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-glass">
          {error && (
            <div className="toast toast-error" style={{ position: 'relative', top: 0, right: 0, marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          {/* Contact Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>Your Details</h3>
            {user && (
              <span className="badge badge-success">Logged in as {user.name}</span>
            )}
          </div>

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
                readOnly={!!user}
                style={{ opacity: user ? 0.8 : 1, backgroundColor: user ? 'var(--gray-50)' : 'white' }}
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
                readOnly={!!user}
                style={{ opacity: user ? 0.8 : 1, backgroundColor: user ? 'var(--gray-50)' : 'white' }}
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
              readOnly={!!user}
              style={{ opacity: user ? 0.8 : 1, backgroundColor: user ? 'var(--gray-50)' : 'white' }}
            />
          </div>

          {/* Repair Details */}
          <h3 className="mb-4 mt-6" style={{ fontSize: 'var(--fs-lg)' }}>Repair Details</h3>

          <div className="form-group">
            <label className="form-label" htmlFor="description">What&apos;s the issue?</label>
            <textarea
              id="description"
              name="description"
              className="form-textarea"
              placeholder="e.g., My basement is flooding and water is everywhere!"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
            />
            
            <button
              type="button"
              className="btn btn-outline-primary mt-2 w-full"
              onClick={handleAiAnalyze}
              disabled={aiAnalyzing}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'linear-gradient(to right, rgba(59,130,246,0.1), rgba(168,85,247,0.1))', borderColor: 'var(--blue-200)' }}
            >
              {aiAnalyzing ? (
                <><span className="spinner"></span> Analyzing...</>
              ) : (
                <>✨ Analyze with AI (Auto-fill Category & Price)</>
              )}
            </button>
          </div>

          {aiReasoning && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <strong>AI Analysis Complete</strong>
                <span className={`badge ${aiReasoning.severity === 'CRITICAL' || aiReasoning.severity === 'HIGH' ? 'badge-cancelled' : 'badge-open'}`}>
                  {aiReasoning.severity} SEVERITY
                </span>
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--gray-800)' }}>{aiReasoning.text}</p>
            </div>
          )}

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

          <div className="form-group" style={{ marginBottom: 'var(--space-2)' }}>
            <label className="form-label">Address</label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(val) => setFormData(prev => ({ ...prev, address: val }))}
              onSelect={(address, lat, lon) => {
                setFormData(prev => ({
                  ...prev,
                  address,
                  latitude: lat,
                  longitude: lon
                }));
              }}
              placeholder="123 Main Street, Amsterdam"
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

          {/* Pricing Details */}
          <h3 className="mb-4 mt-6" style={{ fontSize: 'var(--fs-lg)' }}>Pricing Details</h3>

          <div style={{
            background: 'var(--blue-50)',
            border: '1px solid var(--blue-100)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}>
            <div className="accept-detail-row" style={{ borderColor: 'var(--blue-100)', borderBottom: '1px solid var(--blue-100)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div>
                <span className="accept-detail-label" style={{ display: 'block', color: 'var(--gray-900)' }}>Dispatch Booking Fee</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--gray-600)' }}>Paid now via card to secure a worker</span>
              </div>
              <span className="accept-detail-value" style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>€19.00</span>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="price" style={{ color: 'var(--gray-900)' }}>Estimated Labor (paid at door)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, color: 'var(--gray-600)' }}>€</span>
                <input
                  id="price"
                  name="price"
                  type="number"
                  className="form-input"
                  placeholder="150"
                  min="0"
                  max="5000"
                  step="1"
                  value={formData.price}
                  onChange={handleChange}
                  style={{ flex: 1, background: 'white' }}
                />
              </div>
              <p className="form-hint" style={{ marginTop: 'var(--space-2)' }}>
                {formData.price 
                  ? "This is an estimate. You will pay the handworker directly for actual labor and materials upon completion."
                  : "Use the AI button above to get an estimate based on German market rates."}
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-xl w-full"
            disabled={loading}
            id="submit-request-btn"
          >
            {loading ? (
              <><span className="spinner"></span> Dispatching...</>
            ) : (
              'Submit Request'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
