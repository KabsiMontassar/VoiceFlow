import { useToastStore } from '../../stores/toastStore';
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg shadow-lg border-2
            backdrop-blur-sm animate-in slide-in-from-top-2 fade-in
            font-primary
            ${
              toast.type === 'success'
                ? 'bg-success/10 border-success text-success'
                : toast.type === 'error'
                ? 'bg-error/10 border-error text-error'
                : toast.type === 'warning'
                ? 'bg-warning/10 border-warning text-warning'
                : 'bg-primary/10 border-primary text-primary'
            }
          `}
        >
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
          </div>

          {/* Message */}
          <p className="flex-1 text-sm font-medium text-primary-text">
            {toast.message}
          </p>

          {/* Close Button */}
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-secondary-text hover:text-primary-text transition-colors"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
