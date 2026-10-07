import React, { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

export function ToastError({ message, onClose, autoDismissMs = 4000 }) {
  useEffect(() => {
    if (!message || !autoDismissMs || !onClose) return;

    const timer = setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [message, autoDismissMs, onClose]);

  if (!message) return null;

  return (
    <div className="toast toast-bottom toast-end z-50">
      <div className="alert alert-error shadow-lg flex items-center gap-3 text-sm py-2.5 px-4 rounded-lg">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="btn btn-ghost btn-xs btn-square ml-2 opacity-70 hover:opacity-100"
          aria-label="Close notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
