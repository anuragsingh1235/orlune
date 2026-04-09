import toast from 'react-hot-toast';

// ── ICON MAP ──────────────────────────────────────────
const icons = {
  success: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#8FBCBB" fillOpacity="0.15"/>
      <path d="M5 9.5l3 3 5-6" stroke="#8FBCBB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  error: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#BF616A" fillOpacity="0.15"/>
      <path d="M6 6l6 6M12 6l-6 6" stroke="#BF616A" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#5E81AC" fillOpacity="0.15"/>
      <path d="M9 8v5M9 6.5V6" stroke="#5E81AC" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
};

// ── BRANDED SHOW FUNCTION ──────────────────────────────────────────
function show(message, type = 'info', opts = {}) {
  return toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(21, 26, 37, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '14px 18px',
          minWidth: '260px',
          maxWidth: '360px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          opacity: t.visible ? 1 : 0,
          transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(-12px) scale(0.96)',
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          cursor: 'pointer',
        }}
        onClick={() => toast.dismiss(t.id)}
      >
        <div style={{ flexShrink: 0 }}>{icons[type]}</div>
        <span style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#E5E9F0',
          lineHeight: 1.4,
          letterSpacing: '0.01em',
          fontFamily: "'Inter', sans-serif",
        }}>
          {message}
        </span>
        <div style={{
          marginLeft: 'auto',
          flexShrink: 0,
          width: '3px',
          height: '32px',
          borderRadius: '99px',
          background: type === 'success' ? '#8FBCBB' : type === 'error' ? '#BF616A' : '#5E81AC',
          opacity: 0.8,
        }} />
      </div>
    ),
    { duration: type === 'error' ? 4000 : 2500, position: 'top-center', ...opts }
  );
}

// ── EXPORTS ──────────────────────────────────────────
const notify = {
  success: (msg, opts) => show(msg, 'success', opts),
  error:   (msg, opts) => show(msg, 'error',   opts),
  info:    (msg, opts) => show(msg, 'info',    opts),
};

export default notify;
