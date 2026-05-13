import { useEffect } from 'react';

const SEVERITY_COLOR = {
  error: '#ff6b6b',
  success: '#4ade80',
  info: '#6e74ff',
  warning: '#ffb86b',
};

export default function Toast({
  open,
  message,
  severity = 'error',
  duration = 6000,
  onClose,
}) {
  useEffect(() => {
    if (!open || !duration) return;
    const t = setTimeout(() => onClose?.(), duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      className="app-toast"
      role="alert"
      style={{ '--toast-accent': SEVERITY_COLOR[severity] || SEVERITY_COLOR.info }}
    >
      <span className="app-toast-msg">{message}</span>
      <button
        type="button"
        className="app-toast-close"
        aria-label="닫기"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
