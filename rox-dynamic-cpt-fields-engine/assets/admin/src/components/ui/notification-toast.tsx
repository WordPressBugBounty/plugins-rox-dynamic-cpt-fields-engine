import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface NotificationToastContextType {
  toasts: ToastData[];
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const NotificationToastContext = createContext<NotificationToastContextType | undefined>(undefined);

export function NotificationToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <NotificationToastContext.Provider value={{ toasts, showToast, hideToast }}>
      {children}
      <NotificationToastContainer />
    </NotificationToastContext.Provider>
  );
}

export function useNotificationToast() {
  const context = useContext(NotificationToastContext);
  if (!context) {
    throw new Error('useNotificationToast must be used within a NotificationToastProvider');
  }
  return context;
}

function NotificationToastContainer() {
  const { toasts, hideToast } = useContext(NotificationToastContext)!;

  if (toasts.length === 0) return null;

  return (
    <div className="rdcfe-fixed rdcfe-top-5 rdcfe-right-5 rdcfe-z-[99999] rdcfe-flex rdcfe-flex-col rdcfe-gap-3" style={{ maxWidth: '380px' }}>
      {toasts.map(toast => (
        <NotificationToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}

function NotificationToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Auto dismiss
    let dismissTimer: ReturnType<typeof setTimeout>;
    if (toast.duration && toast.duration > 0) {
      dismissTimer = setTimeout(() => {
        handleClose();
      }, toast.duration);
    }
    
    return () => {
      clearTimeout(enterTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [toast.duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(onClose, 300);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <Check className="rdcfe-w-5 rdcfe-h-5" strokeWidth={2.5} />;
      case 'error':
        return <X className="rdcfe-w-5 rdcfe-h-5" strokeWidth={2.5} />;
      case 'warning':
        return <AlertCircle className="rdcfe-w-5 rdcfe-h-5" strokeWidth={2} />;
      case 'info':
        return <Info className="rdcfe-w-5 rdcfe-h-5" strokeWidth={2} />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          iconColor: '#10b981',
          iconBg: '#ecfdf5',
          borderColor: '#d1fae5',
          textColor: '#065f46',
        };
      case 'error':
        return {
          iconColor: '#ef4444',
          iconBg: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#991b1b',
        };
      case 'warning':
        return {
          iconColor: '#f59e0b',
          iconBg: '#fffbeb',
          borderColor: '#fde68a',
          textColor: '#92400e',
        };
      case 'info':
        return {
          iconColor: '#3b82f6',
          iconBg: '#eff6ff',
          borderColor: '#bfdbfe',
          textColor: '#1e40af',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className="rdcfe-transition-all rdcfe-duration-300 rdcfe-ease-out"
      style={{
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(120%)',
        opacity: isVisible && !isLeaving ? 1 : 0,
      }}
    >
      <div
        className="rdcfe-flex rdcfe-items-center rdcfe-gap-3 rdcfe-p-4 rdcfe-rounded-xl rdcfe-shadow-lg"
        style={{
          backgroundColor: '#ffffff',
          border: `1px solid ${styles.borderColor}`,
          minWidth: '320px',
        }}
      >
        <div
          className="rdcfe-flex-shrink-0 rdcfe-w-10 rdcfe-h-10 rdcfe-rounded-lg rdcfe-flex rdcfe-items-center rdcfe-justify-center"
          style={{ backgroundColor: styles.iconBg, color: styles.iconColor }}
        >
          {getIcon()}
        </div>
        <p
          className="rdcfe-flex-1 rdcfe-text-[14px] rdcfe-font-medium rdcfe-leading-snug"
          style={{ color: styles.textColor }}
        >
          {toast.message}
        </p>
        <button
          onClick={handleClose}
          className="rdcfe-flex-shrink-0 rdcfe-p-1.5 rdcfe-rounded-lg rdcfe-transition-colors"
          style={{ color: '#9ca3af' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#6b7280';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          <X className="rdcfe-w-4 rdcfe-h-4" />
        </button>
      </div>
    </div>
  );
}

