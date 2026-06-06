import { useState } from 'react';
import { StatusBadge } from './StatusBadge';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const STATUS_OPTIONS = ['pending', 'shipped', 'delivered'];


export function OrderTable({ orders, highlightId, onRefresh }) {
  const [updating, setUpdating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleStatusChange = async (id, status) => {
    setUpdating(id);
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this order?')) return;
    setDeleting(id);
    try {
      await fetch(`${API_BASE}/api/orders/${id}`, { method: 'DELETE' });
      onRefresh();
    } finally {
      setDeleting(null);
    }
  };

  if (!orders.length) {
    return (
      <div className="empty-state">
        <p>📦 No orders yet. Create one above!</p>
      </div>
    );
  }

  return (
    <div className="table-wrapper">
      <table className="orders-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Product</th>
            <th>Status</th>
            <th>Updated At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const id = order.id || order._id;
            const isHighlighted = id === highlightId;
            const isUpdating = updating === id;
            const isDeleting = deleting === id;

            return (
              <tr key={id} className={isHighlighted ? 'row-highlighted' : ''}>
                <td className="id-cell" title={id}>
                  {id.slice(-6)}
                </td>
                <td>{order.customer_name}</td>
                <td>{order.product_name}</td>
                <td>
                  <StatusBadge status={order.status} />
                </td>
                <td className="date-cell">
                  {new Date(order.updated_at).toLocaleString()}
                </td>
                <td className="actions-cell">
                  <select
                    value={order.status}
                    disabled={isUpdating}
                    onChange={(e) => handleStatusChange(id, e.target.value)}
                    className="status-select"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-delete"
                    disabled={isDeleting}
                    onClick={() => handleDelete(id)}
                  >
                    {isDeleting ? '…' : '🗑'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
