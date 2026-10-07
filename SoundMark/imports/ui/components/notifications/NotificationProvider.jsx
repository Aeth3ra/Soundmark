import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { NotificationToast } from "./NotificationToast";

const NotificationContext = createContext(null);

export function NotificationProvider({ children, fileId = null }) {
  const [notifications, setNotifications] = useState([]);
  const nextId = useRef(0);
  const notify = useCallback((input) => {
    const id = input.id || `notification-${++nextId.current}`;
    setNotifications((items) => {
      const previous = items.find((item) => item.id === id);
      const notification = {
        type: "info", fileId: null, ...previous, ...input, id,
        visible: true, read: false, time: Date.now(),
        revision: (previous?.revision || 0) + 1
      };
      return [...items.filter((item) => item.id !== id), notification].slice(-30);
    });
    return id;
  }, []);
  const update = useCallback((id, changes) => {
    setNotifications((items) => items.map((item) => item.id === id
      ? { ...item, ...changes, visible: true, time: Date.now(), read: false, revision: item.revision + 1 }
      : item));
  }, []);
  const dismiss = useCallback((id) => {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, visible: false } : item));
  }, []);
  const markRead = useCallback(() => {
    setNotifications((items) => items.map((item) => !item.fileId || item.fileId === fileId ? { ...item, read: true } : item));
  }, [fileId]);
  const clear = useCallback(() => {
    setNotifications((items) => items.filter((item) => item.type === "pending" || (item.fileId && item.fileId !== fileId)));
  }, [fileId]);

  // A retry/view action belongs to the page that created it, even if the user returns later.
  useEffect(() => {
    // Retire page-owned callbacks on navigation, including when the same page is revisited.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifications((items) => items.map((item) => item.fileId && item.fileId !== fileId
      ? { ...item, action: undefined, visible: false } : item));
  }, [fileId]);

  const scoped = useMemo(() => notifications.filter((item) => !item.fileId || item.fileId === fileId), [notifications, fileId]);
  const value = useMemo(() => ({ notifications: scoped, notify, update, dismiss, markRead, clear }), [scoped, notify, update, dismiss, markRead, clear]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="toast toast-bottom toast-end z-50 max-w-full" role="region" aria-label="Notification messages">
        {scoped.filter((item) => item.visible).slice(-3).map((item) => (
          <NotificationToast key={item.id} notification={item} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("Notifications require NotificationProvider.");
  return context;
}
