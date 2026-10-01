import { Bell } from "lucide-react";
import { useNotifications } from "./NotificationProvider";

export function NotificationHistory() {
  const { notifications, markRead, clear } = useNotifications();
  const unread = notifications.filter((item) => !item.read).length;
  return (
    <details className="dropdown dropdown-end" onToggle={(event) => { if (event.currentTarget.open) markRead(); }}>
      <summary className="btn btn-ghost btn-sm gap-1" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unread > 0 && <span className="badge badge-primary badge-xs">{unread}</span>}
      </summary>
      <div className="dropdown-content z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-box border border-base-300 bg-base-100 shadow-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">Notifications</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={clear}>Clear all</button>
        </div>
        <ul className="max-h-72 overflow-y-auto space-y-2" aria-label="Recent notifications">
          {notifications.length === 0 && <li className="text-sm text-base-content/60 py-3">No notifications yet.</li>}
          {[...notifications].reverse().map((item) => (
            <li key={item.id} className="border-b border-base-300 last:border-0 pb-2 text-sm">
              <p className="break-words">{item.message}</p>
              <div className="flex items-center justify-between gap-2">
                <time className="text-xs text-base-content/50" dateTime={new Date(item.time).toISOString()}>{new Date(item.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                {item.action && <button type="button" className="btn btn-ghost btn-xs" onClick={item.action.onClick}>{item.action.label}</button>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
