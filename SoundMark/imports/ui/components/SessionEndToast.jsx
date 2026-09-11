import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X, LogOut } from "lucide-react";

const AUTO_DISMISS_MS = 5000;

export const SessionEndedToast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(Boolean(location.state?.sessionEnded));

  useEffect(() => {
    // Remove sessionEnded from the router state so refreshing the page doesn't show the toast again
    if (location.state?.sessionEnded) {
      navigate(location.pathname, {
        replace: true,
        state: {}
      });
    }
  }, [location.state?.sessionEnded, location.pathname, navigate]);

  useEffect(() => {
    // Automatically hide the toast after 5 seconds
    if (!visible) return;

    const timer = window.setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [visible]);

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
