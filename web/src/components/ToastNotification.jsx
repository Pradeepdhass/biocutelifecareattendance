import React, { useEffect } from 'react';

/**
 * Compact auto-dismissing top-right floating toast popup.
 * Automatically disappears after `duration` ms with no manual close required.
 */
export default function ToastNotification({ toast, onDismiss, duration = 3500 }) {
  useEffect(() => {
    if (!toast?.text) return undefined;
    const ms = toast.link ? 7000 : duration;
    const timer = setTimeout(() => {
      onDismiss();
    }, ms);
    return () => clearTimeout(timer);
  }, [toast, duration, onDismiss]);

  if (!toast?.text) return null;

  const isError = toast.type === 'error';
  const durationMs = toast.link ? 7000 : duration;

  return (
    <div
      className={`bclc-toast-popup ${isError ? 'is-error' : 'is-success'}`}
      role="status"
      aria-live="polite"
    >
      <span className="bclc-toast-dot" aria-hidden="true" />
      <div className="bclc-toast-content">
        <span className="bclc-toast-text">{toast.text}</span>
        {toast.link && (
          <a
            href={toast.link}
            target="_blank"
            rel="noreferrer"
            className="bclc-toast-link"
          >
            Open Link &rsaquo;
          </a>
        )}
      </div>
      <span
        className="bclc-toast-progress"
        style={{ animationDuration: `${durationMs}ms` }}
        aria-hidden="true"
      />
    </div>
  );
}
