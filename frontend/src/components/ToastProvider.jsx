import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let nextToastId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutIds = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));

    const timeoutId = timeoutIds.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutIds.current.delete(id);
    }
  }, []);

  const showToast = useCallback((options) => {
    const toast = typeof options === 'string'
      ? { message: options }
      : options;

    const id = nextToastId++;
    const entry = {
      id,
      type: toast.type || 'info',
      title: toast.title || '',
      message: toast.message || '',
      duration: toast.duration ?? 3600
    };

    setToasts((currentToasts) => [...currentToasts, entry]);

    const timeoutId = window.setTimeout(() => {
      dismissToast(id);
    }, entry.duration);

    timeoutIds.current.set(id, timeoutId);
  }, [dismissToast]);

  useEffect(() => {
    return () => {
      timeoutIds.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIds.current.clear();
    };
  }, []);

  const value = useMemo(() => ({
    showToast,
    dismissToast
  }), [dismissToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role="status"
          >
            <div className="toast-copy">
              {toast.title ? <p className="toast-title">{toast.title}</p> : null}
              <p className="toast-message">{toast.message}</p>
            </div>

            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
