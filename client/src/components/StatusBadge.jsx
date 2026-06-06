/**
 * StatusBadge — coloured pill showing an order's status.
 */
export function StatusBadge({ status }) {
  const map = {
    pending: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', label: '⏳ Pending' },
    shipped: { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa', label: '🚚 Shipped' },
    delivered: { bg: 'rgba(52,211,153,0.15)', color: '#34d399', label: '✅ Delivered' },
  };

  const style = map[status] ?? { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', label: status };

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.color}40`,
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
