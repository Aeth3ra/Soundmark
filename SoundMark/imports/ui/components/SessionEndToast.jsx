import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "./NotificationProvider";

export const SessionEndedToast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  useEffect(() => {
    if (!location.state?.sessionEnded) return;
    notify({ id: "session-ended", type: "warning", message: "The host ended the session." });
    const { sessionEnded: _ended, ...state } = location.state;
    navigate(location.pathname, { replace: true, state });
  }, [location.state, location.pathname, navigate, notify]);
  return null;
};
