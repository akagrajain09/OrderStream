import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * OrderForm — create a new order via the REST API.
 * The Change Stream will broadcast the insert back to all clients.
 */
export function OrderForm() {
  const [form, setForm] = useState({ customer_name: '', product_name: '', status: 'pending' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.product_name.trim()) {
      setError('All fields are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccess(`Order created for ${form.customer_name}!`);
      setForm({ customer_name: '', product_name: '', status: 'pending' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="order-form">
      <h3 className="form-title">➕ New Order</h3>

      <div className="form-grid">
        <div className="form-group">
          <label>Customer Name</label>
          <input
            name="customer_name"
            placeholder="e.g. Alice Smith"
            value={form.customer_name}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Product Name</label>
          <input
            name="product_name"
            placeholder="e.g. Wireless Headphones"
            value={form.product_name}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Status</label>
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="pending">⏳ Pending</option>
            <option value="shipped">🚚 Shipped</option>
            <option value="delivered">✅ Delivered</option>
          </select>
        </div>
      </div>

      {error && <p className="form-error">⚠️ {error}</p>}
      {success && <p className="form-success">🎉 {success}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}
