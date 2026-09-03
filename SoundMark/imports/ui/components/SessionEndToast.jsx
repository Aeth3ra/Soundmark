import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";

const AUTO_DISMISS_MS = 5000;

export const SessionEndedToast = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const sessionEnded = Boolean(location.state?.sessionEnded);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!sessionEnded) return;

    setDismissed(false);

    navigate(location.pathname, { replace: true, state: {} });

    const timer = window.setTimeout(() => setDismissed(true), AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [sessionEnded, navigate, location.pathname]);

  const visible = sessionEnded && !dismissed;

  if (!visible) return null;

  return (
    <div className="toast toast-top toast-center z-50">
      <div className="alert alert-warning shadow-lg gap-3">
        <LogOut className="h-4 w-4 shrink-0" />
        <span>The host ended the session.</span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="btn btn-ghost btn-xs btn-circle"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
