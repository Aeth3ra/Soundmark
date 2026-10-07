import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const styles = { info: "alert-info", success: "alert-success", warning: "alert-warning", error: "alert-error", pending: "" };

export function NotificationToast({ notification, onDismiss }) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { id, type, message, action, revision } = notification;
  useEffect(() => {
    if (hovered || focused || type === "pending" || type === "error") return;
    const timer = setTimeout(() => onDismiss(id), 5000);
    return () => clearTimeout(timer);
  }, [id, type, revision, hovered, focused, onDismiss]);
  const Icon = type === "success" ? CheckCircle2 : type === "error" || type === "warning" ? AlertCircle : Info;
  return (
    <div role={type === "error" ? "alert" : "status"}
      className={`alert ${styles[type]} shadow-lg flex items-center gap-3 text-sm py-2.5 px-4 rounded-lg w-80 max-w-[calc(100vw-2rem)]`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {type === "pending" ? <span className="loading loading-spinner loading-xs shrink-0" aria-hidden="true" /> : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span className="font-medium flex-1 break-words">{message}</span>
      {action && <button type="button" className="btn btn-ghost btn-xs" onClick={action.onClick}>{action.label}</button>}
      <button type="button" className="btn btn-ghost btn-xs btn-square opacity-70 hover:opacity-100" aria-label="Dismiss notification" onClick={() => onDismiss(id)}>
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
