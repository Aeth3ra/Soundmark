import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";

const AUTO_DISMISS_MS = 5000;

export const SessionEndedToast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(Boolean(location.state?.sessionEnded));

  useEffect(() => {
    if (!location.state?.sessionEnded) return;

    setVisible(true);

    // Clear the flag from history state immediately so a refresh or
    // back-navigation doesn't show the toast again.
    navigate(location.pathname, { replace: true, state: {} });

    const timer = window.setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
    // Only re-run when the flag itself changes, not on every navigate/location
    // identity change (both change on every render otherwise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.sessionEnded]);

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
