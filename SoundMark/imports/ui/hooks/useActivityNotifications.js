import { useEffect, useRef } from "react";
import { useNotifications } from "../components/NotificationProvider";

export function useActivityNotifications({ fileId, userId, annotations, effects, ready, connected, sessionEnded, userNames, onView }) {
  const { notify } = useNotifications();
  const baseline = useRef(null);
  const pending = useRef(new Map());
  const timer = useRef(null);
  const latest = useRef(null);
  useEffect(() => { latest.current = { annotations, effects, userNames, onView }; }, [annotations, effects, userNames, onView]);
  useEffect(() => () => {
    clearTimeout(timer.current);
    timer.current = null;
    pending.current.clear();
    baseline.current = null;
  }, [fileId, userId]);

  useEffect(() => {
    if (!ready || !connected || sessionEnded) {
      baseline.current = null;
      pending.current.clear();
      clearTimeout(timer.current);
      timer.current = null;
      return;
    }
    const records = [...annotations.map((item) => ({ ...item, kind: "annotation" })), ...effects.map((item) => ({ ...item, kind: "effect" }))];
    const current = new Set(records.map((item) => `${item.kind}:${item._id}`));
    if (baseline.current) {
      records.forEach((item) => {
        const key = `${item.kind}:${item._id}`;
        if (!baseline.current.has(key) && item.createdBy && item.createdBy !== userId) pending.current.set(key, item);
      });
    }
    baseline.current = current;
    if (!pending.current.size || timer.current !== null) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      const groups = new Map();
      pending.current.forEach((item) => {
        const collection = item.kind === "annotation" ? latest.current.annotations : latest.current.effects;
        if (!collection.some((record) => record._id === item._id)) return;
        const key = `${item.kind}:${item.createdBy}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
      });
      pending.current.clear();
      groups.forEach((items) => {
        const first = items[0];
        const author = latest.current.userNames[first.createdBy] || "A collaborator";
        notify({ fileId, message: `${author} added ${items.length === 1 ? "an" : items.length} ${first.kind}${items.length === 1 ? "" : "s"}.`,
          action: { label: "View", onClick: () => {
            const collection = first.kind === "annotation" ? latest.current.annotations : latest.current.effects;
            const target = collection.find((item) => item._id === first._id);
            if (target) latest.current.onView(first.kind, target);
            else notify({ fileId, message: "This item is no longer available." });
          } }
        });
      });
    }, 1000);
  }, [fileId, userId, annotations, effects, ready, connected, sessionEnded, notify]);
}
