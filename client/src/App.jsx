import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { OrderForm } from './components/OrderForm';
import { OrderTable } from './components/OrderTable';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);

  const { messages, status } = useWebSocket(WS_URL);

  // ── Initial fetch ────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`);
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ── Apply real-time change events from WebSocket ─────────────────────────────
  useEffect(() => {
    if (!messages.length) return;

    const latest = messages[0]; // newest event first

    // Record to live event log
    setLiveEvents((prev) =>
      [{ ...latest, receivedAt: new Date().toISOString() }, ...prev].slice(0, 50)
    );

    if (latest.type === 'INSERT' && latest.order) {
      setOrders((prev) => [latest.order, ...prev]);
      flashHighlight(latest.order.id);
    } else if (latest.type === 'UPDATE' && latest.order) {
      setOrders((prev) =>
        prev.map((o) => (o.id === latest.order.id || o._id === latest.id ? latest.order : o))
      );
      flashHighlight(latest.id || latest.order?.id);
    } else if (latest.type === 'DELETE') {
      setOrders((prev) => prev.filter((o) => o.id !== latest.id && o._id !== latest.id));
    }
  }, [messages]);

  const flashHighlight = (id) => {
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2500);
  };

  const connectionLabel = {
    connecting: { text: 'Connecting…', cls: 'status-connecting' },
    connected: { text: '● Live', cls: 'status-connected' },
    disconnected: { text: '○ Disconnected', cls: 'status-disconnected' },
  }[status];

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-icon">📦</span>
            <div>
              <h1>OrderStream</h1>
              <p>Real-time order tracking via MongoDB Change Streams</p>
            </div>
          </div>
          <div className={`conn-badge ${connectionLabel.cls}`}>{connectionLabel.text}</div>
        </div>
      </header>

      <main className="main">
        {/* ── Stats bar ── */}
        <div className="stats-bar">
          <StatCard label="Total Orders" value={orders.length} icon="📋" />
          <StatCard
            label="Pending"
            value={orders.filter((o) => o.status === 'pending').length}
            icon="⏳"
            color="#fbbf24"
          />
          <StatCard
            label="Shipped"
            value={orders.filter((o) => o.status === 'shipped').length}
            icon="🚚"
            color="#60a5fa"
          />
          <StatCard
            label="Delivered"
            value={orders.filter((o) => o.status === 'delivered').length}
            icon="✅"
            color="#34d399"
          />
          <StatCard
            label="Live Events"
            value={liveEvents.length}
            icon="⚡"
            color="#a78bfa"
          />
        </div>

        {/* ── Two-column layout ── */}
        <div className="content-grid">
          {/* Left: Order management */}
          <div className="left-col">
            <OrderForm />

            <section className="section">
              <div className="section-header">
                <h2>All Orders</h2>
                <button className="btn-secondary" onClick={fetchOrders}>
                  ↺ Refresh
                </button>
              </div>
              {loadingOrders ? (
                <div className="loading">Loading orders…</div>
              ) : (
                <OrderTable orders={orders} highlightId={highlightId} onRefresh={fetchOrders} />
              )}
            </section>
          </div>

          {/* Right: Live event log */}
          <div className="right-col">
            <section className="section event-log-section">
              <div className="section-header">
                <h2>⚡ Live Event Log</h2>
                {liveEvents.length > 0 && (
                  <button className="btn-secondary" onClick={() => setLiveEvents([])}>
                    Clear
                  </button>
                )}
              </div>
              <div className="event-log">
                {liveEvents.length === 0 ? (
                  <p className="event-empty">
                    Waiting for changes… Try creating or updating an order.
                  </p>
                ) : (
                  liveEvents.map((evt, i) => (
                    <EventCard key={i} event={evt} />
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card" style={color ? { '--accent': color } : {}}>
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value" style={color ? { color } : {}}>
          {value}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function EventCard({ event }) {
  const typeColors = {
    INSERT: '#34d399',
    UPDATE: '#60a5fa',
    DELETE: '#f87171',
  };
  const color = typeColors[event.type] ?? '#94a3b8';

  return (
    <div className="event-card" style={{ borderLeftColor: color }}>
      <div className="event-header">
        <span className="event-type" style={{ color }}>
          {event.type}
        </span>
        <span className="event-time">
          {new Date(event.receivedAt).toLocaleTimeString()}
        </span>
      </div>
      {event.order && (
        <div className="event-body">
          <strong>{event.order.customer_name}</strong> — {event.order.product_name}
          <br />
          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
            Status: {event.order.status}
          </span>
        </div>
      )}
      {event.type === 'DELETE' && (
        <div className="event-body">
          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>ID: …{event.id?.slice(-6)}</span>
        </div>
      )}
    </div>
  );
}
